# PRD: T067 Frontend Auth Flow Tests

## Introduction
Add frontend tests for signup/login and 2FA UI flows.

## Goals
- Validate auth UI behavior.
- Ensure 2FA screens render and validate.

## User Stories

### US-001: Auth UI tests
**Description:** As a developer, I want frontend auth flow tests so UI behavior is verified.

**Acceptance Criteria:**
- [ ] `frontend/tests/integration/auth_flow.test.tsx` exists.
- [ ] Tests cover signup, login, and 2FA screens.
- [ ] API calls are mocked.
- [ ] Typecheck passes.

## Functional Requirements
- FR-1: Add tests for signup/login UI.
- FR-2: Add tests for 2FA UI screens.

## Non-Goals
- No backend validation.

## Success Metrics
- Tests pass in CI.

## Assumptions
- UI components exist.
