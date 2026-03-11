# PRD: T042 Implement Project Services

## Status: DONE (2026-03-04)

## Implementation Notes

**File**: `backend/app/services/project_service.py`

Functions implemented:
- `create_project()` — insert project + OWNER member + link funding sources + invite emails (via auth admin API)
- `list_projects()` — projects where user is member, with computed balance and progress
- `get_project()` — full detail with members (profile + email from auth admin) and funding sources
- `update_project()` — owner-only partial update of fields + sync funding source links
- `delete_project()` — owner-only cascade delete (funding_sources → members → project)
- `invite_member()` — lookup user by email via auth admin, insert PENDING_INVITE
- `respond_to_invite()` — accept (→ MEMBER) or decline (→ delete row)
- `assign_funding_source()` — upsert link with optional allocated_amount
- `_compute_project_balance()` — **sum all linked funding source balances converted to EUR** (uses `get_rates_to_eur()` for crypto/fiat conversion)
- `_lookup_user_by_email()` — Supabase Auth Admin API lookup
- `_get_user_profile()` / `_get_user_email()` — helpers for member enrichment

### Balance computation (updated 2026-03-04)
`_compute_project_balance()` now converts ALL currencies to EUR before summing:
- Collects unique currencies from linked funding sources
- Fetches exchange rates via `get_rates_to_eur()` (DB cache + CoinGecko fallback)
- Uses `Decimal` arithmetic for precision
- Previously only summed EUR sources; non-EUR sources were ignored.

## Acceptance Criteria
- [x] All CRUD + invite lifecycle operations implemented.
- [x] Audit log written for PROJECT_CREATED, PROJECT_UPDATED, PROJECT_DELETED, PROJECT_MEMBER_INVITED, PROJECT_MEMBER_JOINED, PROJECT_FUNDING_SOURCE_ASSIGNED.
- [x] `_compute_project_balance()` converts crypto/fiat to EUR using exchange rates.
