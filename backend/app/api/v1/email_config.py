"""Email ingest configuration API router.

Endpoints:
  POST   /api/v1/email-config/activate — generate unique ingest address
  GET    /api/v1/email-config          — get current config
  DELETE /api/v1/email-config          — deactivate email ingestion
"""

import hashlib
import logging
import secrets
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.email_config import EmailIngestActivateResponse, EmailIngestConfigResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email-config", tags=["email-config"])

INGEST_DOMAIN = "ingest.andrami.pro"


def _generate_hash(user_id: str) -> str:
    """Generate a short unique hash for the user's ingest address."""
    seed = f"{user_id}-{secrets.token_hex(4)}"
    return hashlib.sha256(seed.encode()).hexdigest()[:12]


# ---------------------------------------------------------------------------
# POST /email-config/activate
# ---------------------------------------------------------------------------


@router.post("/activate", response_model=EmailIngestActivateResponse)
async def activate_email_ingest(user: CurrentUser) -> dict[str, Any]:
    """Activate email ingestion and generate a unique ingest address."""
    client = get_supabase()

    # Check if already exists
    existing = (
        client.table("email_ingest_configs")
        .select("ingest_hash, is_active")
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        ingest_hash = existing.data["ingest_hash"]
        # Reactivate if was deactivated
        if not existing.data["is_active"]:
            client.table("email_ingest_configs").update({"is_active": True}).eq(
                "user_id", user.sub
            ).execute()

        return {
            "ingest_address": f"{ingest_hash}@{INGEST_DOMAIN}",
            "message": "Email ingestion is active",
        }

    # Generate unique hash
    ingest_hash = _generate_hash(user.sub)

    client.table("email_ingest_configs").insert(
        {
            "user_id": user.sub,
            "ingest_hash": ingest_hash,
            "is_active": True,
        }
    ).execute()

    logger.info("Activated email ingest for user %s → %s@%s", user.sub, ingest_hash, INGEST_DOMAIN)

    return {
        "ingest_address": f"{ingest_hash}@{INGEST_DOMAIN}",
        "message": "Email ingestion activated. Forward bank notification emails to this address.",
    }


# ---------------------------------------------------------------------------
# GET /email-config
# ---------------------------------------------------------------------------


@router.get("", response_model=EmailIngestConfigResponse)
async def get_email_config(user: CurrentUser) -> dict[str, Any]:
    """Get the current email ingest configuration."""
    client = get_supabase()

    result = (
        client.table("email_ingest_configs")
        .select("ingest_hash, is_active, created_at")
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email ingestion not configured. Use POST /email-config/activate first.",
        )

    return {
        "ingest_address": f"{result.data['ingest_hash']}@{INGEST_DOMAIN}",
        "is_active": result.data["is_active"],
        "created_at": result.data["created_at"],
    }


# ---------------------------------------------------------------------------
# DELETE /email-config
# ---------------------------------------------------------------------------


@router.delete("", status_code=status.HTTP_200_OK)
async def deactivate_email_ingest(user: CurrentUser) -> dict[str, str]:
    """Deactivate email ingestion (keeps the address for reactivation)."""
    client = get_supabase()

    result = (
        client.table("email_ingest_configs")
        .update({"is_active": False})
        .eq("user_id", user.sub)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email ingestion not configured.",
        )

    return {"message": "Email ingestion deactivated"}
