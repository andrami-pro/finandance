# PRD: T065 Unit Tests for Recovery Codes

## Introduction
Add unit tests for recovery code generation and verification.

## Goals
- Validate recovery code creation and validation.
- Ensure codes are single-use if specified.

## User Stories

### US-001: Recovery code tests
**Description:** As a developer, I want unit tests for recovery codes so 2FA recovery is reliable.

**Acceptance Criteria:**
- [ ] `backend/tests/unit/test_recovery_codes.py` exists.
- [ ] Tests cover generation, verification, and invalid cases.
- [ ] Tests are deterministic.

## Functional Requirements
- FR-1: Add unit tests for recovery code logic.

## Non-Goals
- No integration tests.

## Success Metrics
- Recovery code unit tests pass.

## Assumptions
- Recovery code service exists in backend.
