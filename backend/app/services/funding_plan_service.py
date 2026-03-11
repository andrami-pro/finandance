"""Funding plan service layer.

Handles CRUD for savings plans (Auto-Save / DCA).
Uses the Supabase service-role client for all DB operations.
"""

import calendar
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client

from app.services.audit_log_service import write_audit_log

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _add_one_month(dt: datetime) -> datetime:
    """Add one calendar month to a datetime, clamping to last day of month."""
    month = dt.month % 12 + 1
    year = dt.year + (1 if dt.month == 12 else 0)
    max_day = calendar.monthrange(year, month)[1]
    day = min(dt.day, max_day)
    return dt.replace(year=year, month=month, day=day)


def compute_next_reminder(frequency: str, from_date: datetime | None = None) -> str:
    """Calculate the next reminder timestamp based on frequency.

    Returns ISO 8601 string for Supabase TIMESTAMPTZ.
    """
    base = from_date or datetime.now(timezone.utc)
    if frequency == "weekly":
        next_dt = base + timedelta(days=7)
    elif frequency == "biweekly":
        next_dt = base + timedelta(days=14)
    elif frequency == "monthly":
        next_dt = _add_one_month(base)
    else:
        return base.isoformat()
    return next_dt.isoformat()


def _verify_project_membership(client: Client, project_id: str, user_id: str) -> bool:
    """Check if a user is a member of a project."""
    result = (
        client.table("project_members")
        .select("user_id")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data is not None


# ---------------------------------------------------------------------------
# Create funding plan
# ---------------------------------------------------------------------------


def create_funding_plan(
    client: Client,
    *,
    user_id: str,
    project_id: str,
    funding_source_id: str | None = None,
    plan_type: str = "dca",
    amount: float,
    currency: str,
    frequency: str | None = None,
) -> dict[str, Any] | None:
    """Create a new funding plan. Returns the created plan or None if forbidden."""

    # Verify caller is project member
    if not _verify_project_membership(client, project_id, user_id):
        return None

    row: dict[str, Any] = {
        "project_id": project_id,
        "user_id": user_id,
        "plan_type": plan_type,
        "amount": amount,
        "currency": currency,
        "is_active": True,
    }

    if funding_source_id:
        row["funding_source_id"] = funding_source_id

    if frequency:
        row["frequency"] = frequency
        row["next_reminder_at"] = compute_next_reminder(frequency)

    result = client.table("funding_plans").insert(row).execute()
    plan = result.data[0] if result.data else None

    if plan:
        write_audit_log(
            client,
            user_id=user_id,
            action="FUNDING_PLAN_CREATED",
            resource_type="funding_plan",
            resource_id=plan["id"],
            metadata={
                "project_id": project_id,
                "plan_type": plan_type,
                "amount": amount,
                "currency": currency,
                "frequency": frequency,
            },
        )

    return plan


# ---------------------------------------------------------------------------
# List funding plans for a project
# ---------------------------------------------------------------------------


def get_funding_plans_for_project(
    client: Client, *, project_id: str, user_id: str
) -> list[dict[str, Any]] | None:
    """List all funding plans for a project. Returns None if not a member."""

    if not _verify_project_membership(client, project_id, user_id):
        return None

    result = (
        client.table("funding_plans")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=False)
        .execute()
    )

    return result.data or []


# ---------------------------------------------------------------------------
# Get single funding plan
# ---------------------------------------------------------------------------


def get_funding_plan(client: Client, *, plan_id: str, user_id: str) -> dict[str, Any] | None:
    """Get a single funding plan by ID. Returns None if not found or no access."""

    result = client.table("funding_plans").select("*").eq("id", plan_id).maybe_single().execute()

    if not result.data:
        return None

    plan = result.data

    # Access check: owner or project member
    if plan["user_id"] != user_id:
        if not _verify_project_membership(client, plan["project_id"], user_id):
            return None

    return plan


# ---------------------------------------------------------------------------
# Update funding plan
# ---------------------------------------------------------------------------


def update_funding_plan(
    client: Client,
    *,
    plan_id: str,
    user_id: str,
    funding_source_id: str | None = None,
    amount: float | None = None,
    frequency: str | None = None,
    is_active: bool | None = None,
) -> dict[str, Any] | None:
    """Update a funding plan. Only the plan owner can update. Returns None if forbidden."""

    # Fetch existing plan
    existing = client.table("funding_plans").select("*").eq("id", plan_id).maybe_single().execute()

    if not existing.data:
        return None

    plan = existing.data
    if plan["user_id"] != user_id:
        return None

    updates: dict[str, Any] = {}

    if funding_source_id is not None:
        updates["funding_source_id"] = funding_source_id

    if amount is not None:
        updates["amount"] = amount

    if frequency is not None:
        updates["frequency"] = frequency

    if is_active is not None:
        updates["is_active"] = is_active

    # Recalculate next_reminder_at when resuming or changing frequency
    should_recalculate = False
    if frequency is not None and frequency != plan.get("frequency"):
        should_recalculate = True
    if is_active is True and not plan.get("is_active"):
        should_recalculate = True

    if should_recalculate:
        effective_frequency = frequency or plan.get("frequency")
        if effective_frequency:
            updates["next_reminder_at"] = compute_next_reminder(effective_frequency)

    if not updates:
        return plan

    result = client.table("funding_plans").update(updates).eq("id", plan_id).execute()

    updated_plan = result.data[0] if result.data else plan

    write_audit_log(
        client,
        user_id=user_id,
        action="FUNDING_PLAN_UPDATED",
        resource_type="funding_plan",
        resource_id=plan_id,
        metadata={"updates": updates},
    )

    return updated_plan


# ---------------------------------------------------------------------------
# Delete funding plan
# ---------------------------------------------------------------------------


def delete_funding_plan(client: Client, *, plan_id: str, user_id: str) -> bool:
    """Delete a funding plan. Only the plan owner can delete. Returns True if deleted."""

    existing = (
        client.table("funding_plans")
        .select("id,user_id,project_id")
        .eq("id", plan_id)
        .maybe_single()
        .execute()
    )

    if not existing.data:
        return False

    if existing.data["user_id"] != user_id:
        return False

    client.table("funding_plans").delete().eq("id", plan_id).execute()

    write_audit_log(
        client,
        user_id=user_id,
        action="FUNDING_PLAN_DELETED",
        resource_type="funding_plan",
        resource_id=plan_id,
        metadata={"project_id": existing.data["project_id"]},
    )

    return True
