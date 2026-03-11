# PRD: T037 Unit Tests for Project Balance Calculation

## Introduction
Add unit tests to validate project balance calculation logic.

## Goals
- Ensure balance calculation rules are correct.
- Validate currency conversion handling if applicable.

## User Stories

### US-001: Project balance tests
**Description:** As a developer, I want unit tests for project balance calculations so I can trust financial totals.

**Acceptance Criteria:**
- [ ] `backend/tests/unit/test_project_balances.py` exists.
- [ ] Tests cover allocations, contributions, and currency conversion scenarios.
- [ ] Tests are deterministic.

## Functional Requirements
- FR-1: Add unit tests for balance calculations.
- FR-2: Cover edge cases (zero balances, multiple sources).

## Non-Goals
- No integration tests.

## Success Metrics
- All balance unit tests pass.

## Assumptions
- Balance logic is defined in project service.
