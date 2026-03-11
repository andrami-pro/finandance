"""Webhooks API router.

Endpoints:
  POST /api/v1/webhooks/inbound-email — receive email forwarded by n8n workflow

n8n workflow setup:
  1. Email Trigger node (IMAP) — listens for bank notification emails
  2. HTTP Request node — POST to this endpoint with the email data

Required headers:
  - X-Webhook-Secret: shared secret for authentication
  - X-User-Id: Supabase user UUID (who owns this email)
"""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.db import get_supabase
from app.services.email_templates import detect_and_parse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------


class InboundEmailPayload(BaseModel):
    """Payload sent by n8n HTTP Request node."""

    from_addr: str = ""
    subject: str = ""
    date: str = ""
    message_id: str
    text_body: str = ""
    html_body: str = ""


# ---------------------------------------------------------------------------
# POST /webhooks/inbound-email
# ---------------------------------------------------------------------------


@router.post("/inbound-email", status_code=status.HTTP_200_OK)
async def inbound_email(
    payload: InboundEmailPayload,
    x_webhook_secret: str = Header(...),
    x_user_id: str = Header(...),
) -> dict[str, Any]:
    """Receive an email from n8n and create a transaction.

    n8n sends bank notification emails here after matching them
    via IMAP trigger + filter criteria.
    """
    settings = get_settings()

    # Validate webhook secret
    if x_webhook_secret != settings.webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret",
        )

    user_id = x_user_id
    client = get_supabase()

    # Check for duplicate (idempotency via message_id)
    existing = (
        client.table("email_ingest_log")
        .select("id")
        .eq("message_id", payload.message_id)
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        return {"status": "duplicate", "message_id": payload.message_id}

    # Parse email with bank templates
    result = detect_and_parse(
        from_addr=payload.from_addr,
        subject=payload.subject,
        html_body=payload.html_body,
        text_body=payload.text_body,
        date=payload.date or datetime.now(tz=timezone.utc).isoformat(),
        message_id=payload.message_id,
    )

    if result is None:
        # Log as unknown bank
        client.table("email_ingest_log").insert(
            {
                "user_id": user_id,
                "message_id": payload.message_id,
                "from_addr": payload.from_addr,
                "subject": payload.subject[:500],
                "status": "UNKNOWN_BANK",
            }
        ).execute()
        logger.info("Unknown bank email from=%s subject=%s", payload.from_addr, payload.subject)
        return {"status": "unknown_bank", "from": payload.from_addr}

    # Insert transaction
    txn_data = {
        "user_id": user_id,
        "external_transaction_id": payload.message_id,
        "amount": str(result.amount),
        "currency": result.currency,
        "description": f"{result.merchant} ({result.bank_name})",
        "category": None,
        "transaction_date": result.date.isoformat(),
        "direction": result.direction,
        "source_type": "EMAIL",
        "bank_name": result.bank_name,
    }

    txn_result = (
        client.table("transactions")
        .upsert(txn_data, on_conflict="external_transaction_id")
        .execute()
    )

    transaction_id = txn_result.data[0]["id"] if txn_result.data else None

    # Log successful processing
    client.table("email_ingest_log").insert(
        {
            "user_id": user_id,
            "message_id": payload.message_id,
            "from_addr": payload.from_addr,
            "subject": payload.subject[:500],
            "bank_name": result.bank_name,
            "status": "PROCESSED",
            "transaction_id": transaction_id,
        }
    ).execute()

    logger.info(
        "Processed email: bank=%s amount=%s %s direction=%s merchant=%s",
        result.bank_name,
        result.amount,
        result.currency,
        result.direction,
        result.merchant,
    )

    return {
        "status": "processed",
        "bank": result.bank_name,
        "amount": str(result.amount),
        "currency": result.currency,
        "direction": result.direction,
        "merchant": result.merchant,
        "transaction_id": transaction_id,
    }
