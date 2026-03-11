"""Dashboard service layer.

Aggregates net worth, project progress, and integration health
for the dashboard summary endpoint.
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from supabase import Client

logger = logging.getLogger(__name__)

_RATE_TTL_HOURS = 1


def get_dashboard_summary(client: Client, *, user_id: str) -> dict[str, Any]:
    """Build the full dashboard summary for a user."""

    # 1. Fetch all funding sources with provider info
    sources_result = (
        client.table("funding_sources")
        .select("id,currency,current_balance,integration_id")
        .eq("user_id", user_id)
        .execute()
    )
    sources = sources_result.data or []

    # 2. Compute net worth (all balances converted to EUR)
    net_worth = _compute_net_worth(client, sources)

    # 3. Fetch integrations
    integrations_result = (
        client.table("integrations")
        .select("provider_name,status,last_synced_at")
        .eq("user_id", user_id)
        .execute()
    )
    integrations = [
        {
            "provider_name": row["provider_name"],
            "status": row["status"],
            "last_synced_at": row.get("last_synced_at"),
        }
        for row in (integrations_result.data or [])
    ]

    # 4. Fetch projects where user is a member
    member_result = (
        client.table("project_members").select("project_id").eq("user_id", user_id).execute()
    )
    project_ids = [row["project_id"] for row in (member_result.data or [])]

    active_projects: list[dict[str, Any]] = []
    total_progress = 0.0

    if project_ids:
        projects_result = (
            client.table("projects")
            .select("id,name,target_amount,target_currency")
            .in_("id", project_ids)
            .order("created_at", desc=True)
            .execute()
        )

        for project in projects_result.data or []:
            pid = project["id"]

            # Get linked funding source IDs
            fs_result = (
                client.table("project_funding_sources")
                .select("funding_source_id")
                .eq("project_id", pid)
                .execute()
            )
            fs_ids = [row["funding_source_id"] for row in (fs_result.data or [])]

            current_amount = _compute_balance_for_sources(client, fs_ids)
            target_amount = float(project.get("target_amount", 0))
            progress = (
                round(min((current_amount / target_amount) * 100, 100.0), 1)
                if target_amount > 0
                else 0.0
            )

            active_projects.append(
                {
                    "id": pid,
                    "name": project["name"],
                    "target_amount": target_amount,
                    "current_amount": current_amount,
                    "progress_percent": progress,
                    "target_currency": project.get("target_currency", "EUR"),
                }
            )
            total_progress += progress

    total_projects = len(active_projects)
    average_progress = round(total_progress / total_projects, 1) if total_projects > 0 else 0.0

    return {
        "net_worth": net_worth,
        "net_worth_currency": "EUR",
        "active_projects": active_projects,
        "integrations": integrations,
        "total_projects": total_projects,
        "average_progress": average_progress,
    }


def get_compatible_sources(
    client: Client, *, user_id: str, target_currency: str
) -> list[dict[str, Any]]:
    """Return funding sources that match the project's target currency.

    For crypto targets (BTC, ETH, etc.), matches sources with that currency.
    For fiat targets, matches fiat sources (EUR, USD, GBP, etc.).
    """
    result = (
        client.table("funding_sources")
        .select("id,name,currency,current_balance,asset_type,integration_id")
        .eq("user_id", user_id)
        .execute()
    )
    sources = result.data or []

    # Enrich with provider_name
    integration_ids = list({s["integration_id"] for s in sources})
    provider_map: dict[str, str] = {}
    if integration_ids:
        integrations_result = (
            client.table("integrations")
            .select("id,provider_name")
            .in_("id", integration_ids)
            .execute()
        )
        provider_map = {row["id"]: row["provider_name"] for row in (integrations_result.data or [])}

    crypto_currencies = {"BTC", "ETH", "XRP", "SOL", "DOT", "ADA", "MATIC"}
    target_upper = target_currency.upper()
    is_crypto_target = target_upper in crypto_currencies

    compatible: list[dict[str, Any]] = []
    for source in sources:
        source_currency = source.get("currency", "").upper()

        if is_crypto_target:
            # For crypto target, match exact currency
            if source_currency == target_upper:
                source["provider_name"] = provider_map.get(source["integration_id"])
                compatible.append(source)
        else:
            # For fiat target, match any fiat source
            if source_currency not in crypto_currencies:
                source["provider_name"] = provider_map.get(source["integration_id"])
                compatible.append(source)

    return compatible


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _compute_net_worth(client: Client, sources: list[dict[str, Any]]) -> float:
    """Sum all funding source balances, converting to EUR using cached rates."""
    if not sources:
        return 0.0

    # Get all unique non-EUR currencies
    currencies = {
        s.get("currency", "EUR").upper()
        for s in sources
        if s.get("currency", "EUR").upper() != "EUR"
    }

    # Fetch cached exchange rates for those currencies
    rate_map: dict[str, Decimal] = {}
    if currencies:
        ttl_cutoff = (datetime.now(tz=timezone.utc) - timedelta(hours=_RATE_TTL_HOURS)).isoformat()

        rates_result = (
            client.table("exchange_rates")
            .select("from_currency,rate")
            .eq("to_currency", "EUR")
            .in_("from_currency", list(currencies))
            .gte("fetched_at", ttl_cutoff)
            .execute()
        )
        for row in rates_result.data or []:
            rate_map[row["from_currency"]] = Decimal(str(row["rate"]))

    total = Decimal("0")
    for source in sources:
        balance = Decimal(str(source.get("current_balance", 0)))
        currency = source.get("currency", "EUR").upper()

        if currency == "EUR":
            total += balance
        elif currency in rate_map:
            # ECB stores rates as "1 currency = X EUR" for fiat
            # CoinGecko stores as "1 coin = X EUR" for crypto
            total += balance * rate_map[currency]
        else:
            # No rate available — log and skip (don't crash the dashboard)
            logger.debug(
                "No cached EUR rate for %s, skipping source %s",
                currency,
                source.get("id"),
            )

    return round(float(total), 2)


def _compute_balance_for_sources(client: Client, funding_source_ids: list[str]) -> float:
    """Sum current_balance for specific sources, converting to EUR."""
    if not funding_source_ids:
        return 0.0

    result = (
        client.table("funding_sources")
        .select("current_balance,currency")
        .in_("id", funding_source_ids)
        .execute()
    )

    sources = result.data or []
    return _compute_net_worth(client, sources)
