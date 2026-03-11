# PRD: T055 Implement Transactions Endpoints

## Status: DONE (2026-03-02)

## Introduction
Create API endpoints for transactions list with pagination, date filtering, and summary aggregates.

## Goals
- Expose transactions endpoints for frontend use.

## User Stories

### US-001: Transactions API endpoints
**Description:** As a developer, I want transactions endpoints so the UI can list and view transaction data.

**Acceptance Criteria:**
- [x] `backend/app/api/v1/transactions.py` defines transaction routes.
- [x] Endpoints support pagination and filters.
- [x] Responses match standard API shapes.

## Implementation Details

### Endpoint
`GET /api/v1/transactions?page=1&limit=20&since=ISO&until=ISO`

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number (1-indexed) |
| `limit` | int | 20 | Items per page (max 100) |
| `since` | string? | null | Start date filter (ISO 8601, inclusive) |
| `until` | string? | null | End date filter (ISO 8601, inclusive) |

### Response Model (`TransactionsResponse`)
```json
{
  "items": [TransactionItem],
  "summary": { "total_inflows", "total_outflows", "net_cashflow", "currency" },
  "page": 1,
  "limit": 20,
  "total": 42
}
```

### Query Strategy (3 sequential queries via Supabase service-role client)
1. Get user's `funding_sources` by `user_id` → build source_id list + name lookup
2. Get `integrations` for those sources → build provider_name lookup
3. Get `transactions` filtered by source_ids + date range, ordered by `transaction_date` desc, with `count="exact"` for pagination
4. Compute summary: fetch all amounts within the same date range, sum positive (inflows) and negative (outflows)
5. Enrich items with `source_name` + `provider_name`

### Files
- `backend/app/models/transactions.py` — Pydantic models: `TransactionItem`, `TransactionSummary`, `TransactionsResponse`
- `backend/app/api/v1/transactions.py` — Endpoint + `_apply_date_filters()` helper
- `backend/app/main.py` — Router registration

### Design Decisions
- No separate `transactions_service.py` — query logic lives in the endpoint for simplicity (extract later if needed)
- Summary is scoped to the same `since`/`until` range as the paginated items
- Date filters use Supabase `.gte()` / `.lte()` on `transaction_date`

## Non-Goals
- No split endpoints (handled in US4).

## Success Metrics
- Endpoints pass integration tests.
