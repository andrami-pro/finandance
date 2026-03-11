"""Exchange rate service.

Fetches currency conversion rates and converts amounts to a base currency (EUR).

Data sources:
- Fiat: ECB Data Portal (free, EU-based, no API key)
- Crypto: CoinGecko public API (free tier)

Rates are cached in the `exchange_rates` Supabase table (TTL: 1 hour).
APScheduler refreshes rates every 30 minutes via refresh_exchange_rates().

Usage:
    rate_service = ExchangeRateService(supabase_client)
    eur_amount = await rate_service.convert_to_base(Decimal("100"), "USD")
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_RATE_TTL_HOURS = 1

# CoinGecko coin ID mapping
_CRYPTO_COINGECKO_IDS: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "XRP": "ripple",
    "SOL": "solana",
    "DOT": "polkadot",
    "ADA": "cardano",
    "MATIC": "matic-network",
    "USDT": "tether",
    "USDC": "usd-coin",
}


class ExchangeRateError(Exception):
    """Raised when exchange rates cannot be fetched or converted."""


# ---------------------------------------------------------------------------
# Synchronous helper — simple, reliable, no async needed
# ---------------------------------------------------------------------------


def get_rates_to_eur(client: Any, currencies: set[str]) -> dict[str, Decimal]:
    """Return {currency: rate_to_EUR} for the given currencies.

    1. Check the exchange_rates table for cached rates (< 1h old).
    2. For any missing crypto, fetch from CoinGecko synchronously.
    3. For any missing fiat, assume unavailable (ECB rates are bulk-refreshed).

    Uses the service-role client so RLS is bypassed.
    """
    if not currencies:
        return {}

    non_eur = {c.upper() for c in currencies if c.upper() != "EUR"}
    if not non_eur:
        return {}

    # 1. Check DB cache
    ttl_cutoff = (datetime.now(tz=timezone.utc) - timedelta(hours=_RATE_TTL_HOURS)).isoformat()

    result = (
        client.table("exchange_rates")
        .select("from_currency,rate")
        .in_("from_currency", list(non_eur))
        .eq("to_currency", "EUR")
        .gte("fetched_at", ttl_cutoff)
        .execute()
    )
    rates: dict[str, Decimal] = {}
    for r in result.data or []:
        rates[r["from_currency"]] = Decimal(str(r["rate"]))

    # 2. Fetch missing crypto rates from CoinGecko
    missing = non_eur - set(rates.keys())
    missing_crypto = {c for c in missing if c in _CRYPTO_COINGECKO_IDS}
    if missing_crypto:
        coin_ids = [_CRYPTO_COINGECKO_IDS[c] for c in missing_crypto]
        id_to_symbol = {v: k for k, v in _CRYPTO_COINGECKO_IDS.items() if k in missing_crypto}
        settings = get_settings()
        try:
            resp = httpx.get(
                f"{settings.coingecko_api_url}/simple/price",
                params={"ids": ",".join(coin_ids), "vs_currencies": "eur"},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                now = datetime.now(tz=timezone.utc).isoformat()
                for coin_id, prices in data.items():
                    symbol = id_to_symbol.get(coin_id)
                    eur_price = prices.get("eur")
                    if symbol and eur_price is not None:
                        rate = Decimal(str(eur_price))
                        rates[symbol] = rate
                        # Cache in DB (best-effort)
                        try:
                            client.table("exchange_rates").upsert(
                                {
                                    "from_currency": symbol,
                                    "to_currency": "EUR",
                                    "rate": str(rate),
                                    "fetched_at": now,
                                },
                                on_conflict="from_currency,to_currency",
                            ).execute()
                        except Exception:
                            pass  # Cache write failure is non-critical
        except Exception as exc:
            logger.warning("CoinGecko fetch failed for %s: %s", missing_crypto, exc)

    return rates


class ExchangeRateService:
    """Fetches and caches exchange rates; converts amounts to EUR."""

    def __init__(self, supabase_client: Any) -> None:
        self._client = supabase_client
        settings = get_settings()
        self._ecb_url = settings.ecb_api_url
        self._coingecko_url = settings.coingecko_api_url

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def convert_to_base(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str = "EUR",
    ) -> Decimal:
        """Convert *amount* from *from_currency* to *to_currency* (default EUR).

        Raises ExchangeRateError if the rate is unavailable.
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()

        if from_currency == to_currency:
            return amount

        rate = await self._get_rate(from_currency, to_currency)
        return amount * rate

    async def refresh_all_rates(self) -> None:
        """Fetch and cache current fiat + crypto rates. Called by APScheduler."""
        await self._refresh_fiat_rates()
        await self._refresh_crypto_rates()

    # ------------------------------------------------------------------
    # Rate retrieval
    # ------------------------------------------------------------------

    async def _get_rate(self, from_currency: str, to_currency: str) -> Decimal:
        """Return conversion rate from DB cache, refreshing if stale."""
        cached = self._get_cached_rate(from_currency, to_currency)
        if cached is not None:
            return cached

        # Cache miss or stale — attempt to refresh
        if from_currency in _CRYPTO_COINGECKO_IDS:
            await self._refresh_crypto_rates([from_currency])
        else:
            await self._refresh_fiat_rates()

        rate = self._get_cached_rate(from_currency, to_currency)
        if rate is None:
            raise ExchangeRateError(f"No exchange rate available for {from_currency}/{to_currency}")
        return rate

    def _get_cached_rate(self, from_currency: str, to_currency: str) -> Decimal | None:
        """Check DB for a non-stale rate. Returns None if not found or expired."""
        ttl_cutoff = (datetime.now(tz=timezone.utc) - timedelta(hours=_RATE_TTL_HOURS)).isoformat()

        result = (
            self._client.table("exchange_rates")
            .select("rate,fetched_at")
            .eq("from_currency", from_currency)
            .eq("to_currency", to_currency)
            .gte("fetched_at", ttl_cutoff)
            .maybe_single()
            .execute()
        )
        if result.data is None:
            return None
        return Decimal(str(result.data["rate"]))

    # ------------------------------------------------------------------
    # Fiat rates (ECB)
    # ------------------------------------------------------------------

    async def _refresh_fiat_rates(self) -> None:
        """Fetch EUR-based fiat rates from ECB and upsert into exchange_rates."""
        settings = get_settings()
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    settings.ecb_api_url,
                    params={
                        "format": "jsondata",
                        "detail": "dataonly",
                    },
                )
            if resp.status_code != 200:
                logger.warning("ECB API returned %d, skipping fiat refresh", resp.status_code)
                return

            data = resp.json()
            # ECB returns rates as USD_EUR, GBP_EUR, etc. (vs EUR)
            # We store from_currency→EUR rates
            series = data.get("dataSets", [{}])[0].get("series", {})
            dimensions = data.get("structure", {}).get("dimensions", {}).get("series", [])

            # Find currency dimension index
            currency_dim: list[dict[str, Any]] = []
            for dim in dimensions:
                if dim.get("id") == "CURRENCY":
                    currency_dim = dim.get("values", [])
                    break

            now = datetime.now(tz=timezone.utc).isoformat()
            for key, series_data in series.items():
                parts = key.split(":")
                if not parts or not currency_dim:
                    continue
                try:
                    currency_idx = int(parts[1])
                    currency = currency_dim[currency_idx]["id"]
                except (IndexError, ValueError, KeyError):
                    continue

                obs = series_data.get("observations", {})
                if not obs:
                    continue

                # Latest observation (highest index key)
                latest_key = max(obs.keys(), key=int)
                rate_val = obs[latest_key][0]
                if rate_val is None:
                    continue

                self._upsert_rate(currency, "EUR", Decimal(str(rate_val)), now)

        except Exception as exc:
            logger.warning("Fiat rate refresh failed: %s", exc)

    # ------------------------------------------------------------------
    # Crypto rates (CoinGecko)
    # ------------------------------------------------------------------

    async def _refresh_crypto_rates(self, currencies: list[str] | None = None) -> None:
        """Fetch crypto→EUR rates from CoinGecko and upsert into exchange_rates."""
        if currencies is None:
            currencies = list(_CRYPTO_COINGECKO_IDS.keys())

        coin_ids = [_CRYPTO_COINGECKO_IDS[c] for c in currencies if c in _CRYPTO_COINGECKO_IDS]
        if not coin_ids:
            return

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self._coingecko_url}/simple/price",
                    params={
                        "ids": ",".join(coin_ids),
                        "vs_currencies": "eur",
                    },
                )
            if resp.status_code != 200:
                logger.warning(
                    "CoinGecko API returned %d, skipping crypto refresh", resp.status_code
                )
                return

            data = resp.json()
            now = datetime.now(tz=timezone.utc).isoformat()

            # Reverse map: coingecko_id → symbol
            id_to_symbol = {v: k for k, v in _CRYPTO_COINGECKO_IDS.items()}

            for coin_id, prices in data.items():
                symbol = id_to_symbol.get(coin_id)
                if not symbol:
                    continue
                eur_price = prices.get("eur")
                if eur_price is None:
                    continue
                self._upsert_rate(symbol, "EUR", Decimal(str(eur_price)), now)

        except Exception as exc:
            logger.warning("Crypto rate refresh failed: %s", exc)

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    def _upsert_rate(
        self,
        from_currency: str,
        to_currency: str,
        rate: Decimal,
        fetched_at: str,
    ) -> None:
        self._client.table("exchange_rates").upsert(
            {
                "from_currency": from_currency,
                "to_currency": to_currency,
                "rate": str(rate),
                "fetched_at": fetched_at,
            },
            on_conflict="from_currency,to_currency",
        ).execute()
