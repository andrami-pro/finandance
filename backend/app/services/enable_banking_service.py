"""Enable Banking API service client.

Handles the Open Banking / PSD2 flow for connecting bank accounts (e.g. Revolut).
Uses JWT RS256 authentication with a private key PEM file.
All calls are read-only — no write operations to the user's bank.

API docs: https://enablebanking.com/docs/api/reference/
Base URL: https://api.enablebanking.com
"""

import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

import httpx
import jwt

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EnableBankingAuthError(Exception):
    """Raised when Enable Banking returns 401/403 — invalid JWT or expired session."""


class EnableBankingAPIError(Exception):
    """Raised on non-auth Enable Banking API errors."""


class EnableBankingService:
    """Async client for the Enable Banking API (Open Banking / PSD2).

    Authentication is via JWT RS256 tokens signed with a private key.
    Each API request gets a fresh short-lived JWT (5 min).
    """

    _private_key_cache: bytes | None = None

    def __init__(self) -> None:
        settings = get_settings()
        self._app_id = settings.enable_banking_app_id
        self._base_url = settings.enable_banking_base_url.rstrip("/")
        self._key_path = settings.enable_banking_key_path
        self._redirect_uri = settings.enable_banking_redirect_uri

    # -----------------------------------------------------------------------
    # JWT Authentication
    # -----------------------------------------------------------------------

    def _load_private_key(self) -> bytes:
        """Load the RSA private key PEM, caching across instances."""
        if EnableBankingService._private_key_cache is not None:
            return EnableBankingService._private_key_cache

        key_path = Path(self._key_path)
        if not key_path.is_absolute():
            # Resolve relative to backend/ directory
            key_path = Path(__file__).resolve().parent.parent.parent / key_path

        if not key_path.exists():
            raise EnableBankingAuthError(
                f"Private key file not found: {key_path}. Set ENABLE_BANKING_KEY_PATH in .env"
            )

        EnableBankingService._private_key_cache = key_path.read_bytes()
        return EnableBankingService._private_key_cache

    def _make_jwt(self) -> str:
        """Create a short-lived JWT for API authentication."""
        now = int(time.time())
        payload = {
            "iss": "enablebanking.com",
            "aud": "api.enablebanking.com",
            "iat": now,
            "exp": now + 300,  # 5 minutes
        }
        private_key = self._load_private_key()
        return jwt.encode(
            payload,
            private_key,
            algorithm="RS256",
            headers={"kid": self._app_id},
        )

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._make_jwt()}",
            "Content-Type": "application/json",
        }

    # -----------------------------------------------------------------------
    # Authorization flow
    # -----------------------------------------------------------------------

    async def start_authorization(
        self,
        aspsp_name: str = "Revolut",
        country: str = "GB",
        state: str | None = None,
        valid_until_days: int = 90,
    ) -> dict[str, Any]:
        """Start the Open Banking authorization flow.

        Returns dict with keys: url (redirect URL for user), authorization_id.
        """
        if state is None:
            state = str(uuid.uuid4())

        valid_until = (datetime.now(tz=timezone.utc) + timedelta(days=valid_until_days)).isoformat()

        body = {
            "access": {
                "valid_until": valid_until,
            },
            "aspsp": {
                "name": aspsp_name,
                "country": country,
            },
            "state": state,
            "redirect_url": self._redirect_uri,
            "psu_type": "personal",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._base_url}/auth",
                headers=self._headers(),
                json=body,
            )

        if resp.status_code in (401, 403):
            raise EnableBankingAuthError(
                f"Enable Banking auth failed ({resp.status_code}): {resp.text}"
            )
        if resp.status_code >= 400:
            raise EnableBankingAPIError(
                f"Failed to start authorization: {resp.status_code} — {resp.text}"
            )

        return resp.json()

    async def create_session(self, code: str) -> dict[str, Any]:
        """Exchange the callback authorization code for a session with accounts.

        Returns dict with keys: session_id, accounts (list), aspsp, etc.
        """
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._base_url}/sessions",
                headers=self._headers(),
                json={"code": code},
            )

        if resp.status_code in (401, 403):
            raise EnableBankingAuthError(
                f"Enable Banking session creation failed ({resp.status_code}): {resp.text}"
            )
        if resp.status_code >= 400:
            raise EnableBankingAPIError(
                f"Failed to create session: {resp.status_code} — {resp.text}"
            )

        return resp.json()

    # -----------------------------------------------------------------------
    # Account data
    # -----------------------------------------------------------------------

    async def get_account_balances(self, account_uid: str) -> list[dict[str, Any]]:
        """Get account balances.

        Returns list of balance objects, each with: balance_amount, balance_type,
        credit_debit_indicator, etc.
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self._base_url}/accounts/{account_uid}/balances",
                headers=self._headers(),
            )

        if resp.status_code in (401, 403):
            raise EnableBankingAuthError("Invalid or expired Enable Banking session")
        if resp.status_code >= 400:
            raise EnableBankingAPIError(
                f"Failed to fetch balances for {account_uid}: {resp.status_code} — {resp.text}"
            )

        data = resp.json()
        return data.get("balances", [])

    async def get_account_transactions(
        self,
        account_uid: str,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get account transactions (all pages via continuation_key).

        Returns flat list of transaction objects.
        """
        params: dict[str, str] = {}
        if date_from:
            params["date_from"] = date_from
        if date_to:
            params["date_to"] = date_to

        all_txns: list[dict[str, Any]] = []
        url = f"{self._base_url}/accounts/{account_uid}/transactions"

        async with httpx.AsyncClient(timeout=30) as client:
            while url:
                resp = await client.get(
                    url,
                    headers=self._headers(),
                    params=params if url.endswith("/transactions") else None,
                )

                if resp.status_code in (401, 403):
                    raise EnableBankingAuthError("Invalid or expired Enable Banking session")
                if resp.status_code >= 400:
                    raise EnableBankingAPIError(
                        f"Failed to fetch transactions for {account_uid}: "
                        f"{resp.status_code} — {resp.text}"
                    )

                data = resp.json()
                all_txns.extend(data.get("transactions", []))

                # Pagination via continuation_key
                continuation = data.get("continuation_key")
                if continuation:
                    url = (
                        f"{self._base_url}/accounts/{account_uid}"
                        f"/transactions?continuation_key={continuation}"
                    )
                    params = {}  # Don't re-send date params on continuation
                else:
                    break

        return all_txns

    # -----------------------------------------------------------------------
    # High-level helpers for sync_jobs
    # -----------------------------------------------------------------------

    async def get_funding_sources(
        self,
        account_uids: list[str],
        account_meta: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch balances for each account, return in FundingSource format.

        account_meta: optional list of account dicts from the session (with
        iban, currency, account_id fields) to build richer names.
        """
        meta_by_uid: dict[str, dict[str, Any]] = {}
        if account_meta:
            for acct in account_meta:
                uid = acct.get("uid") or acct.get("account_id", "")
                meta_by_uid[uid] = acct

        sources: list[dict[str, Any]] = []
        for uid in account_uids:
            try:
                balances = await self.get_account_balances(uid)
            except Exception as exc:
                logger.warning("Failed to fetch balances for account %s: %s", uid, exc)
                continue

            meta = meta_by_uid.get(uid, {})
            currency = meta.get("currency", "EUR")

            # Pick the best balance
            balance_amount = Decimal("0")
            for bal in balances:
                bal_amount = bal.get("balance_amount", {})
                bal_type = bal.get("balance_type", "")

                if bal_type in ("interimAvailable", "expected"):
                    balance_amount = Decimal(str(bal_amount.get("amount", "0")))
                    currency = bal_amount.get("currency", currency)
                    break
                elif bal_type in ("closingBooked", "openingBooked"):
                    balance_amount = Decimal(str(bal_amount.get("amount", "0")))
                    currency = bal_amount.get("currency", currency)

            # Build display name from metadata
            name = meta.get("product", "") or meta.get("name", "")
            if not name:
                iban = meta.get("iban", "")
                if iban:
                    name = f"Revolut ****{iban[-4:]}"
                else:
                    name = f"Revolut {currency}"

            sources.append(
                {
                    "external_source_id": uid,
                    "name": name,
                    "asset_type": "fiat",
                    "currency": currency,
                    "current_balance": balance_amount,
                }
            )

        return sources

    async def get_transactions_for_accounts(
        self,
        account_uids: list[str],
    ) -> list[dict[str, Any]]:
        """Fetch transactions for all accounts, return in Transaction format.

        Returns list of dicts with keys: external_transaction_id, amount,
        currency, description, transaction_date, source_external_id.
        """
        all_txns: list[dict[str, Any]] = []

        for uid in account_uids:
            try:
                raw_txns = await self.get_account_transactions(uid)
            except Exception as exc:
                logger.warning(
                    "Failed to fetch transactions for account %s: %s",
                    uid,
                    exc,
                )
                continue

            for txn in raw_txns:
                amount_obj = txn.get("transaction_amount", {})
                amount_str = amount_obj.get("amount", "0")
                currency = amount_obj.get("currency", "EUR")

                # Build description from available fields
                description_parts = []
                if txn.get("creditor_name"):
                    description_parts.append(txn["creditor_name"])
                elif txn.get("debtor_name"):
                    description_parts.append(txn["debtor_name"])
                if txn.get("remittance_information"):
                    description_parts.append(txn["remittance_information"])
                description = " — ".join(description_parts) if description_parts else None

                txn_id = txn.get("transaction_id") or txn.get("entry_reference")
                if not txn_id:
                    continue

                all_txns.append(
                    {
                        "external_transaction_id": txn_id,
                        "amount": Decimal(amount_str),
                        "currency": currency,
                        "description": description,
                        "transaction_date": (txn.get("booking_date") or txn.get("value_date")),
                        "source_external_id": uid,
                    }
                )

        return all_txns
