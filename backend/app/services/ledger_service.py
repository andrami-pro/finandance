"""Ledger / cold-wallet blockchain service client.

Uses public blockchain APIs (no API key needed):
- BTC: Mempool.space (https://mempool.space/api)
- ETH: Etherscan public API (free tier, no key for basic balance)

No private keys are ever handled — only public addresses.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import httpx

_MEMPOOL_URL = "https://mempool.space/api"
_ETHERSCAN_URL = "https://api.etherscan.io/api"

# Satoshi to BTC
_SATS_PER_BTC = Decimal("100000000")
# Wei to ETH
_WEI_PER_ETH = Decimal("1000000000000000000")


class UnsupportedChainError(Exception):
    """Raised when the requested blockchain chain is not supported."""


class LedgerService:
    """Async blockchain balance reader for BTC and ETH public addresses."""

    def __init__(self, public_address: str, chain: str) -> None:
        self._address = public_address
        self._chain = chain.upper()

    async def get_funding_sources(self) -> list[dict[str, Any]]:
        """Return a list with a single funding source dict for this address."""
        if self._chain == "BTC":
            return await self._get_btc_sources()
        elif self._chain == "ETH":
            return await self._get_eth_sources()
        else:
            raise UnsupportedChainError(
                f"Chain '{self._chain}' is not supported. Supported: BTC, ETH"
            )

    async def get_transactions(self) -> list[dict[str, Any]]:
        """Return a list of transaction dicts for this address."""
        if self._chain == "BTC":
            return await self._get_btc_transactions()
        elif self._chain == "ETH":
            return await self._get_eth_transactions()
        else:
            raise UnsupportedChainError(
                f"Chain '{self._chain}' is not supported. Supported: BTC, ETH"
            )

    # ------------------------------------------------------------------
    # BTC
    # ------------------------------------------------------------------

    async def _get_btc_sources(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{_MEMPOOL_URL}/address/{self._address}")
        resp.raise_for_status()
        data = resp.json()

        chain_stats = data.get("chain_stats", {})
        mempool_stats = data.get("mempool_stats", {})

        funded = chain_stats.get("funded_txo_sum", 0) + mempool_stats.get("funded_txo_sum", 0)
        spent = chain_stats.get("spent_txo_sum", 0) + mempool_stats.get("spent_txo_sum", 0)
        balance_sats = funded - spent
        balance_btc = Decimal(str(balance_sats)) / _SATS_PER_BTC

        return [
            {
                "external_source_id": self._address,
                "name": f"BTC Wallet ({self._address[:8]}…)",
                "asset_type": "crypto",
                "currency": "BTC",
                "current_balance": balance_btc,
            }
        ]

    async def _get_btc_transactions(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{_MEMPOOL_URL}/address/{self._address}/txs")
        resp.raise_for_status()
        raw_txns = resp.json()

        txns: list[dict[str, Any]] = []
        for txn in raw_txns:
            # Calculate net value for this address (outputs minus inputs)
            vout_sum = sum(
                o.get("value", 0)
                for o in txn.get("vout", [])
                if o.get("scriptpubkey_address") == self._address
            )
            vin_sum = sum(
                i.get("prevout", {}).get("value", 0)
                for i in txn.get("vin", [])
                if i.get("prevout", {}).get("scriptpubkey_address") == self._address
            )
            net_sats = vout_sum - vin_sum
            net_btc = Decimal(str(net_sats)) / _SATS_PER_BTC

            block_time = txn.get("status", {}).get("block_time")
            iso_time = (
                datetime.fromtimestamp(block_time, tz=timezone.utc).isoformat()
                if block_time
                else None
            )
            txns.append(
                {
                    "external_transaction_id": txn["txid"],
                    "source_external_id": self._address,
                    "amount": net_btc,
                    "currency": "BTC",
                    "description": f"BTC tx {txn['txid'][:12]}…",
                    "transaction_date": iso_time,
                }
            )
        return txns

    # ------------------------------------------------------------------
    # ETH
    # ------------------------------------------------------------------

    async def _get_eth_sources(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                _ETHERSCAN_URL,
                params={
                    "module": "account",
                    "action": "balance",
                    "address": self._address,
                    "tag": "latest",
                },
            )
        resp.raise_for_status()
        data = resp.json()

        balance_wei = Decimal(str(data.get("result", "0")))
        balance_eth = balance_wei / _WEI_PER_ETH

        return [
            {
                "external_source_id": self._address,
                "name": f"ETH Wallet ({self._address[:8]}…)",
                "asset_type": "crypto",
                "currency": "ETH",
                "current_balance": balance_eth,
            }
        ]

    async def _get_eth_transactions(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                _ETHERSCAN_URL,
                params={
                    "module": "account",
                    "action": "txlist",
                    "address": self._address,
                    "sort": "desc",
                    "page": "1",
                    "offset": "100",
                },
            )
        resp.raise_for_status()
        data = resp.json()

        txns: list[dict[str, Any]] = []
        for tx in data.get("result", []):
            value_wei = Decimal(str(tx.get("value", "0")))
            value_eth = value_wei / _WEI_PER_ETH

            # Determine sign: incoming = positive, outgoing = negative
            is_outgoing = tx.get("from", "").lower() == self._address.lower()
            amount = -value_eth if is_outgoing else value_eth

            raw_ts = tx.get("timeStamp")
            iso_time = (
                datetime.fromtimestamp(int(raw_ts), tz=timezone.utc).isoformat() if raw_ts else None
            )
            txns.append(
                {
                    "external_transaction_id": tx.get("hash"),
                    "source_external_id": self._address,
                    "amount": amount,
                    "currency": "ETH",
                    "description": tx.get("functionName") or "ETH transfer",
                    "transaction_date": iso_time,
                }
            )
        return txns
