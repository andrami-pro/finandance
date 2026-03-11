# PRD: T051 Frontend Budget/Transactions Page Tests

## Introduction
Add frontend tests for budget summary and transactions UI pages.

## Goals
- Validate UI rendering for budget and transactions.
- Ensure pagination behavior is covered.

## User Stories

### US-001: Budget and transactions UI tests
**Description:** As a developer, I want frontend tests so budget and transactions pages are verified.

**Acceptance Criteria:**
- [ ] `frontend/tests/integration/budget_transactions.test.tsx` exists.
- [ ] Tests cover budget summary render and transactions table pagination.
- [ ] API calls are mocked.
- [ ] Typecheck passes.

## Functional Requirements
- FR-1: Add tests for budget summary UI.
- FR-2: Add tests for transactions table UI.

## Non-Goals
- No backend validation.

## Success Metrics
- Tests pass in CI.

## Assumptions
- UI components exist.
