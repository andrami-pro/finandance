"""Integrations API router.

Endpoints:
  GET    /api/v1/integrations                       — list user integrations
  POST   /api/v1/integrations/connect               — add + encrypt + queue sync
  DELETE /api/v1/integrations/{id}                  — remove integration
  POST   /api/v1/integrations/{id}/sync             — trigger manual sync
  POST   /api/v1/integrations/revolut/initiate      — start Enable Banking OAuth flow
  POST   /api/v1/integrations/revolut/complete       — finish Enable Banking OAuth flow
"""

import asyncio
import json
import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, model_validator

from app.core.auth import CurrentUser
from app.core.crypto import encrypt
from app.core.db import get_supabase
from app.jobs.sync_jobs import queue_sync_job
from app.models.integrations import IntegrationPublic, ProviderName
from app.services.audit_log_service import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class ConnectRequest(BaseModel):
    provider: ProviderName
    api_key: str | None = None
    """API key for Wise or Kraken. Required unless public_address is provided."""
    api_secret: str | None = None
    """API secret for Kraken (combined with api_key as 'key|||secret')."""
    public_address: str | None = None
    """Public blockchain address for Ledger (BTC/ETH). No encryption needed."""
    chain: str | None = None
    """Blockchain type for Ledger: 'BTC' or 'ETH'."""

    @model_validator(mode="after")
    def check_credentials(self) -> "ConnectRequest":
        if self.api_key is None and self.public_address is None:
            raise ValueError("Either api_key or public_address must be provided")
        return self


class ConnectResponse(BaseModel):
    id: UUID
    provider: ProviderName
    status: str
    job_id: str
    message: str


class SyncResponse(BaseModel):
    job_id: str
    status: str
    integration_id: str


class RevolutInitiateRequest(BaseModel):
    country: str = "GB"
    """ISO country code for the Revolut ASPSP (GB, ES, DE, FR, LT, etc.)."""


class RevolutInitiateResponse(BaseModel):
    link: str
    integration_id: str


class RevolutCompleteRequest(BaseModel):
    code: str
    """Authorization code returned in the callback URL by Enable Banking."""


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[IntegrationPublic])
def list_integrations(user: CurrentUser) -> list[dict[str, Any]]:
    """Return all integrations for the authenticated user (no encrypted keys)."""
    client = get_supabase()
    result = (
        client.table("integrations")
        .select("id,user_id,provider_name,status,last_synced_at,updated_at,public_address")
        .eq("user_id", user.sub)
        .execute()
    )
    return result.data or []


@router.post("/connect", response_model=ConnectResponse, status_code=status.HTTP_201_CREATED)
def connect_integration(payload: ConnectRequest, user: CurrentUser) -> dict[str, Any]:
    """Add a new integration, encrypt credentials, and queue the initial sync."""
    client = get_supabase()

    # Build encrypted credential
    encrypted_api_key: str | None = None
    if payload.api_key:
        if payload.provider == ProviderName.KRAKEN and payload.api_secret:
            # Store as "api_key|||api_secret" — single encrypted blob
            encrypted_api_key = encrypt(f"{payload.api_key}|||{payload.api_secret}")
        else:
            encrypted_api_key = encrypt(payload.api_key)

    insert_data: dict[str, Any] = {
        "user_id": user.sub,
        "provider_name": payload.provider.value,
        "encrypted_api_key": encrypted_api_key,
        "public_address": payload.public_address,
        "chain": payload.chain,
        "status": "PENDING",
    }

    try:
        result = client.table("integrations").insert(insert_data).execute()
    except Exception as exc:
        err_msg = str(exc).lower()
        if "duplicate" in err_msg or "unique" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Integration with provider {payload.provider.value} already exists",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create integration",
        ) from exc

    integration = result.data[0]
    integration_id = integration["id"]

    # Queue initial sync
    job_id = queue_sync_job(integration_id=integration_id, user_id=user.sub)

    # Audit log
    write_audit_log(
        client,
        user_id=user.sub,
        action="INTEGRATION_ADDED",
        resource_type="integration",
        resource_id=integration_id,
        metadata={"provider": payload.provider.value},
    )

    return {
        "id": integration_id,
        "provider": integration["provider_name"],
        "status": integration["status"],
        "job_id": job_id,
        "message": "Integration created. Sync started in background.",
    }


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_integration(integration_id: UUID, user: CurrentUser) -> None:
    """Remove an integration and all its funding sources (CASCADE via DB)."""
    client = get_supabase()

    # Verify ownership
    existing = (
        client.table("integrations")
        .select("id,provider_name")
        .eq("id", str(integration_id))
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )
    if existing.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )

    provider = existing.data.get("provider_name", "")

    client.table("integrations").delete().eq("id", str(integration_id)).execute()

    write_audit_log(
        client,
        user_id=user.sub,
        action="INTEGRATION_DELETED",
        resource_type="integration",
        resource_id=integration_id,
        metadata={"provider": provider},
    )


@router.post(
    "/{integration_id}/sync", response_model=SyncResponse, status_code=status.HTTP_202_ACCEPTED
)
def trigger_sync(integration_id: UUID, user: CurrentUser) -> dict[str, Any]:
    """Queue a manual sync for an existing integration."""
    client = get_supabase()

    existing = (
        client.table("integrations")
        .select("id,status")
        .eq("id", str(integration_id))
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )
    if existing.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )

    job_id = queue_sync_job(integration_id=str(integration_id), user_id=user.sub)

    return {
        "job_id": job_id,
        "status": "QUEUED",
        "integration_id": str(integration_id),
    }


# ---------------------------------------------------------------------------
# Enable Banking OAuth flow (Revolut via Open Banking / PSD2)
# ---------------------------------------------------------------------------


@router.post(
    "/revolut/initiate",
    response_model=RevolutInitiateResponse,
    status_code=status.HTTP_201_CREATED,
)
def initiate_revolut(payload: RevolutInitiateRequest, user: CurrentUser) -> dict[str, Any]:
    """Start the Enable Banking OAuth flow for connecting Revolut.

    Calls Enable Banking POST /auth, inserts a PENDING integration,
    and returns the authorization link for the user to visit.
    """
    from app.services.enable_banking_service import EnableBankingService

    client = get_supabase()

    # Check for existing Revolut integration
    existing = (
        client.table("integrations")
        .select("id,status")
        .eq("user_id", user.sub)
        .eq("provider_name", "REVOLUT")
        .maybe_single()
        .execute()
    )

    if existing.data is not None:
        if existing.data["status"] == "PENDING":
            # Clean up stale PENDING integration from a previous incomplete attempt
            client.table("integrations").delete().eq("id", existing.data["id"]).execute()
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A REVOLUT integration already exists",
            )

    service = EnableBankingService()

    loop = asyncio.new_event_loop()
    try:
        # Insert PENDING integration first so we have an ID for state tracking
        insert_data: dict[str, Any] = {
            "user_id": user.sub,
            "provider_name": "REVOLUT",
            "encrypted_api_key": encrypt("pending"),  # placeholder, updated on complete
            "status": "PENDING",
        }

        try:
            result = client.table("integrations").insert(insert_data).execute()
        except Exception as exc:
            err_msg = str(exc).lower()
            if "duplicate" in err_msg or "unique" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A REVOLUT integration already exists",
                ) from exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create integration",
            ) from exc

        integration = result.data[0]
        integration_id = integration["id"]

        # Start Enable Banking authorization (integration_id used as state)
        auth_result = loop.run_until_complete(
            service.start_authorization(
                aspsp_name="Revolut",
                country=payload.country,
                state=integration_id,
            )
        )

        link = auth_result["url"]
        authorization_id = auth_result.get("authorization_id", "")

        # Store the authorization_id encrypted (needed for reference)
        client.table("integrations").update({"encrypted_api_key": encrypt(authorization_id)}).eq(
            "id", integration_id
        ).execute()

        # Audit log
        write_audit_log(
            client,
            user_id=user.sub,
            action="REVOLUT_INITIATE",
            resource_type="integration",
            resource_id=integration_id,
            metadata={
                "provider": "REVOLUT",
                "country": payload.country,
            },
        )

        logger.info(
            "Enable Banking authorization started for user %s: %s",
            user.sub,
            authorization_id,
        )

    finally:
        loop.close()

    return {
        "link": link,
        "integration_id": integration_id,
    }


@router.post("/revolut/complete", response_model=SyncResponse)
def complete_revolut(payload: RevolutCompleteRequest, user: CurrentUser) -> dict[str, Any]:
    """Complete the Enable Banking OAuth flow after the user returns from authorization.

    Exchanges the authorization code for a session, extracts account UIDs,
    updates the integration with full credentials, and queues the initial sync.
    """
    from app.services.enable_banking_service import EnableBankingService

    client = get_supabase()
    service = EnableBankingService()

    # Exchange the code for a session with account data
    loop = asyncio.new_event_loop()
    try:
        session_data = loop.run_until_complete(service.create_session(payload.code))
    finally:
        loop.close()

    session_id = session_data.get("session_id", "")
    accounts = session_data.get("accounts", [])

    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No accounts were linked. Please try connecting again.",
        )

    # Extract account UIDs
    account_uids = [
        acct.get("uid") or acct.get("account_id", "")
        for acct in accounts
        if acct.get("uid") or acct.get("account_id")
    ]

    if not account_uids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid accounts found in the session.",
        )

    # Find the PENDING Revolut integration for this user
    existing = (
        client.table("integrations")
        .select("id,user_id,provider_name,status")
        .eq("user_id", user.sub)
        .eq("provider_name", "REVOLUT")
        .eq("status", "PENDING")
        .maybe_single()
        .execute()
    )

    if existing.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending Revolut integration found. Please initiate the connection first.",
        )

    integration = existing.data
    integration_id = integration["id"]

    # Store session_id + account_uids + account metadata as encrypted JSON
    credentials = json.dumps(
        {
            "session_id": session_id,
            "account_uids": account_uids,
            "accounts": accounts,
        }
    )
    client.table("integrations").update({"encrypted_api_key": encrypt(credentials)}).eq(
        "id", integration_id
    ).execute()

    # Queue initial sync
    job_id = queue_sync_job(integration_id=integration_id, user_id=user.sub)

    # Audit log
    write_audit_log(
        client,
        user_id=user.sub,
        action="REVOLUT_COMPLETE",
        resource_type="integration",
        resource_id=integration_id,
        metadata={
            "provider": "REVOLUT",
            "accounts_linked": len(account_uids),
        },
    )

    logger.info(
        "Enable Banking connection completed for user %s: %d accounts linked",
        user.sub,
        len(account_uids),
    )

    return {
        "job_id": job_id,
        "status": "QUEUED",
        "integration_id": integration_id,
    }
