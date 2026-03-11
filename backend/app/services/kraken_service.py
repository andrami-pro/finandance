"""Kraken API service client.

Fetches account balances and ledger entries (transaction history).
Uses HMAC-SHA512 signed requests for private endpoints.

API docs: https://docs.kraken.com/rest/
"""

import base64
import hashlib
import hmac
import time
import urllib.parse
from decimal import Decimal
from typing import Any

import httpx


# Mapping from Kraken internal asset codes to standard symbols
_KRAKEN_ASSET_MAP: dict[str, str] = {
    "XXBT": "BTC",
    "XBT": "BTC",
    "XETH": "ETH",
    "ETH": "ETH",
    "XXRP": "XRP",
    "XRP": "XRP",
    "ZUSD": "USD",
    "ZEUR": "EUR",
    "ZGBP": "GBP",
    "USDT": "USDT",
    "USDC": "USDC",
    "DOT": "DOT",
    "SOL": "SOL",
    "ADA": "ADA",
    "MATIC": "MATIC",
}

_CRYPTO_ASSETS = {"BTC", "ETH", "XRP", "DOT", "SOL", "ADA", "MATIC", "USDT", "USDC"}
_KRAKEN_API_URL = "https://api.kraken.com"


class KrakenAPIError(Exception):
    """Raised when the Kraken API returns application-level errors."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(", ".join(errors))


def _normalize_asset(kraken_code: str) -> str:
    """Convert Kraken internal asset code to standard symbol."""
    return _KRAKEN_ASSET_MAP.get(kraken_code, kraken_code)


def _is_crypto(symbol: str) -> bool:
    return symbol in _CRYPTO_ASSETS


class KrakenService:
    """Async client for the Kraken private API."""

    def __init__(self, api_key: str, api_secret: str) -> None:
        self._api_key = api_key
        self._api_secret = api_secret

    def _sign(self, uri_path: str, data: dict[str, str]) -> str:
        """Generate HMAC-SHA512 signature for a Kraken private request."""
        postdata = urllib.parse.urlencode(data)
        encoded = (data["nonce"] + postdata).encode()
        message = uri_path.encode() + hashlib.sha256(encoded).digest()
        mac = hmac.new(base64.b64decode(self._api_secret), message, hashlib.sha512)
        return base64.b64encode(mac.digest()).decode()

    async def _private_post(self, endpoint: str, params: dict[str, str] | None = None) -> Any:
        uri_path = f"/0/private/{endpoint}"
        nonce = str(int(time.time() * 1000))
        data: dict[str, str] = {"nonce": nonce}
        if params:
            data.update(params)

        headers = {
            "API-Key": self._api_key,
            "API-Sign": self._sign(uri_path, data),
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{_KRAKEN_API_URL}{uri_path}",
                data=data,
                headers=headers,
            )
        resp.raise_for_status()
        body = resp.json()
        if body.get("error"):
            raise KrakenAPIError(body["error"])
        return body["result"]

    async def get_funding_sources(self) -> list[dict[str, Any]]:
        """Return funding source dicts from Kraken account balances.

        Filters out zero balances. Maps Kraken asset codes to standard symbols.
        """
        result = await self._private_post("Balance")
        sources: list[dict[str, Any]] = []
        for kraken_code, balance_str in result.items():
            balance = Decimal(balance_str)
            if balance == 0:
                continue
            symbol = _normalize_asset(kraken_code)
            sources.append(
                {
                    "external_source_id": kraken_code,
                    "name": f"{symbol} Balance",
                    "asset_type": "crypto" if _is_crypto(symbol) else "fiat",
                    "currency": symbol,
                    "current_balance": balance,
                }
            )
        return sources

    async def get_transactions(
        self,
        start: int | None = None,
        end: int | None = None,
    ) -> list[dict[str, Any]]:
        """Return transaction dicts from Kraken ledger entries."""
        params: dict[str, str] = {}
        if start is not None:
            params["start"] = str(start)
        if end is not None:
            params["end"] = str(end)

        result = await self._private_post("Ledgers", params)
        ledger = result.get("ledger", {})

        txns: list[dict[str, Any]] = []
        for ledger_id, entry in ledger.items():
            asset = _normalize_asset(entry.get("asset", ""))
            txns.append(
                {
                    "external_transaction_id": ledger_id,
                    "amount": Decimal(entry.get("amount", "0")),
                    "currency": asset,
                    "description": entry.get("type"),
                    "transaction_date": entry.get("time"),
                }
            )
        return txns
