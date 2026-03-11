# PRD: T059 Unit Tests for Split Calculation Rules

## Introduction
Add unit tests for split calculation rules.

## Goals
- Validate split calculations across scenarios.
- Ensure rounding and edge cases are handled.

## User Stories

### US-001: Split calculation tests
**Description:** As a developer, I want split calculation unit tests so I can trust expense sharing logic.

**Acceptance Criteria:**
- [ ] `backend/tests/unit/test_split_rules.py` exists.
- [ ] Tests cover equal, custom, and edge-case splits.
- [ ] Tests are deterministic.

## Functional Requirements
- FR-1: Add unit tests for split rule logic.

## Non-Goals
- No integration tests.

## Success Metrics
- Split unit tests pass reliably.

## Assumptions
- Split rules are defined in transactions service.
