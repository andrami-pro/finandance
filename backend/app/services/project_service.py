"""Project service layer.

Handles project CRUD, member invitations, and funding source assignments.
Uses the Supabase service-role client for all DB operations.

NOTE: The public.users table has columns: id, full_name, avatar_url, created_at.
      Email lives in auth.users — use client.auth.admin to look up by email.
"""

import logging
from decimal import Decimal
from typing import Any

from supabase import Client

from app.services.audit_log_service import write_audit_log
from app.services.exchange_rate_service import get_rates_to_eur

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _lookup_user_by_email(client: Client, email: str) -> dict[str, Any] | None:
    """Find a user by email using the Supabase Auth Admin API.

    Returns {"id": ..., "email": ...} or None if not found.
    """
    try:
        # auth.admin.list_users doesn't support email filtering in all versions,
        # so we list and filter. For MVP scale this is fine.
        response = client.auth.admin.list_users()
        for user in response:
            if getattr(user, "email", None) == email:
                return {"id": user.id, "email": user.email}
    except Exception:
        logger.warning("Failed to look up user by email via auth admin", exc_info=True)
    return None


def _get_user_profile(client: Client, user_id: str) -> dict[str, Any]:
    """Get public profile (full_name, avatar_url) from public.users."""
    result = (
        client.table("users")
        .select("id,full_name,avatar_url")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data or {}


def _get_user_email(client: Client, user_id: str) -> str | None:
    """Get email from auth.users via Admin API."""
    try:
        user = client.auth.admin.get_user_by_id(user_id)
        return getattr(user.user, "email", None)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Create project
# ---------------------------------------------------------------------------


def create_project(
    client: Client,
    *,
    user_id: str,
    name: str,
    target_amount: float,
    target_currency: str = "EUR",
    target_date: str | None = None,
    category: str | None = None,
    invited_emails: list[str] | None = None,
    funding_source_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Create a shared project, add the creator as OWNER, link funding sources,
    and record pending invites."""

    # 1. Insert project row
    project_data: dict[str, Any] = {
        "name": name,
        "target_amount": target_amount,
        "target_currency": target_currency,
        "created_by": user_id,
        "category": category,
    }
    if target_date:
        project_data["target_date"] = target_date

    result = client.table("projects").insert(project_data).execute()
    project = result.data[0]
    project_id = project["id"]

    # 2. Add creator as OWNER
    client.table("project_members").insert(
        {
            "project_id": project_id,
            "user_id": user_id,
            "role": "OWNER",
            "invited_by": None,
        }
    ).execute()

    # 3. Link funding sources
    if funding_source_ids:
        rows = [
            {"project_id": project_id, "funding_source_id": fs_id} for fs_id in funding_source_ids
        ]
        client.table("project_funding_sources").insert(rows).execute()

    # 4. Record pending invites (by email via auth admin)
    if invited_emails:
        for email in invited_emails:
            auth_user = _lookup_user_by_email(client, email)
            if auth_user:
                invited_user_id = auth_user["id"]
                client.table("project_members").insert(
                    {
                        "project_id": project_id,
                        "user_id": invited_user_id,
                        "role": "PENDING_INVITE",
                        "invited_by": user_id,
                    }
                ).execute()

    # Audit log
    write_audit_log(
        client,
        user_id=user_id,
        action="PROJECT_CREATED",
        resource_type="project",
        resource_id=project_id,
        metadata={
            "name": name,
            "target_amount": target_amount,
            "target_currency": target_currency,
            "category": category,
            "funding_sources": funding_source_ids or [],
            "invited_emails": invited_emails or [],
        },
    )

    # Return the full project with members and funding sources
    return get_project(client, project_id=project_id, user_id=user_id)


# ---------------------------------------------------------------------------
# List projects
# ---------------------------------------------------------------------------


def list_projects(client: Client, *, user_id: str) -> list[dict[str, Any]]:
    """List all projects where the user is a member (any role)."""

    # Get project IDs where user is a member
    member_result = (
        client.table("project_members").select("project_id").eq("user_id", user_id).execute()
    )
    if not member_result.data:
        return []

    project_ids = [row["project_id"] for row in member_result.data]

    # Fetch projects
    projects_result = (
        client.table("projects")
        .select("*")
        .in_("id", project_ids)
        .order("created_at", desc=True)
        .execute()
    )

    items: list[dict[str, Any]] = []
    for project in projects_result.data or []:
        pid = project["id"]

        # Count members
        members_result = (
            client.table("project_members")
            .select("user_id", count="exact")
            .eq("project_id", pid)
            .neq("role", "PENDING_INVITE")
            .execute()
        )
        member_count = members_result.count or 0

        # Count funding sources and compute balance
        fs_result = (
            client.table("project_funding_sources")
            .select("funding_source_id")
            .eq("project_id", pid)
            .execute()
        )
        fs_count = len(fs_result.data or [])
        current_amount = _compute_project_balance(
            client, [row["funding_source_id"] for row in (fs_result.data or [])]
        )

        target_amount = float(project.get("target_amount", 0))
        progress = round((current_amount / target_amount) * 100, 1) if target_amount > 0 else 0.0

        items.append(
            {
                "id": pid,
                "name": project["name"],
                "target_amount": target_amount,
                "target_currency": project.get("target_currency", "EUR"),
                "target_date": project.get("target_date"),
                "category": project.get("category"),
                "current_amount": current_amount,
                "progress_percent": min(progress, 100.0),
                "member_count": member_count,
                "funding_sources_count": fs_count,
            }
        )

    return items


# ---------------------------------------------------------------------------
# Get project detail
# ---------------------------------------------------------------------------


def get_project(client: Client, *, project_id: str, user_id: str) -> dict[str, Any]:
    """Get full project detail including members and funding sources."""

    # Fetch project
    result = client.table("projects").select("*").eq("id", project_id).maybe_single().execute()
    if not result.data:
        return {}

    project = result.data

    # Verify user is a member
    member_check = (
        client.table("project_members")
        .select("role")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not member_check.data:
        return {}

    # Fetch members
    members_result = (
        client.table("project_members")
        .select("user_id,role,invited_by")
        .eq("project_id", project_id)
        .execute()
    )
    members: list[dict[str, Any]] = []
    for m in members_result.data or []:
        profile = _get_user_profile(client, m["user_id"])
        email = _get_user_email(client, m["user_id"])
        members.append(
            {
                "user_id": m["user_id"],
                "role": m["role"],
                "full_name": profile.get("full_name"),
                "avatar_url": profile.get("avatar_url"),
                "email": email,
            }
        )

    # Fetch funding sources
    fs_result = (
        client.table("project_funding_sources")
        .select("funding_source_id,allocated_amount")
        .eq("project_id", project_id)
        .execute()
    )
    funding_sources = [
        {
            "funding_source_id": row["funding_source_id"],
            "allocated_amount": row.get("allocated_amount"),
        }
        for row in (fs_result.data or [])
    ]

    # Compute balance
    fs_ids = [row["funding_source_id"] for row in (fs_result.data or [])]
    current_amount = _compute_project_balance(client, fs_ids)

    # Fetch funding plans for this project
    funding_plans: list[dict[str, Any]] = []
    try:
        plans_result = (
            client.table("funding_plans")
            .select("*")
            .eq("project_id", project_id)
            .order("created_at", desc=False)
            .execute()
        )
        funding_plans = plans_result.data or []
    except Exception:
        # Table may not exist yet if migration hasn't been applied
        logger.debug("funding_plans query failed (migration pending?)")

    return {
        "id": project["id"],
        "name": project["name"],
        "target_amount": float(project.get("target_amount", 0)),
        "target_currency": project.get("target_currency", "EUR"),
        "target_date": project.get("target_date"),
        "category": project.get("category"),
        "created_by": project["created_by"],
        "current_amount": current_amount,
        "members": members,
        "funding_sources": funding_sources,
        "funding_plans": funding_plans,
        "created_at": project["created_at"],
        "updated_at": project["updated_at"],
    }


# ---------------------------------------------------------------------------
# Update project
# ---------------------------------------------------------------------------


def update_project(
    client: Client,
    *,
    project_id: str,
    user_id: str,
    name: str | None = None,
    target_amount: float | None = None,
    target_currency: str | None = None,
    target_date: str | None = None,
    category: str | None = None,
    funding_source_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Update a project. Only OWNER can update. Returns updated project detail."""

    # Verify user is OWNER
    member_check = (
        client.table("project_members")
        .select("role")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not member_check.data or member_check.data["role"] != "OWNER":
        return {}

    # Build update payload (only non-None fields)
    updates: dict[str, Any] = {}
    if name is not None:
        updates["name"] = name
    if target_amount is not None:
        updates["target_amount"] = target_amount
    if target_currency is not None:
        updates["target_currency"] = target_currency
    if target_date is not None:
        updates["target_date"] = target_date
    if category is not None:
        updates["category"] = category

    if updates:
        client.table("projects").update(updates).eq("id", project_id).execute()

    # Sync funding sources if provided
    if funding_source_ids is not None:
        # Remove existing links
        client.table("project_funding_sources").delete().eq("project_id", project_id).execute()
        # Insert new links
        if funding_source_ids:
            rows = [
                {"project_id": project_id, "funding_source_id": fs_id}
                for fs_id in funding_source_ids
            ]
            client.table("project_funding_sources").insert(rows).execute()

    write_audit_log(
        client,
        user_id=user_id,
        action="PROJECT_UPDATED",
        resource_type="project",
        resource_id=project_id,
        metadata={"updates": updates, "funding_source_ids": funding_source_ids},
    )

    return get_project(client, project_id=project_id, user_id=user_id)


# ---------------------------------------------------------------------------
# Delete project
# ---------------------------------------------------------------------------


def delete_project(client: Client, *, project_id: str, user_id: str) -> bool:
    """Delete a project. Only OWNER can delete. Returns True if deleted."""

    # Verify user is OWNER
    member_check = (
        client.table("project_members")
        .select("role")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not member_check.data or member_check.data["role"] != "OWNER":
        return False

    # Delete in order: funding sources → members → project
    client.table("project_funding_sources").delete().eq("project_id", project_id).execute()
    client.table("project_members").delete().eq("project_id", project_id).execute()
    client.table("projects").delete().eq("id", project_id).execute()

    write_audit_log(
        client,
        user_id=user_id,
        action="PROJECT_DELETED",
        resource_type="project",
        resource_id=project_id,
    )

    return True


# ---------------------------------------------------------------------------
# Invite member
# ---------------------------------------------------------------------------


def invite_member(
    client: Client,
    *,
    project_id: str,
    inviter_id: str,
    email: str,
) -> dict[str, Any] | None:
    """Invite a user to a project by email. Returns the member row or None."""

    # Look up user by email via auth admin
    auth_user = _lookup_user_by_email(client, email)
    if not auth_user:
        logger.info("Invite skipped: no user found with email %s", email)
        return None

    invited_user_id = auth_user["id"]

    # Check if already a member
    existing = (
        client.table("project_members")
        .select("user_id,role")
        .eq("project_id", project_id)
        .eq("user_id", invited_user_id)
        .maybe_single()
        .execute()
    )
    if existing.data:
        return None  # Already a member or already invited

    # Insert PENDING_INVITE
    client.table("project_members").insert(
        {
            "project_id": project_id,
            "user_id": invited_user_id,
            "role": "PENDING_INVITE",
            "invited_by": inviter_id,
        }
    ).execute()

    # Get profile info
    profile = _get_user_profile(client, invited_user_id)

    write_audit_log(
        client,
        user_id=inviter_id,
        action="PROJECT_MEMBER_INVITED",
        resource_type="project",
        resource_id=project_id,
        metadata={"invited_email": email, "invited_user_id": invited_user_id},
    )

    return {
        "user_id": invited_user_id,
        "role": "PENDING_INVITE",
        "full_name": profile.get("full_name"),
        "avatar_url": profile.get("avatar_url"),
        "email": email,
    }


# ---------------------------------------------------------------------------
# Respond to invite
# ---------------------------------------------------------------------------


def respond_to_invite(
    client: Client,
    *,
    project_id: str,
    user_id: str,
    accept: bool,
) -> bool:
    """Accept or decline a project invitation. Returns True if updated."""

    existing = (
        client.table("project_members")
        .select("role")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .eq("role", "PENDING_INVITE")
        .maybe_single()
        .execute()
    )
    if not existing.data:
        return False

    if accept:
        client.table("project_members").update({"role": "MEMBER"}).eq("project_id", project_id).eq(
            "user_id", user_id
        ).execute()

        write_audit_log(
            client,
            user_id=user_id,
            action="PROJECT_MEMBER_JOINED",
            resource_type="project",
            resource_id=project_id,
        )
    else:
        client.table("project_members").delete().eq("project_id", project_id).eq(
            "user_id", user_id
        ).execute()

    return True


# ---------------------------------------------------------------------------
# Assign funding source
# ---------------------------------------------------------------------------


def assign_funding_source(
    client: Client,
    *,
    project_id: str,
    funding_source_id: str,
    allocated_amount: float | None = None,
) -> dict[str, Any]:
    """Link a funding source to a project."""

    row: dict[str, Any] = {
        "project_id": project_id,
        "funding_source_id": funding_source_id,
    }
    if allocated_amount is not None:
        row["allocated_amount"] = allocated_amount

    result = client.table("project_funding_sources").upsert(row).execute()

    write_audit_log(
        client,
        user_id=None,
        action="PROJECT_FUNDING_SOURCE_ASSIGNED",
        resource_type="project",
        resource_id=project_id,
        metadata={
            "funding_source_id": funding_source_id,
            "allocated_amount": allocated_amount,
        },
    )

    return result.data[0] if result.data else row


# ---------------------------------------------------------------------------
# Balance computation helper
# ---------------------------------------------------------------------------


def _compute_project_balance(client: Client, funding_source_ids: list[str]) -> float:
    """Sum of current_balance for linked funding sources, converted to EUR."""
    if not funding_source_ids:
        return 0.0

    result = (
        client.table("funding_sources")
        .select("current_balance,currency")
        .in_("id", funding_source_ids)
        .execute()
    )

    # Collect non-EUR currencies and fetch exchange rates
    currencies = {row.get("currency", "EUR") for row in (result.data or [])}
    rates = get_rates_to_eur(client, currencies)

    total = Decimal(0)
    for row in result.data or []:
        balance = Decimal(str(row.get("current_balance", 0)))
        currency = row.get("currency", "EUR")
        if currency == "EUR":
            total += balance
        elif currency in rates:
            total += balance * rates[currency]

    return float(round(total, 2))
