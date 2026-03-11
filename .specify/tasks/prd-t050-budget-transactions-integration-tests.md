# PRD: T050 Integration Tests for Budget + Transactions

## Introduction
Add integration tests for budget summary and transactions endpoints.

## Goals
- Validate budget and transactions endpoints end-to-end.
- Ensure pagination and performance expectations are met.

## User Stories

### US-001: Budget and transactions tests
**Description:** As a developer, I want integration tests so budget and transactions APIs are validated.

**Acceptance Criteria:**
- [ ] `backend/tests/integration/test_budget_transactions.py` exists.
- [ ] Tests cover budget summary and paginated transactions.
- [ ] Responses match expected shapes.

## Functional Requirements
- FR-1: Add integration tests for budget endpoints.
- FR-2: Add integration tests for transactions endpoints.

## Non-Goals
- No frontend tests.

## Success Metrics
- Tests pass against test DB.

## Assumptions
- Endpoints exist per plan.
