"""Income service layer.

Handles income summary computation, expected income generation,
transaction linking/unlinking, and unmatched transaction queries.
"""

import logging
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from supabase import Client

logger = logging.getLogger(__name__)

MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_month(month: str | None) -> date:
    """Parse a YYYY-MM string into a date for the 1st of that month."""
    if month:
        try:
            parts = month.split("-")
            return date(int(parts[0]), int(parts[1]), 1)
        except (ValueError, IndexError):
            pass
    today = date.today()
    return date(today.year, today.month, 1)


def _get_monthly_range(month: str | None) -> tuple[str, str, str]:
    """Return (since, until, period_label) ISO strings for a month."""
    ref = _parse_month(month)
    _, last_day = monthrange(ref.year, ref.month)
    since = f"{ref.year}-{ref.month:02d}-01"
    until = f"{ref.year}-{ref.month:02d}-{last_day}"
    label = f"{MONTH_NAMES[ref.month - 1]} {ref.year}"
    return since, until, label


def _amount_to_cents(amount: Any) -> int:
    """Convert a NUMERIC amount to integer cents."""
    d = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(d * 100)


def _compute_income_status(
    received_cents: int,
    expected_cents: int,
    expected_day: int,
    period_start: str,
) -> str:
    """Compute income status based on amounts and date."""
    if expected_cents > 0 and received_cents >= int(expected_cents * 0.95):
        return "received"
    if received_cents > 0:
        return "partial"

    # Check if overdue
    try:
        ps = date.fromisoformat(str(period_start))
        _, last_day = monthrange(ps.year, ps.month)
        due_day = min(expected_day, last_day)
        due_date = date(ps.year, ps.month, due_day)
        if date.today() > due_date:
            return "overdue"
    except (ValueError, TypeError):
        pass

    return "pending"


def _get_user_source_ids(client: Client, user_id: str) -> list[str]:
    """Fetch the user's funding source IDs."""
    result = client.table("funding_sources").select("id").eq("user_id", user_id).execute()
    return [s["id"] for s in (result.data or [])]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_income_summary(
    client: Client,
    *,
    user_id: str,
    month: str | None = None,
) -> dict[str, Any]:
    """Build the full income summary for a user and month."""
    since, until, period_label = _get_monthly_range(month)

    # 1. Fetch expected incomes for the period
    ei_result = (
        client.table("expected_incomes")
        .select("*, clients(name, expected_day)")
        .eq("user_id", user_id)
        .gte("period_start", since)
        .lte("period_start", until)
        .execute()
    )
    expected_incomes = ei_result.data or []

    # 2. For each expected income, get linked transactions
    clients_summary: list[dict[str, Any]] = []
    total_expected = 0
    total_received = 0
    total_pending = 0
    total_overdue = 0

    for ei in expected_incomes:
        ei_id = ei["id"]
        client_data = ei.get("clients") or {}
        client_name = client_data.get("name", "Unknown")
        expected_day = client_data.get("expected_day", ei.get("expected_day", 1))
        expected_cents = ei["expected_amount_cents"]

        # Get linked transactions
        links_result = (
            client.table("income_transaction_links")
            .select("id, transaction_id, amount_cents, transactions(description, transaction_date)")
            .eq("expected_income_id", ei_id)
            .execute()
        )
        links = links_result.data or []

        received_cents = sum(lnk["amount_cents"] for lnk in links)

        # Recompute status
        status = _compute_income_status(
            received_cents, expected_cents, expected_day, ei["period_start"]
        )

        # Update status in DB if changed
        if status != ei["status"]:
            update_data: dict[str, Any] = {
                "status": status,
                "received_amount_cents": received_cents,
            }
            if status == "received" and not ei.get("confirmed_at"):
                update_data["confirmed_at"] = date.today().isoformat()
            client.table("expected_incomes").update(update_data).eq("id", ei_id).execute()

        # Build linked transactions list
        linked_txns = []
        for lnk in links:
            txn_data = lnk.get("transactions") or {}
            linked_txns.append(
                {
                    "link_id": lnk["id"],
                    "transaction_id": lnk["transaction_id"],
                    "amount_cents": lnk["amount_cents"],
                    "description": txn_data.get("description"),
                    "transaction_date": txn_data.get("transaction_date"),
                }
            )

        # Accumulate totals
        total_expected += expected_cents
        if status == "received" or status == "partial":
            total_received += received_cents
        if status == "pending":
            total_pending += expected_cents
        if status == "overdue":
            total_overdue += expected_cents - received_cents

        clients_summary.append(
            {
                "expected_income_id": ei["id"],
                "client_id": ei["client_id"],
                "client_name": client_name,
                "expected_amount_cents": expected_cents,
                "received_amount_cents": received_cents,
                "status": status,
                "expected_day": expected_day,
                "confirmed_at": ei.get("confirmed_at"),
                "linked_transactions": linked_txns,
            }
        )

    # 3. Compute income vs budget
    income_vs_budget = _compute_income_vs_budget(
        client, user_id=user_id, month=month, total_expected=total_expected
    )

    # 4. Count unlinked income transactions
    unlinked_count, unlinked_cents = _count_unlinked_income(
        client, user_id=user_id, since=since, until=until
    )

    return {
        "period_label": period_label,
        "since": since,
        "until": until,
        "total_expected_cents": total_expected,
        "total_received_cents": total_received,
        "total_pending_cents": total_pending,
        "total_overdue_cents": total_overdue,
        "currency": "EUR",
        "income_vs_budget": income_vs_budget,
        "clients": clients_summary,
        "unlinked_income_count": unlinked_count,
        "unlinked_income_cents": unlinked_cents,
    }


def _compute_income_vs_budget(
    client: Client,
    *,
    user_id: str,
    month: str | None,
    total_expected: int,
) -> dict[str, Any] | None:
    """Cross-reference expected income with budget limits."""
    # Get total budgeted for the monthly period
    limits_result = (
        client.table("budget_limits")
        .select("amount_cents")
        .eq("user_id", user_id)
        .eq("period", "monthly")
        .eq("is_active", True)
        .execute()
    )
    limits = limits_result.data or []
    if not limits:
        return None

    total_budgeted = sum(row["amount_cents"] for row in limits)
    if total_budgeted == 0:
        return None

    coverage = round((total_expected / total_budgeted) * 100, 1)
    surplus = total_expected - total_budgeted

    if coverage > 100:
        status = "healthy"
    elif coverage >= 80:
        status = "tight"
    else:
        status = "deficit"

    return {
        "total_budgeted_cents": total_budgeted,
        "coverage_percent": coverage,
        "surplus_cents": surplus,
        "status": status,
    }


def _count_unlinked_income(
    client: Client,
    *,
    user_id: str,
    since: str,
    until: str,
) -> tuple[int, int]:
    """Count income transactions not linked to any expected income."""
    source_ids = _get_user_source_ids(client, user_id)
    if not source_ids:
        return 0, 0

    # Get all IN transactions for the period
    txn_result = (
        client.table("transactions")
        .select("id, amount")
        .in_("funding_source_id", source_ids)
        .eq("direction", "IN")
        .gte("transaction_date", f"{since}T00:00:00Z")
        .lte("transaction_date", f"{until}T23:59:59Z")
        .execute()
    )
    all_in_txns = txn_result.data or []
    if not all_in_txns:
        return 0, 0

    # Get all linked transaction IDs
    all_txn_ids = [t["id"] for t in all_in_txns]
    links_result = (
        client.table("income_transaction_links")
        .select("transaction_id")
        .in_("transaction_id", all_txn_ids)
        .execute()
    )
    linked_ids = {lnk["transaction_id"] for lnk in (links_result.data or [])}

    # Count unlinked
    unlinked = [t for t in all_in_txns if t["id"] not in linked_ids]
    unlinked_cents = sum(abs(_amount_to_cents(t["amount"])) for t in unlinked)
    return len(unlinked), unlinked_cents


def link_transaction(
    client: Client,
    *,
    user_id: str,
    expected_income_id: str,
    transaction_id: str,
    amount_cents: int,
) -> dict[str, Any]:
    """Link a transaction to an expected income entry.

    Returns the updated expected income entry.
    """
    # Verify expected income belongs to user
    ei_result = (
        client.table("expected_incomes")
        .select("*, clients(name, expected_day)")
        .eq("id", expected_income_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not ei_result.data:
        raise ValueError("Expected income entry not found")
    ei = ei_result.data[0]

    # Create the link
    link_row = {
        "expected_income_id": expected_income_id,
        "transaction_id": transaction_id,
        "amount_cents": amount_cents,
    }
    client.table("income_transaction_links").insert(link_row).execute()

    # Recalculate received amount
    links_result = (
        client.table("income_transaction_links")
        .select("amount_cents")
        .eq("expected_income_id", expected_income_id)
        .execute()
    )
    new_received = sum(lnk["amount_cents"] for lnk in (links_result.data or []))

    # Recompute status
    client_data = ei.get("clients") or {}
    expected_day = client_data.get("expected_day", 1)
    new_status = _compute_income_status(
        new_received, ei["expected_amount_cents"], expected_day, ei["period_start"]
    )

    update_data: dict[str, Any] = {
        "received_amount_cents": new_received,
        "status": new_status,
    }
    if new_status == "received":
        update_data["confirmed_at"] = date.today().isoformat()

    client.table("expected_incomes").update(update_data).eq("id", expected_income_id).execute()

    # Set client_id on the transaction
    client.table("transactions").update({"client_id": ei["client_id"]}).eq(
        "id", transaction_id
    ).execute()

    # Return updated expected income
    updated = client.table("expected_incomes").select("*").eq("id", expected_income_id).execute()
    return updated.data[0] if updated.data else ei


def unlink_transaction(
    client: Client,
    *,
    user_id: str,
    link_id: str,
) -> bool:
    """Unlink a transaction from an expected income. Returns True if found."""
    # Get the link first to find related IDs
    link_result = (
        client.table("income_transaction_links")
        .select(
            "*, expected_incomes(id, user_id, client_id, expected_amount_cents, period_start, clients(expected_day))"
        )
        .eq("id", link_id)
        .execute()
    )
    if not link_result.data:
        return False

    link = link_result.data[0]
    ei = link.get("expected_incomes") or {}
    if ei.get("user_id") != user_id:
        return False

    expected_income_id = link["expected_income_id"]
    transaction_id = link["transaction_id"]

    # Delete the link
    client.table("income_transaction_links").delete().eq("id", link_id).execute()

    # Recalculate received amount
    remaining_links = (
        client.table("income_transaction_links")
        .select("amount_cents")
        .eq("expected_income_id", expected_income_id)
        .execute()
    )
    new_received = sum(lnk["amount_cents"] for lnk in (remaining_links.data or []))

    # Recompute status
    client_data = ei.get("clients") or {}
    expected_day = client_data.get("expected_day", 1)
    new_status = _compute_income_status(
        new_received,
        ei.get("expected_amount_cents", 0),
        expected_day,
        ei.get("period_start", ""),
    )

    update_data: dict[str, Any] = {
        "received_amount_cents": new_received,
        "status": new_status,
    }
    if new_status != "received":
        update_data["confirmed_at"] = None

    client.table("expected_incomes").update(update_data).eq("id", expected_income_id).execute()

    # Check if transaction has other links; if not, clear client_id
    other_links = (
        client.table("income_transaction_links")
        .select("id")
        .eq("transaction_id", transaction_id)
        .execute()
    )
    if not other_links.data:
        client.table("transactions").update({"client_id": None}).eq("id", transaction_id).execute()

    return True


def get_unmatched_transactions(
    client: Client,
    *,
    user_id: str,
    month: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    """List recent income transactions not linked to any expected income."""
    since, until, _ = _get_monthly_range(month)
    source_ids = _get_user_source_ids(client, user_id)
    if not source_ids:
        return {"transactions": [], "total": 0}

    # Get all IN transactions for the period
    txn_result = (
        client.table("transactions")
        .select("id, amount, currency, description, transaction_date, category, funding_source_id")
        .in_("funding_source_id", source_ids)
        .eq("direction", "IN")
        .gte("transaction_date", f"{since}T00:00:00Z")
        .lte("transaction_date", f"{until}T23:59:59Z")
        .order("transaction_date", desc=True)
        .execute()
    )
    all_in_txns = txn_result.data or []
    if not all_in_txns:
        return {"transactions": [], "total": 0}

    # Get all linked transaction IDs
    all_txn_ids = [t["id"] for t in all_in_txns]
    links_result = (
        client.table("income_transaction_links")
        .select("transaction_id")
        .in_("transaction_id", all_txn_ids)
        .execute()
    )
    linked_ids = {lnk["transaction_id"] for lnk in (links_result.data or [])}

    # Filter unlinked
    unlinked = [t for t in all_in_txns if t["id"] not in linked_ids]

    # Enrich with source/provider names
    source_map: dict[str, dict[str, str]] = {}
    if unlinked:
        fs_ids = list({t["funding_source_id"] for t in unlinked if t.get("funding_source_id")})
        if fs_ids:
            fs_result = (
                client.table("funding_sources")
                .select("id, name, integrations(provider_name)")
                .in_("id", fs_ids)
                .execute()
            )
            for fs in fs_result.data or []:
                integration = fs.get("integrations") or {}
                source_map[fs["id"]] = {
                    "source_name": fs.get("name", ""),
                    "provider_name": integration.get("provider_name", ""),
                }

    total = len(unlinked)
    transactions = []
    for t in unlinked[:limit]:
        source_info = source_map.get(t.get("funding_source_id", ""), {})
        transactions.append(
            {
                "id": t["id"],
                "amount_cents": abs(_amount_to_cents(t["amount"])),
                "currency": t.get("currency", "EUR"),
                "description": t.get("description"),
                "transaction_date": t.get("transaction_date"),
                "source_name": source_info.get("source_name"),
                "provider_name": source_info.get("provider_name"),
                "category": t.get("category"),
            }
        )

    return {"transactions": transactions, "total": total}


def generate_expected_incomes(
    client: Client,
    *,
    user_id: str,
    month: str | None = None,
) -> list[dict[str, Any]]:
    """Auto-generate expected income entries for active clients.

    Idempotent: skips if entry already exists (UNIQUE constraint).
    """
    ref = _parse_month(month)

    # Get active clients
    clients_result = (
        client.table("clients").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    )
    active_clients = clients_result.data or []
    if not active_clients:
        return []

    rows_to_insert: list[dict[str, Any]] = []

    for cl in active_clients:
        freq = cl["payment_frequency"]

        if freq == "monthly":
            rows_to_insert.append(
                {
                    "user_id": user_id,
                    "client_id": cl["id"],
                    "period_start": f"{ref.year}-{ref.month:02d}-01",
                    "expected_amount_cents": cl["expected_amount_cents"],
                    "currency": cl.get("currency", "EUR"),
                    "status": "pending",
                }
            )

        elif freq == "weekly":
            # Generate 4-5 entries (each Monday of the month)
            _, last_day = monthrange(ref.year, ref.month)
            d = date(ref.year, ref.month, 1)
            while d.month == ref.month:
                if d.weekday() == 0:  # Monday
                    rows_to_insert.append(
                        {
                            "user_id": user_id,
                            "client_id": cl["id"],
                            "period_start": d.isoformat(),
                            "expected_amount_cents": cl["expected_amount_cents"],
                            "currency": cl.get("currency", "EUR"),
                            "status": "pending",
                        }
                    )
                d += timedelta(days=1)

        elif freq == "biweekly":
            # 1st and 15th of the month
            for day in [1, 15]:
                rows_to_insert.append(
                    {
                        "user_id": user_id,
                        "client_id": cl["id"],
                        "period_start": f"{ref.year}-{ref.month:02d}-{day:02d}",
                        "expected_amount_cents": cl["expected_amount_cents"],
                        "currency": cl.get("currency", "EUR"),
                        "status": "pending",
                    }
                )

        elif freq == "one_time":
            # Only create if no existing entry for this client in any period
            existing = (
                client.table("expected_incomes")
                .select("id")
                .eq("client_id", cl["id"])
                .limit(1)
                .execute()
            )
            if not existing.data:
                rows_to_insert.append(
                    {
                        "user_id": user_id,
                        "client_id": cl["id"],
                        "period_start": f"{ref.year}-{ref.month:02d}-01",
                        "expected_amount_cents": cl["expected_amount_cents"],
                        "currency": cl.get("currency", "EUR"),
                        "status": "pending",
                    }
                )

    if not rows_to_insert:
        return []

    # Upsert with ON CONFLICT DO NOTHING (idempotent)
    (
        client.table("expected_incomes")
        .upsert(rows_to_insert, on_conflict="client_id,period_start", ignore_duplicates=True)
        .execute()
    )

    # Return all expected incomes for the month
    since, until, _ = _get_monthly_range(month)
    all_result = (
        client.table("expected_incomes")
        .select("*")
        .eq("user_id", user_id)
        .gte("period_start", since)
        .lte("period_start", until)
        .order("period_start")
        .execute()
    )
    return all_result.data or []
