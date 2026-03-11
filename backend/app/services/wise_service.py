"""Wise (TransferWise) API service client.

Fetches balances (Jars/Pockets) and transaction history for a personal profile.
All calls are read-only — no write operations to Wise.

API docs: https://docs.wise.com/api-docs/
Base URL: https://api.transferwise.com
"""

import json
import logging
from decimal import Decimal
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class WiseAuthError(Exception):
    """Raised when Wise returns 401 — invalid or revoked API key."""


class WiseAPIError(Exception):
    """Raised on non-auth Wise API errors."""


class WiseService:
    """Async client for the Wise API."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key
        settings = get_settings()
        self._base_url = settings.wise_api_base_url

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}"}

    async def _get_profile_id(self) -> int:
        """Fetch the first personal profile ID for this API key."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self._base_url}/v1/profiles",
                headers=self._headers(),
            )
        if resp.status_code == 401:
            raise WiseAuthError("Invalid Wise API key")
        resp.raise_for_status()
        profiles = resp.json()
        personal = [p for p in profiles if p.get("type") == "personal"]
        if not personal:
            return profiles[0]["id"]
        return personal[0]["id"]

    async def _get_recipient_id(self) -> int:
        """Fetch the user's own recipientId from their borderless account.

        This ID appears as ``targetAccount`` on incoming transfers, allowing
        reliable IN/OUT direction detection.
        """
        profile_id = await self._get_profile_id()

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self._base_url}/v1/borderless-accounts",
                headers=self._headers(),
                params={"profileId": profile_id},
            )
        if resp.status_code == 401:
            raise WiseAuthError("Invalid Wise API key")
        resp.raise_for_status()

        accounts = resp.json()
        if not accounts:
            raise WiseAPIError("No borderless account found")
        return accounts[0]["recipientId"]

    async def get_funding_sources(self) -> list[dict[str, Any]]:
        """Return list of funding source dicts from Wise balances.

        Each dict has keys compatible with FundingSourceCreate:
          external_source_id, name, asset_type, currency, current_balance
        """
        profile_id = await self._get_profile_id()

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self._base_url}/v4/profiles/{profile_id}/balances",
                headers=self._headers(),
                params={"types": "STANDARD"},
            )
        if resp.status_code == 401:
            raise WiseAuthError("Invalid Wise API key")
        resp.raise_for_status()

        sources: list[dict[str, Any]] = []
        for balance in resp.json():
            currency = balance.get("currency") or balance["amount"]["currency"]
            amount_val = balance["amount"]["value"]
            sources.append(
                {
                    "external_source_id": str(balance["id"]),
                    "name": balance.get("name") or f"{currency} Jar",
                    "asset_type": "fiat",
                    "currency": currency,
                    "current_balance": Decimal(str(amount_val)),
                }
            )
        return sources

    async def get_transactions(self) -> tuple[int, list[dict[str, Any]]]:
        """Return (recipient_id, transfers) from Wise GET /v1/transfers.

        ``recipient_id`` is the user's own borderless-account recipient ID.
        Transfers whose ``targetAccount == recipient_id`` are incoming (IN);
        all others are outgoing (OUT).
        """
        profile_id = await self._get_profile_id()
        recipient_id = await self._get_recipient_id()
        logger.info("Wise recipient_id=%d, profile_id=%d", recipient_id, profile_id)

        all_transfers: list[dict[str, Any]] = []
        offset = 0
        limit = 100

        while True:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self._base_url}/v1/transfers",
                    headers=self._headers(),
                    params={
                        "profile": profile_id,
                        "offset": offset,
                        "limit": limit,
                    },
                )
            if resp.status_code == 401:
                raise WiseAuthError("Invalid Wise API key")
            resp.raise_for_status()

            page = resp.json()
            if not page:
                break
            all_transfers.extend(page)
            if len(page) < limit:
                break
            offset += limit

        logger.info("Fetched %d transfers from Wise API", len(all_transfers))

        # Log first 3 full transfer objects for debugging direction detection
        for i, t in enumerate(all_transfers[:3]):
            logger.info(
                "Wise raw transfer #%d: %s",
                i,
                json.dumps(t, indent=2, default=str),
            )

        txns: list[dict[str, Any]] = []
        for t in all_transfers:
            txns.append(
                {
                    "external_transaction_id": str(t["id"]),
                    "creator_user_id": t.get("user"),
                    "source_value": Decimal(str(t.get("sourceValue", 0))),
                    "source_currency": t.get("sourceCurrency", "EUR"),
                    "target_value": Decimal(str(t.get("targetValue", 0))),
                    "target_currency": t.get("targetCurrency", "EUR"),
                    "description": (
                        t.get("details", {}).get("reference") or t.get("reference") or ""
                    ),
                    "transaction_date": t.get("created"),
                    # Extra fields for direction detection
                    "status": t.get("status"),
                    "type": t.get("type"),
                    "details_type": t.get("details", {}).get("type"),
                    "target_account": t.get("targetAccount"),
                    "source_account": t.get("sourceAccount"),
                }
            )
        return recipient_id, txns
