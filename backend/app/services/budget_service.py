"""Budget service layer.

Computes category-based budget summaries, spending breakdowns, and
manages budget limit CRUD operations.
"""

import logging
from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from supabase import Client

logger = logging.getLogger(__name__)

# Allowed categories (mirrors frontend CATEGORIES list)
ALLOWED_CATEGORIES = [
    "Transfer",
    "Investment",
    "Income",
    "Food & Drink",
    "Groceries",
    "Travel",
    "Housing",
    "Transport",
    "Entertainment",
    "Shopping",
    "Health",
    "Subscriptions",
    "Savings",
    "Family & Gifts",
    "Other",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_month(month: str | None) -> date:
    """Parse a YYYY-MM string into a date for the 1st of that month.

    Defaults to the current month if None or invalid.
    """
    if month:
        try:
            parts = month.split("-")
            return date(int(parts[0]), int(parts[1]), 1)
        except (ValueError, IndexError):
            pass
    today = date.today()
    return date(today.year, today.month, 1)


def _get_period_date_range(period: str, month: str | None) -> tuple[str, str, str]:
    """Return (since, until, period_label) ISO strings for the given period.

    Args:
        period: 'monthly', 'quarterly', or 'yearly'
        month: YYYY-MM string (determines the target month/quarter/year)

    Returns:
        Tuple of (since ISO, until ISO, human label).
    """
    ref = _parse_month(month)
    month_names = [
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

    if period == "yearly":
        since = f"{ref.year}-01-01T00:00:00Z"
        until = f"{ref.year}-12-31T23:59:59Z"
        label = str(ref.year)
    elif period == "quarterly":
        q_start_month = ((ref.month - 1) // 3) * 3 + 1
        q_end_month = q_start_month + 2
        _, last_day = monthrange(ref.year, q_end_month)
        since = f"{ref.year}-{q_start_month:02d}-01T00:00:00Z"
        until = f"{ref.year}-{q_end_month:02d}-{last_day}T23:59:59Z"
        q_num = (q_start_month - 1) // 3 + 1
        label = f"Q{q_num} {ref.year}"
    else:  # monthly
        _, last_day = monthrange(ref.year, ref.month)
        since = f"{ref.year}-{ref.month:02d}-01T00:00:00Z"
        until = f"{ref.year}-{ref.month:02d}-{last_day}T23:59:59Z"
        label = f"{month_names[ref.month - 1]} {ref.year}"

    return since, until, label


def _prev_period_month(period: str, month: str | None) -> str:
    """Return the YYYY-MM string for the previous period."""
    ref = _parse_month(month)

    if period == "yearly":
        return f"{ref.year - 1}-{ref.month:02d}"
    elif period == "quarterly":
        # Go back 3 months
        m = ref.month - 3
        y = ref.year
        if m < 1:
            m += 12
            y -= 1
        return f"{y}-{m:02d}"
    else:  # monthly
        m = ref.month - 1
        y = ref.year
        if m < 1:
            m = 12
            y -= 1
        return f"{y}-{m:02d}"


def _amount_to_cents(amount: Any) -> int:
    """Convert a transaction amount (NUMERIC EUR) to integer cents."""
    d = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(d * 100)


def _compute_status(percent_used: float) -> str:
    """Return budget status based on percent used."""
    if percent_used > 100:
        return "over_budget"
    if percent_used >= 90:
        return "warning"
    if percent_used >= 70:
        return "caution"
    return "on_track"


def _get_user_source_ids(client: Client, user_id: str) -> list[str]:
    """Fetch the user's funding source IDs (ownership boundary)."""
    result = client.table("funding_sources").select("id").eq("user_id", user_id).execute()
    return [s["id"] for s in (result.data or [])]


def _query_spending_by_category(
    client: Client,
    source_ids: list[str],
    since: str,
    until: str,
) -> dict[str, dict[str, Any]]:
    """Query outflow transactions and group by category.

    Returns dict of category -> {spent_cents, count}.
    """
    if not source_ids:
        return {}

    result = (
        client.table("transactions")
        .select("amount,category,direction")
        .in_("funding_source_id", source_ids)
        .eq("direction", "OUT")
        .gte("transaction_date", since)
        .lte("transaction_date", until)
        .execute()
    )

    spending: dict[str, dict[str, Any]] = {}
    for txn in result.data or []:
        cat = txn.get("category") or "Uncategorized"
        cents = abs(_amount_to_cents(txn["amount"]))
        if cat not in spending:
            spending[cat] = {"spent_cents": 0, "count": 0}
        spending[cat]["spent_cents"] += cents
        spending[cat]["count"] += 1

    return spending


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_budget_summary(
    client: Client,
    *,
    user_id: str,
    period: str = "monthly",
    month: str | None = None,
) -> dict[str, Any]:
    """Build the full budget summary for a user and period."""

    since, until, period_label = _get_period_date_range(period, month)
    source_ids = _get_user_source_ids(client, user_id)

    # Fetch active budget limits
    limits_result = (
        client.table("budget_limits")
        .select("*")
        .eq("user_id", user_id)
        .eq("period", period)
        .eq("is_active", True)
        .execute()
    )
    limits_map: dict[str, int] = {
        row["category"]: row["amount_cents"] for row in (limits_result.data or [])
    }

    # Get spending by category
    spending = _query_spending_by_category(client, source_ids, since, until)

    # Build per-category statuses
    categories: list[dict[str, Any]] = []
    total_budgeted = 0
    total_spent = 0
    unbudgeted_spent = 0
    uncategorized_spent = 0

    # Process budgeted categories
    all_cats = set(limits_map.keys()) | set(spending.keys())

    for cat in sorted(all_cats):
        budgeted = limits_map.get(cat, 0)
        cat_spending = spending.get(cat, {"spent_cents": 0, "count": 0})
        spent = cat_spending["spent_cents"]
        count = cat_spending["count"]

        if cat == "Uncategorized":
            uncategorized_spent += spent
            continue

        if budgeted > 0:
            total_budgeted += budgeted
            total_spent += spent
            remaining = budgeted - spent
            pct = round((spent / budgeted) * 100, 1) if budgeted > 0 else 0.0
            categories.append(
                {
                    "category": cat,
                    "budgeted_cents": budgeted,
                    "spent_cents": spent,
                    "remaining_cents": remaining,
                    "percent_used": pct,
                    "transaction_count": count,
                    "status": _compute_status(pct),
                }
            )
        else:
            # Spending in a category without a budget
            unbudgeted_spent += spent

    # Sort by percent_used descending (most critical first)
    categories.sort(key=lambda c: c["percent_used"], reverse=True)

    remaining_total = total_budgeted - total_spent
    savings_rate = round((remaining_total / total_budgeted) * 100, 1) if total_budgeted > 0 else 0.0

    return {
        "period": period,
        "period_label": period_label,
        "since": since,
        "until": until,
        "total_budgeted_cents": total_budgeted,
        "total_spent_cents": total_spent,
        "remaining_cents": remaining_total,
        "savings_rate": savings_rate,
        "currency": "EUR",
        "categories": categories,
        "unbudgeted_spent_cents": unbudgeted_spent,
        "uncategorized_spent_cents": uncategorized_spent,
    }


def get_category_breakdown(
    client: Client,
    *,
    user_id: str,
    period: str = "monthly",
    month: str | None = None,
    compare: bool = False,
) -> dict[str, Any]:
    """Build category spending breakdown for charts."""

    since, until, period_label = _get_period_date_range(period, month)
    source_ids = _get_user_source_ids(client, user_id)
    spending = _query_spending_by_category(client, source_ids, since, until)

    def _build_breakdown(data: dict[str, dict[str, Any]], label: str) -> dict[str, Any]:
        total = sum(v["spent_cents"] for v in data.values())
        cats = []
        for cat in sorted(data.keys()):
            info = data[cat]
            pct = round((info["spent_cents"] / total) * 100, 1) if total > 0 else 0.0
            cats.append(
                {
                    "category": cat,
                    "spent_cents": info["spent_cents"],
                    "percent_of_total": pct,
                    "transaction_count": info["count"],
                }
            )
        # Sort by spent descending
        cats.sort(key=lambda c: c["spent_cents"], reverse=True)
        return {
            "period_label": label,
            "categories": cats,
            "total_spent_cents": total,
        }

    result: dict[str, Any] = {
        "current": _build_breakdown(spending, period_label),
        "previous": None,
    }

    if compare:
        prev_month = _prev_period_month(period, month)
        prev_since, prev_until, prev_label = _get_period_date_range(period, prev_month)
        prev_spending = _query_spending_by_category(client, source_ids, prev_since, prev_until)
        result["previous"] = _build_breakdown(prev_spending, prev_label)

    return result


def upsert_budget_limits(
    client: Client,
    *,
    user_id: str,
    limits: list[dict[str, Any]],
    period: str = "monthly",
) -> list[dict[str, Any]]:
    """Bulk upsert budget limits. Returns the full updated limits list."""

    rows = [
        {
            "user_id": user_id,
            "category": limit["category"],
            "amount_cents": limit["amount_cents"],
            "currency": "EUR",
            "period": period,
            "is_active": True,
        }
        for limit in limits
        if limit["amount_cents"] > 0
    ]

    if rows:
        client.table("budget_limits").upsert(
            rows,
            on_conflict="user_id,category,period",
        ).execute()

    # Return all active limits for this user+period
    result = (
        client.table("budget_limits")
        .select("id,category,amount_cents,currency,period,is_active")
        .eq("user_id", user_id)
        .eq("period", period)
        .eq("is_active", True)
        .order("category")
        .execute()
    )
    return result.data or []


def delete_budget_limit(
    client: Client,
    *,
    user_id: str,
    category: str,
    period: str = "monthly",
) -> bool:
    """Delete a single budget limit. Returns True if a row was deleted."""
    result = (
        client.table("budget_limits")
        .delete()
        .eq("user_id", user_id)
        .eq("category", category)
        .eq("period", period)
        .execute()
    )
    return bool(result.data)
