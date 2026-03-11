# PRD: T023 Integration Tests for Connect/Sync/Jobs

## Introduction
Add integration tests for connect, sync, and jobs endpoints.

## Goals
- Validate API endpoints for integration flow.
- Verify job status transitions.

## User Stories

### US-001: Integration flow tests
**Description:** As a developer, I want integration tests so I can validate the connect and sync flow end-to-end.

**Acceptance Criteria:**
- [ ] `backend/tests/integration/test_integrations.py` exists.
- [ ] Tests cover connect, sync, and jobs endpoints.
- [ ] Job status transitions are asserted.

## Functional Requirements
- FR-1: Create integration tests with seeded data.
- FR-2: Validate job completion statuses.

## Non-Goals
- No frontend tests.

## Success Metrics
- Integration tests pass against test DB.

## Assumptions
- Integration endpoints exist per plan.
