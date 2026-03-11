# PRD: T022 Unit Tests for Provider Service Mapping

## Introduction
Add unit tests for provider service mapping with mocked HTTP calls.

## Goals
- Ensure provider mapping selects the correct service.
- Validate mocked provider responses.

## User Stories

### US-001: Provider mapping tests
**Description:** As a developer, I want unit tests for provider mapping so integrations choose the right client implementation.

**Acceptance Criteria:**
- [ ] `backend/tests/unit/test_integrations_services.py` exists.
- [ ] Tests cover mapping for Wise, Kraken, and Ledger.
- [ ] HTTP is mocked; no external calls.

## Functional Requirements
- FR-1: Mock service clients and responses.
- FR-2: Validate mapping logic returns expected client.

## Non-Goals
- No full integration flows.

## Success Metrics
- Tests pass without network access.

## Assumptions
- Service mapping exists in backend integration layer.

## Status Notes

**Note (2026-03-03):** The Wise service client API changed — `get_transactions()` now
returns a `(recipient_id, transfers)` tuple instead of a flat list, and `get_activities()`
/ `WiseSCAError` were removed. Any existing or future Wise service mapping tests must
account for this new return shape. See T026 status notes for details.
