"""Funding Sources API router.

Endpoints:
  GET    /api/v1/funding-sources             — list all funding sources
  GET    /api/v1/funding-sources/{id}        — get source details
  POST   /api/v1/funding-sources/{id}/assign — assign to a project
  DELETE /api/v1/funding-sources/{id}/assign/{project_id} — unassign
"""

import logging
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.funding_sources import FundingSource
from app.services.exchange_rate_service import get_rates_to_eur

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/funding-sources", tags=["funding-sources"])

# ---------------------------------------------------------------------------
# Asset-type currency sets (for ?asset_type= filter)
# ---------------------------------------------------------------------------

FIAT_CURRENCIES = frozenset(
    {
        "EUR",
        "USD",
        "GBP",
        "CHF",
        "SEK",
        "NOK",
        "DKK",
        "PLN",
        "CZK",
        "HUF",
        "RON",
        "BGN",
        "HRK",
    }
)

CRYPTO_CURRENCIES = frozenset(
    {
        "BTC",
        "ETH",
        "USDT",
        "USDC",
        "SOL",
        "ADA",
        "DOT",
        "AVAX",
        "MATIC",
        "LINK",
        "XRP",
        "LTC",
    }
)


class AssetType(str, Enum):
    fiat = "fiat"
    crypto = "crypto"


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class AssignRequest(BaseModel):
    project_id: UUID
    allocated_amount: float | None = None
    """Optional explicit allocation. None = use full balance."""


class AssignResponse(BaseModel):
    funding_source_id: UUID
    project_id: UUID
    allocated_amount: float | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[FundingSource])
def list_funding_sources(
    user: CurrentUser,
    asset_type: AssetType | None = Query(None, description="Filter by asset type: fiat or crypto"),
) -> list[dict[str, Any]]:
    """Return all funding sources for the authenticated user, enriched with provider_name.

    Optionally filter by asset_type (fiat or crypto) based on currency classification.
    Also computes balance_in_base_currency (EUR) using cached exchange rates.
    """
    client = get_supabase()

    query = (
        client.table("funding_sources")
        .select("*,integrations(provider_name)")
        .eq("user_id", user.sub)
    )

    # Apply currency-based filter when asset_type is requested
    if asset_type == AssetType.fiat:
        query = query.in_("currency", list(FIAT_CURRENCIES))
    elif asset_type == AssetType.crypto:
        query = query.in_("currency", list(CRYPTO_CURRENCIES))

    result = query.execute()

    # Flatten: move provider_name from nested integrations object to top level
    sources: list[dict[str, Any]] = []
    for row in result.data or []:
        integration = row.pop("integrations", None) or {}
        row["provider_name"] = integration.get("provider_name")
        sources.append(row)

    # Fetch exchange rates for non-EUR currencies
    currencies = {s.get("currency", "EUR") for s in sources}
    rates = get_rates_to_eur(client, currencies)

    # Compute balance_in_base_currency for each source
    for source in sources:
        currency = source.get("currency", "EUR")
        balance = Decimal(str(source.get("current_balance", 0)))
        if currency == "EUR":
            source["balance_in_base_currency"] = str(balance)
        elif currency in rates:
            source["balance_in_base_currency"] = str(balance * rates[currency])

    return sources


@router.get("/{source_id}", response_model=FundingSource)
def get_funding_source(source_id: UUID, user: CurrentUser) -> dict[str, Any]:
    """Return a single funding source by ID (ownership enforced)."""
    client = get_supabase()
    result = (
        client.table("funding_sources")
        .select("*")
        .eq("id", str(source_id))
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )
    if result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding source not found",
        )
    return result.data


@router.post("/{source_id}/assign", response_model=AssignResponse)
def assign_to_project(
    source_id: UUID,
    payload: AssignRequest,
    user: CurrentUser,
) -> dict[str, Any]:
    """Link a funding source to a project via project_funding_sources pivot."""
    client = get_supabase()

    # Verify funding source ownership
    source = (
        client.table("funding_sources")
        .select("id")
        .eq("id", str(source_id))
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )
    if source.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding source not found",
        )

    # Verify the user is a member of the target project
    membership = (
        client.table("project_members")
        .select("role")
        .eq("project_id", str(payload.project_id))
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )
    if membership.data is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project",
        )

    pivot_data: dict[str, Any] = {
        "project_id": str(payload.project_id),
        "funding_source_id": str(source_id),
    }
    if payload.allocated_amount is not None:
        pivot_data["allocated_amount"] = str(payload.allocated_amount)

    client.table("project_funding_sources").upsert(
        pivot_data,
        on_conflict="project_id,funding_source_id",
    ).execute()

    return {
        "funding_source_id": source_id,
        "project_id": payload.project_id,
        "allocated_amount": payload.allocated_amount,
    }


@router.delete("/{source_id}/assign/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_from_project(
    source_id: UUID,
    project_id: UUID,
    user: CurrentUser,
) -> None:
    """Remove a funding source → project assignment."""
    client = get_supabase()

    # Verify ownership of the funding source
    source = (
        client.table("funding_sources")
        .select("id")
        .eq("id", str(source_id))
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )
    if source.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding source not found",
        )

    client.table("project_funding_sources").delete().eq("funding_source_id", str(source_id)).eq(
        "project_id", str(project_id)
    ).execute()
