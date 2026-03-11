# PRD: T053 Implement Transactions Query Service

## Introduction
Implement backend service to query paginated transactions.

## Goals
- Provide paginated transaction retrieval.
- Support filtering as defined in specs.

## User Stories

### US-001: Transactions query service
**Description:** As a developer, I want a transactions query service so the API can return paginated data efficiently.

**Acceptance Criteria:**
- [ ] `backend/app/services/transactions_service.py` includes query methods.
- [ ] Pagination parameters are supported.
- [ ] Sorting and filtering align with specs.

## Functional Requirements
- FR-1: Implement paginated query.
- FR-2: Add filter/sort options.

## Non-Goals
- No split logic (handled in US4).

## Success Metrics
- Queries return correct page sizes and order.

## Assumptions
- DB indexes exist for query performance.
