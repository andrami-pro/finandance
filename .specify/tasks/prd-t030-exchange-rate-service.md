# PRD: T030 Implement Exchange Rate Service

## Status: DONE (2026-03-04)

## Implementation Notes

**File**: `backend/app/services/exchange_rate_service.py`

### ExchangeRateService (async, class-based)
- `convert_to_base(amount, from_currency, to_currency="EUR")` — async conversion
- `refresh_all_rates()` — called by APScheduler every 30 min
- `_get_rate()` / `_get_cached_rate()` — DB cache with 1h TTL
- `_refresh_fiat_rates()` — ECB Data Portal (free, EU-based)
- `_refresh_crypto_rates()` — CoinGecko public API (free tier)
- `_upsert_rate()` — writes to `exchange_rates` table with `on_conflict`

### get_rates_to_eur() (sync, standalone function)
Added 2026-03-04 to provide a simple synchronous alternative for use in sync endpoints and services.
- Checks `exchange_rates` DB cache (< 1h old)
- For missing crypto rates, fetches from CoinGecko synchronously via `httpx.get()`
- Caches results in DB (best-effort, non-blocking)
- Used by: `funding_sources.py` endpoint, `project_service._compute_project_balance()`

### Data sources
- Fiat: ECB Data Portal (`https://data-api.ecb.europa.eu/service/data/EXR`)
- Crypto: CoinGecko (`https://api.coingecko.com/api/v3/simple/price`)
- Supported crypto: BTC, ETH, XRP, SOL, DOT, ADA, MATIC, USDT, USDC

### DB table
- `exchange_rates` — columns: `from_currency`, `to_currency`, `rate`, `fetched_at`
- Unique index on `(from_currency, to_currency)`

## Acceptance Criteria
- [x] `backend/app/services/exchange_rate_service.py` exists.
- [x] Service can fetch rates and convert amounts.
- [x] Errors are handled gracefully.
- [x] Sync helper `get_rates_to_eur()` available for non-async callers.
