"""Client service layer.

CRUD operations for freelance clients.
"""

import logging
from typing import Any

from supabase import Client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def list_clients(
    client: Client,
    *,
    user_id: str,
    include_inactive: bool = False,
) -> list[dict[str, Any]]:
    """List clients for a user, optionally including inactive ones."""
    query = client.table("clients").select("*").eq("user_id", user_id).order("name")
    if not include_inactive:
        query = query.eq("is_active", True)

    result = query.execute()
    return result.data or []


def create_client(
    client: Client,
    *,
    user_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new client. Returns the created row."""
    row = {
        "user_id": user_id,
        "name": data["name"],
        "expected_amount_cents": data.get("expected_amount_cents", 0),
        "currency": data.get("currency", "EUR"),
        "payment_frequency": data.get("payment_frequency", "monthly"),
        "expected_day": data.get("expected_day", 1),
        "notes": data.get("notes"),
    }
    result = client.table("clients").insert(row).execute()
    return result.data[0]


def update_client(
    client: Client,
    *,
    user_id: str,
    client_id: str,
    data: dict[str, Any],
) -> dict[str, Any] | None:
    """Update a client. Returns the updated row or None if not found."""
    # Only include non-None fields
    updates = {k: v for k, v in data.items() if v is not None}
    if not updates:
        # Nothing to update; return current row
        result = (
            client.table("clients").select("*").eq("id", client_id).eq("user_id", user_id).execute()
        )
        return result.data[0] if result.data else None

    result = (
        client.table("clients").update(updates).eq("id", client_id).eq("user_id", user_id).execute()
    )
    return result.data[0] if result.data else None


def delete_client(
    client: Client,
    *,
    user_id: str,
    client_id: str,
) -> bool:
    """Soft-delete a client (set is_active=False). Returns True if found."""
    result = (
        client.table("clients")
        .update({"is_active": False})
        .eq("id", client_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(result.data)
