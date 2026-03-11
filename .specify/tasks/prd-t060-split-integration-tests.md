# PRD: T060 Integration Tests for Split Endpoint

## Introduction
Add integration tests for the transaction split endpoint.

## Goals
- Validate split API behavior.
- Ensure persistence of split data.

## User Stories

### US-001: Split endpoint tests
**Description:** As a developer, I want integration tests for the split endpoint so the API behavior is verified.

**Acceptance Criteria:**
- [ ] `backend/tests/integration/test_transaction_split.py` exists.
- [ ] Tests cover split create/update and validation errors.

## Functional Requirements
- FR-1: Add integration tests for split endpoint.

## Non-Goals
- No frontend tests.

## Success Metrics
- Integration tests pass against test DB.

## Assumptions
- Split endpoint exists per plan.
