# PRD: T066 Integration Tests for Auth + 2FA

## Introduction
Add integration tests for signup/login and 2FA endpoints.

## Goals
- Validate auth and 2FA API flows.
- Ensure recovery flow works.

## User Stories

### US-001: Auth + 2FA integration tests
**Description:** As a developer, I want integration tests for auth and 2FA so security flows are validated.

**Acceptance Criteria:**
- [ ] `backend/tests/integration/test_auth_2fa.py` exists.
- [ ] Tests cover signup, login, 2FA setup, verify, and recovery.

## Functional Requirements
- FR-1: Add integration tests for auth endpoints.
- FR-2: Add integration tests for 2FA flows.

## Non-Goals
- No frontend tests.

## Success Metrics
- Integration tests pass with test auth provider.

## Assumptions
- Auth endpoints exist per plan.
