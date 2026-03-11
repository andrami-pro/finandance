"""Transactions API router.

Endpoints:
  GET /api/v1/transactions — paginated list with summary aggregates
"""

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.transactions import TransactionItem, TransactionUpdate, TransactionsResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])

_EMPTY_SUMMARY: dict[str, Any] = {
    "total_inflows": Decimal("0"),
    "total_outflows": Decimal("0"),
    "net_cashflow": Decimal("0"),
    "currency": "EUR",
}


def _apply_date_filters(query: Any, since: str | None, until: str | None) -> Any:
    """Apply optional date range filters to a Supabase query."""
    if since:
        query = query.gte("transaction_date", since)
    if until:
        query = query.lte("transaction_date", until)
    return query


@router.get("", response_model=TransactionsResponse)
def list_transactions(
    user: CurrentUser,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    since: str | None = Query(None, description="Start date (ISO 8601, inclusive)"),
    until: str | None = Query(None, description="End date (ISO 8601, inclusive)"),
) -> dict[str, Any]:
    """Return paginated transactions for the authenticated user."""
    client = get_supabase()

    # ── Step 1: user's funding sources (ownership boundary) ───────────
    sources_result = (
        client.table("funding_sources")
        .select("id, name, integration_id")
        .eq("user_id", user.sub)
        .execute()
    )
    sources = sources_result.data or []

    if not sources:
        return {
            "items": [],
            "summary": _EMPTY_SUMMARY,
            "page": page,
            "limit": limit,
            "total": 0,
        }

    source_ids = [s["id"] for s in sources]
    source_meta = {s["id"]: s for s in sources}

    # ── Step 2: provider names for enrichment ─────────────────────────
    integration_ids = list({s["integration_id"] for s in sources})
    integrations_result = (
        client.table("integrations")
        .select("id, provider_name")
        .in_("id", integration_ids)
        .execute()
    )
    provider_map: dict[str, str] = {
        i["id"]: i["provider_name"] for i in (integrations_result.data or [])
    }

    # ── Step 3: paginated transactions (with optional date filter) ────
    offset = (page - 1) * limit
    txn_query = (
        client.table("transactions").select("*", count="exact").in_("funding_source_id", source_ids)
    )
    txn_query = _apply_date_filters(txn_query, since, until)
    txn_result = (
        txn_query.order("transaction_date", desc=True).range(offset, offset + limit - 1).execute()
    )
    total = txn_result.count or 0
    raw_txns = txn_result.data or []

    # ── Step 4: enrich with source name + provider + client name ──────
    # Build client name map for linked transactions
    client_ids = list({txn["client_id"] for txn in raw_txns if txn.get("client_id")})
    client_name_map: dict[str, str] = {}
    if client_ids:
        clients_result = client.table("clients").select("id, name").in_("id", client_ids).execute()
        client_name_map = {c["id"]: c["name"] for c in (clients_result.data or [])}

    items: list[dict[str, Any]] = []
    for txn in raw_txns:
        src = source_meta.get(txn["funding_source_id"], {})
        txn_client_id = txn.get("client_id")
        items.append(
            {
                **txn,
                "source_name": src.get("name", "Unknown"),
                "provider_name": provider_map.get(src.get("integration_id", ""), "UNKNOWN"),
                "client_id": txn_client_id,
                "client_name": client_name_map.get(txn_client_id, None) if txn_client_id else None,
            }
        )

    # ── Step 5: summary for the same date range ──────────────────────
    summary_query = (
        client.table("transactions")
        .select("amount, direction")
        .in_("funding_source_id", source_ids)
    )
    summary_query = _apply_date_filters(summary_query, since, until)
    summary_result = summary_query.execute()

    total_inflows = Decimal("0")
    total_outflows = Decimal("0")
    for t in summary_result.data or []:
        amt = Decimal(str(t["amount"]))
        direction = t.get("direction")
        if direction == "IN":
            total_inflows += abs(amt)
        elif direction == "OUT":
            total_outflows -= abs(amt)
        elif amt > 0:
            total_inflows += amt
        else:
            total_outflows += amt

    return {
        "items": items,
        "summary": {
            "total_inflows": total_inflows,
            "total_outflows": total_outflows,
            "net_cashflow": total_inflows + total_outflows,
            "currency": "EUR",
        },
        "page": page,
        "limit": limit,
        "total": total,
    }


@router.patch("/{transaction_id}", response_model=TransactionItem)
def update_transaction(
    transaction_id: str,
    body: TransactionUpdate,
    user: CurrentUser,
) -> dict[str, Any]:
    """Update category and/or notes on a single transaction."""
    client = get_supabase()

    # Verify ownership: transaction must belong to one of the user's funding sources
    sources_result = (
        client.table("funding_sources")
        .select("id, name, integration_id")
        .eq("user_id", user.sub)
        .execute()
    )
    sources = sources_result.data or []
    source_ids = [s["id"] for s in sources]
    source_meta = {s["id"]: s for s in sources}

    if not source_ids:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Build update payload (only non-None fields)
    updates: dict[str, Any] = {}
    if body.category is not None:
        updates["category"] = body.category
    if body.notes is not None:
        updates["notes"] = body.notes

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        client.table("transactions")
        .update(updates)
        .eq("id", transaction_id)
        .in_("funding_source_id", source_ids)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Transaction not found")

    txn = result.data[0]

    # Enrich with source name + provider
    integration_ids = list({s["integration_id"] for s in sources})
    integrations_result = (
        client.table("integrations")
        .select("id, provider_name")
        .in_("id", integration_ids)
        .execute()
    )
    provider_map = {i["id"]: i["provider_name"] for i in (integrations_result.data or [])}

    src = source_meta.get(txn["funding_source_id"], {})
    return {
        **txn,
        "source_name": src.get("name", "Unknown"),
        "provider_name": provider_map.get(src.get("integration_id", ""), "UNKNOWN"),
    }
