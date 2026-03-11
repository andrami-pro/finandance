"""Sync orchestrator and in-memory job tracker.

IMPORTANT: APScheduler runs in-process. Deploy backend as a SINGLE instance
(--workers 1) on Railway/Render to avoid duplicate syncs. See quickstart.md.

Job lifecycle: QUEUED → RUNNING → COMPLETED | FAILED

Job status is tracked in-memory (dict). For V2, swap with Redis for
multi-instance support.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Job status types
# ---------------------------------------------------------------------------

JobStatus = Literal["QUEUED", "RUNNING", "COMPLETED", "FAILED"]


class SyncJob:
    """In-memory job tracking record."""

    def __init__(self, integration_id: str, user_id: str) -> None:
        self.job_id: str = str(uuid.uuid4())
        self.integration_id: str = integration_id
        self.user_id: str = user_id
        self.status: JobStatus = "QUEUED"
        self.queued_at: datetime = datetime.now(tz=timezone.utc)
        self.started_at: datetime | None = None
        self.completed_at: datetime | None = None
        self.error: str | None = None
        self.funding_sources_synced: int = 0
        self.transactions_synced: int = 0

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "job_id": self.job_id,
            "status": self.status,
            "integration_id": self.integration_id,
        }
        if self.started_at:
            d["started_at"] = self.started_at.isoformat()
        if self.status == "COMPLETED":
            d["funding_sources_synced"] = self.funding_sources_synced
            d["transactions_synced"] = self.transactions_synced
            d["completed_at"] = self.completed_at.isoformat() if self.completed_at else None
        if self.status == "FAILED":
            d["error"] = self.error
        return d


# ---------------------------------------------------------------------------
# In-memory registry
# ---------------------------------------------------------------------------

_jobs: dict[str, SyncJob] = {}
_scheduler: BackgroundScheduler | None = None


def get_scheduler() -> BackgroundScheduler:
    """Return the singleton APScheduler instance (starts on first call)."""
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(timezone="UTC")
        _scheduler.start()
        logger.info("APScheduler started (single-instance mode)")
    return _scheduler


def get_job_status(job_id: str) -> dict[str, Any] | None:
    """Return job status dict, or None if job_id is unknown."""
    job = _jobs.get(job_id)
    return job.to_dict() if job else None


def queue_sync_job(integration_id: str, user_id: str) -> str:
    """Create a new sync job record, queue it via APScheduler, return job_id."""
    job = SyncJob(integration_id=integration_id, user_id=user_id)
    _jobs[job.job_id] = job

    get_scheduler().add_job(
        _run_sync,
        args=[job.job_id],
        id=f"sync_{job.job_id}",
        misfire_grace_time=60,
    )

    logger.info("Queued sync job %s for integration %s", job.job_id, integration_id)
    return job.job_id


# ---------------------------------------------------------------------------
# Sync execution
# ---------------------------------------------------------------------------


def _run_sync(job_id: str) -> None:
    """Execute the sync job. Called by APScheduler in a background thread."""
    job = _jobs.get(job_id)
    if not job:
        logger.error("Sync job %s not found in registry", job_id)
        return

    job.status = "RUNNING"
    job.started_at = datetime.now(tz=timezone.utc)
    logger.info("Starting sync job %s for integration %s", job_id, job.integration_id)

    try:
        from app.core.crypto import decrypt
        from app.core.db import get_supabase

        client = get_supabase()

        # Fetch the integration record
        result = (
            client.table("integrations")
            .select("*")
            .eq("id", job.integration_id)
            .maybe_single()
            .execute()
        )
        if result.data is None:
            raise ValueError(f"Integration {job.integration_id} not found")

        integration = result.data
        _provider = integration["provider_name"]

        # Execute provider-specific sync
        import asyncio

        loop = asyncio.new_event_loop()
        try:
            sources, txns = loop.run_until_complete(_fetch_provider_data(integration, decrypt))
        finally:
            loop.close()

        # Upsert funding sources
        for source in sources:
            source_data = {
                **source,
                "integration_id": job.integration_id,
                "user_id": job.user_id,
                "current_balance": str(source["current_balance"]),
                "balance_in_base_currency": None,
            }
            client.table("funding_sources").upsert(
                source_data,
                on_conflict="integration_id,external_source_id",
            ).execute()

        # Clean up stale transaction entries from previous sync logic
        # (old syncs created _out/_in suffixed duplicates).
        source_db_ids = []
        for source in sources:
            src_result = (
                client.table("funding_sources")
                .select("id")
                .eq("integration_id", job.integration_id)
                .eq("external_source_id", source["external_source_id"])
                .maybe_single()
                .execute()
            )
            if src_result is not None and src_result.data:
                source_db_ids.append(src_result.data["id"])
        if source_db_ids:
            client.table("transactions").delete().in_("funding_source_id", source_db_ids).execute()

        # Upsert transactions (idempotent via external_transaction_id)
        for txn in txns:
            if not txn.get("external_transaction_id"):
                continue
            # Need to find the funding_source_id for this transaction
            source_result = (
                client.table("funding_sources")
                .select("id")
                .eq("integration_id", job.integration_id)
                .eq("external_source_id", txn.get("source_external_id", ""))
                .maybe_single()
                .execute()
            )
            if source_result is None or source_result.data is None:
                continue

            txn_data = {
                "funding_source_id": source_result.data["id"],
                "external_transaction_id": txn["external_transaction_id"],
                "amount": str(txn["amount"]),
                "currency": txn["currency"],
                "description": txn.get("description"),
                "transaction_date": txn.get("transaction_date"),
                "direction": txn.get("direction"),
            }
            client.table("transactions").upsert(
                txn_data,
                on_conflict="external_transaction_id",
            ).execute()

        # Update integration status
        client.table("integrations").update(
            {
                "status": "ACTIVE",
                "last_synced_at": datetime.now(tz=timezone.utc).isoformat(),
            }
        ).eq("id", job.integration_id).execute()

        job.funding_sources_synced = len(sources)
        job.transactions_synced = len(txns)
        job.status = "COMPLETED"
        job.completed_at = datetime.now(tz=timezone.utc)
        logger.info(
            "Sync job %s COMPLETED: %d sources, %d transactions",
            job_id,
            len(sources),
            len(txns),
        )

    except Exception as exc:
        job.status = "FAILED"
        job.error = str(exc)
        logger.exception("Sync job %s FAILED: %s", job_id, exc)

        # Mark integration as ERROR
        try:
            from app.core.db import get_supabase

            get_supabase().table("integrations").update({"status": "ERROR"}).eq(
                "id", job.integration_id
            ).execute()
        except Exception:
            pass


async def _fetch_provider_data(
    integration: dict[str, Any],
    decrypt_fn: Any,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Dispatch to the correct provider service and return (sources, transactions)."""
    provider = integration["provider_name"]

    if provider == "WISE":
        from decimal import Decimal

        from app.services.wise_service import WiseService

        api_key = decrypt_fn(integration["encrypted_api_key"])
        service = WiseService(api_key=api_key)
        sources = await service.get_funding_sources()

        # Build currency → external_source_id lookup from user's balances.
        currency_to_source: dict[str, str] = {
            s["currency"]: s["external_source_id"] for s in sources
        }

        # get_transactions() returns (recipient_id, transfers).
        # Direction rule: targetAccount == recipient_id → IN, else → OUT.
        recipient_id, raw_transfers = await service.get_transactions()
        txns: list[dict[str, Any]] = []

        for t in raw_transfers:
            src_cur = t["source_currency"]
            tgt_cur = t["target_currency"]
            description = t.get("description", "")
            txn_id = t["external_transaction_id"]
            target_account = t.get("target_account")

            is_incoming = target_account == recipient_id

            logger.info(
                "Transfer %s: targetAccount=%s, recipientId=%s → %s",
                txn_id,
                target_account,
                recipient_id,
                "IN" if is_incoming else "OUT",
            )

            if is_incoming:
                # Money arrived into user's Wise balance (target currency)
                tgt_ext = currency_to_source.get(tgt_cur)
                if not tgt_ext:
                    continue
                txns.append(
                    {
                        "external_transaction_id": txn_id,
                        "amount": t["target_value"],
                        "currency": tgt_cur,
                        "direction": "IN",
                        "description": description or f"Received {t['source_value']} {src_cur}",
                        "transaction_date": t["transaction_date"],
                        "source_external_id": tgt_ext,
                    }
                )
            else:
                # Money left user's Wise balance (source currency)
                src_ext = currency_to_source.get(src_cur)
                if not src_ext:
                    continue

                if src_cur != tgt_cur and tgt_cur in currency_to_source:
                    # Cross-currency conversion: OUT from source, IN to target
                    txns.append(
                        {
                            "external_transaction_id": f"{txn_id}_a",
                            "amount": t["source_value"] * Decimal("-1"),
                            "currency": src_cur,
                            "direction": "OUT",
                            "description": description or f"Convert → {tgt_cur}",
                            "transaction_date": t["transaction_date"],
                            "source_external_id": src_ext,
                        }
                    )
                    txns.append(
                        {
                            "external_transaction_id": f"{txn_id}_b",
                            "amount": t["target_value"],
                            "currency": tgt_cur,
                            "direction": "IN",
                            "description": description or f"Convert ← {src_cur}",
                            "transaction_date": t["transaction_date"],
                            "source_external_id": currency_to_source[tgt_cur],
                        }
                    )
                else:
                    txns.append(
                        {
                            "external_transaction_id": txn_id,
                            "amount": t["source_value"] * Decimal("-1"),
                            "currency": src_cur,
                            "direction": "OUT",
                            "description": description
                            or f"Transfer → {t['target_value']} {tgt_cur}",
                            "transaction_date": t["transaction_date"],
                            "source_external_id": src_ext,
                        }
                    )

        return sources, txns

    elif provider == "KRAKEN":
        from app.services.kraken_service import KrakenService

        # Kraken secret is stored as "api_key|||api_secret"
        raw = decrypt_fn(integration["encrypted_api_key"])
        parts = raw.split("|||", 1)
        api_key, api_secret = parts[0], parts[1] if len(parts) > 1 else ""
        service = KrakenService(api_key=api_key, api_secret=api_secret)
        sources = await service.get_funding_sources()
        txns = await service.get_transactions()
        return sources, txns

    elif provider == "LEDGER":
        from app.services.ledger_service import LedgerService

        public_address = integration.get("public_address", "")
        chain = integration.get("chain", "BTC")
        service = LedgerService(public_address=public_address, chain=chain)
        sources = await service.get_funding_sources()
        txns = await service.get_transactions()
        return sources, txns

    elif provider == "REVOLUT":
        import json

        from app.services.enable_banking_service import EnableBankingService

        raw = decrypt_fn(integration["encrypted_api_key"])
        data = json.loads(raw)
        account_uids = data["account_uids"]
        account_meta = data.get("accounts")  # full account objects from session

        service = EnableBankingService()
        sources = await service.get_funding_sources(account_uids, account_meta)
        txns = await service.get_transactions_for_accounts(account_uids)
        return sources, txns

    else:
        raise ValueError(f"Unknown provider: {provider}")
