# PRD: T032 Implement Funding Sources Endpoints

## Status: DONE (2026-03-04)

## Implementation Notes

**File**: `backend/app/api/v1/funding_sources.py`

### Endpoints
- `GET /api/v1/funding-sources` — list all funding sources for the authenticated user
  - Optional `?asset_type=fiat|crypto` filter (currency-based classification)
  - Enriches each source with `provider_name` from parent integration
  - **Computes `balance_in_base_currency` (EUR)** using `get_rates_to_eur()` — fetches from CoinGecko on-demand if no cached rate exists
- `GET /api/v1/funding-sources/{id}` — single source detail
- `POST /api/v1/funding-sources/{id}/assign` — link source to a project
- `DELETE /api/v1/funding-sources/{id}/assign/{project_id}` — unlink source from project

### Key implementation details
- `current_balance` is stored as `NUMERIC` in PostgreSQL and serialized as a string in JSON responses. Frontend must parse with `Number()`.
- `balance_in_base_currency` is computed at query time, not stored. Uses `get_rates_to_eur()` for crypto→EUR conversion.
- Response model: `FundingSource` from `app.models.funding_sources`

## Acceptance Criteria
- [x] `backend/app/api/v1/funding_sources.py` includes funding source routes.
- [x] Endpoints return standardized response shapes.
- [x] `balance_in_base_currency` computed for all non-EUR sources.
