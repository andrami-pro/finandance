# PRD: T026 Implement Wise Service Client

## Introduction
Implement the Wise service client for integration syncing.

## Goals
- Provide a client to call Wise APIs.
- Normalize responses for internal use.

## User Stories

### US-001: Wise client
**Description:** As a developer, I want a Wise client so I can fetch accounts and transactions.

**Acceptance Criteria:**
- [ ] `backend/app/services/wise_service.py` exists.
- [ ] Client methods cover required endpoints.
- [ ] HTTP errors are handled consistently.

## Functional Requirements
- FR-1: Implement API calls for accounts and transactions.
- FR-2: Normalize response data shapes.

## Non-Goals
- No job orchestration.

## Success Metrics
- Client can be used by sync jobs with mocked responses.

## Assumptions
- Wise API details are defined in specs.

## Status Notes

**Status: In Progress** (core client implemented, direction detection fixed 2026-03-03)

### Wise Transaction Direction Detection Fix (2026-03-03)

The IN/OUT direction detection for Wise transactions was broken and has been fixed.

**Problem:** The original approach used `creator_user_id == wise_user_id` to determine
direction, but this was always true for all transfers (the authenticated user is always
the creator). Two alternative approaches were also attempted and failed:
- Activities endpoint (`/v4/.../activities`) returned 404 (deprecated or unavailable).
- Balance Statement endpoint returned 403/SCA (requires Strong Customer Authentication
  not available via API tokens).

**Solution:** Compare `targetAccount` from `/v1/transfers` against `recipientId` from
`/v1/borderless-accounts`:
- `targetAccount == recipientId` -> IN (money arriving to own borderless account)
- `targetAccount != recipientId` -> OUT (money sent to external recipient)

**Files changed:**
- `backend/app/services/wise_service.py` — replaced `_get_user_id()` with
  `_get_recipient_id()`, removed `get_activities()` and `WiseSCAError`,
  `get_transactions()` now returns `(recipient_id, transfers)` tuple.
- Deleted `backend/diag_wise.py` (temporary diagnostic script).
