"""Unit tests for Wise, Kraken, and Ledger service clients.

Uses respx to mock HTTP calls — no real network requests are made.
TDD: written before implementation exists; tests define expected behavior.
"""

import base64
from decimal import Decimal

import httpx
import pytest
import respx

# KrakenService._sign() requires a valid base64-encoded secret
_KRAKEN_TEST_SECRET = base64.b64encode(b"test-kraken-secret-key-for-unit-testing").decode()


# ---------------------------------------------------------------------------
# Wise Service Tests
# ---------------------------------------------------------------------------


class TestWiseService:
    @respx.mock
    async def test_get_balances_returns_funding_sources(self):
        """Wise /v1/borderless-accounts should return mapped FundingSource dicts."""
        from app.services.wise_service import WiseService

        respx.get("https://api.transferwise.com/v1/profiles").mock(
            return_value=httpx.Response(200, json=[{"id": 11111, "type": "personal"}])
        )
        respx.get("https://api.transferwise.com/v4/profiles/11111/balances").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": 99,
                        "type": "STANDARD",
                        "currency": "EUR",
                        "amount": {"value": 1234.56, "currency": "EUR"},
                        "name": "EUR Jar",
                    }
                ],
            )
        )

        service = WiseService(api_key="test-key")
        sources = await service.get_funding_sources()

        assert len(sources) == 1
        assert sources[0]["external_source_id"] == "99"
        assert sources[0]["currency"] == "EUR"
        assert sources[0]["current_balance"] == Decimal("1234.56")
        assert sources[0]["name"] == "EUR Jar"
        assert sources[0]["asset_type"] == "fiat"

    @respx.mock
    async def test_get_balances_empty_list(self):
        from app.services.wise_service import WiseService

        respx.get("https://api.transferwise.com/v1/profiles").mock(
            return_value=httpx.Response(200, json=[{"id": 22222, "type": "personal"}])
        )
        respx.get("https://api.transferwise.com/v4/profiles/22222/balances").mock(
            return_value=httpx.Response(200, json=[])
        )
        service = WiseService(api_key="test-key")
        sources = await service.get_funding_sources()
        assert sources == []

    @respx.mock
    async def test_get_transactions_returns_mapped_list(self):
        from app.services.wise_service import WiseService

        respx.get("https://api.transferwise.com/v1/profiles").mock(
            return_value=httpx.Response(200, json=[{"id": 11111, "type": "personal"}])
        )
        respx.get(
            "https://api.transferwise.com/v3/profiles/11111/borderless-accounts/99/statement.json"
        ).mock(
            return_value=httpx.Response(
                200,
                json={
                    "transactions": [
                        {
                            "type": "DEBIT",
                            "date": "2026-02-20T10:00:00Z",
                            "amount": {"value": -50.00, "currency": "EUR"},
                            "details": {"description": "Coffee shop"},
                            "referenceNumber": "TXN-001",
                        }
                    ]
                },
            )
        )
        service = WiseService(api_key="test-key")
        txns = await service.get_transactions(balance_id="99")
        assert len(txns) == 1
        assert txns[0]["external_transaction_id"] == "TXN-001"
        assert txns[0]["amount"] == Decimal("-50.00")
        assert txns[0]["currency"] == "EUR"
        assert txns[0]["description"] == "Coffee shop"

    @respx.mock
    async def test_invalid_api_key_raises(self):
        from app.services.wise_service import WiseService, WiseAuthError

        respx.get("https://api.transferwise.com/v1/profiles").mock(
            return_value=httpx.Response(401, json={"errors": [{"code": "UNAUTHORIZED"}]})
        )
        service = WiseService(api_key="bad-key")
        with pytest.raises(WiseAuthError):
            await service.get_funding_sources()


# ---------------------------------------------------------------------------
# Kraken Service Tests
# ---------------------------------------------------------------------------


class TestKrakenService:
    @respx.mock
    async def test_get_balances_returns_funding_sources(self):
        from app.services.kraken_service import KrakenService

        respx.post("https://api.kraken.com/0/private/Balance").mock(
            return_value=httpx.Response(
                200,
                json={
                    "error": [],
                    "result": {
                        "XXBT": "0.50000000",
                        "ZUSD": "10000.0000",
                        "ZEUR": "5000.0000",
                    },
                },
            )
        )
        service = KrakenService(api_key="test-key", api_secret=_KRAKEN_TEST_SECRET)
        sources = await service.get_funding_sources()
        assert len(sources) == 3
        btc = next(s for s in sources if s["currency"] in ("BTC", "XXBT", "XBT"))
        assert Decimal(str(btc["current_balance"])) > 0
        assert btc["asset_type"] == "crypto"

    @respx.mock
    async def test_kraken_api_error_raises(self):
        from app.services.kraken_service import KrakenService, KrakenAPIError

        respx.post("https://api.kraken.com/0/private/Balance").mock(
            return_value=httpx.Response(
                200,
                json={"error": ["EGeneral:Invalid key"], "result": {}},
            )
        )
        service = KrakenService(api_key="bad", api_secret=_KRAKEN_TEST_SECRET)
        with pytest.raises(KrakenAPIError):
            await service.get_funding_sources()

    @respx.mock
    async def test_get_ledger_entries_returns_transactions(self):
        from app.services.kraken_service import KrakenService

        respx.post("https://api.kraken.com/0/private/Ledgers").mock(
            return_value=httpx.Response(
                200,
                json={
                    "error": [],
                    "result": {
                        "ledger": {
                            "L001": {
                                "refid": "REF001",
                                "time": 1740000000.0,
                                "type": "trade",
                                "asset": "ZEUR",
                                "amount": "-100.0000",
                                "fee": "0.26",
                                "balance": "4900.0000",
                            }
                        },
                        "count": 1,
                    },
                },
            )
        )
        service = KrakenService(api_key="key", api_secret=_KRAKEN_TEST_SECRET)
        txns = await service.get_transactions()
        assert len(txns) >= 1
        assert txns[0]["external_transaction_id"] == "L001"
        assert txns[0]["amount"] == Decimal("-100.0000")


# ---------------------------------------------------------------------------
# Ledger (blockchain) Service Tests
# ---------------------------------------------------------------------------


class TestLedgerService:
    @respx.mock
    async def test_get_btc_balance(self):
        from app.services.ledger_service import LedgerService

        btc_address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        respx.get(f"https://mempool.space/api/address/{btc_address}").mock(
            return_value=httpx.Response(
                200,
                json={
                    "address": btc_address,
                    "chain_stats": {
                        "funded_txo_sum": 5000000,
                        "spent_txo_sum": 3000000,
                    },
                    "mempool_stats": {"funded_txo_sum": 0, "spent_txo_sum": 0},
                },
            )
        )
        service = LedgerService(public_address=btc_address, chain="BTC")
        sources = await service.get_funding_sources()
        assert len(sources) == 1
        # 5000000 - 3000000 = 2000000 satoshis = 0.02 BTC
        assert sources[0]["current_balance"] == Decimal("0.02000000")
        assert sources[0]["currency"] == "BTC"
        assert sources[0]["asset_type"] == "crypto"

    @respx.mock
    async def test_get_btc_transactions(self):
        from app.services.ledger_service import LedgerService

        btc_address = "bc1qtest"
        respx.get(f"https://mempool.space/api/address/{btc_address}/txs").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "txid": "txid123",
                        "status": {"confirmed": True, "block_time": 1740000000},
                        "vout": [{"scriptpubkey_address": btc_address, "value": 1000000}],
                        "vin": [],
                    }
                ],
            )
        )
        service = LedgerService(public_address=btc_address, chain="BTC")
        txns = await service.get_transactions()
        assert len(txns) >= 1
        assert txns[0]["external_transaction_id"] == "txid123"
        assert txns[0]["currency"] == "BTC"

    @respx.mock
    async def test_get_eth_balance(self):
        from app.services.ledger_service import LedgerService

        eth_address = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12"
        respx.get(
            "https://api.etherscan.io/api",
        ).mock(
            return_value=httpx.Response(
                200,
                json={"status": "1", "result": "1000000000000000000"},  # 1 ETH in wei
            )
        )
        service = LedgerService(public_address=eth_address, chain="ETH")
        sources = await service.get_funding_sources()
        assert len(sources) == 1
        assert sources[0]["currency"] == "ETH"
        assert sources[0]["current_balance"] == Decimal("1.000000000000000000")

    async def test_unsupported_chain_raises(self):
        from app.services.ledger_service import LedgerService, UnsupportedChainError

        service = LedgerService(public_address="some_address", chain="UNSUPPORTED")
        with pytest.raises(UnsupportedChainError):
            await service.get_funding_sources()
