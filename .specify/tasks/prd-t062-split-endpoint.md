# PRD: T062 Implement Split Endpoint

## Introduction
Add backend endpoint for transaction splits.

## Goals
- Expose split update endpoint.

## User Stories

### US-001: Split endpoint
**Description:** As a developer, I want a split endpoint so the UI can update transaction splits.

**Acceptance Criteria:**
- [ ] `backend/app/api/v1/transactions.py` includes split endpoint.
- [ ] Endpoint validates permissions and input.

## Functional Requirements
- FR-1: Add split update endpoint.

## Non-Goals
- No UI changes.

## Success Metrics
- Endpoint passes integration tests.

## Assumptions
- Transactions service has split logic.
