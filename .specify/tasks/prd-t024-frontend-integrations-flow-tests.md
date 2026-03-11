# PRD: T024 Frontend Integration Flow Tests

## Introduction
Add frontend integration tests for connect and polling UI flow.

## Goals
- Validate integration UI flow.
- Ensure polling states are handled.

## User Stories

### US-001: Integration UI tests
**Description:** As a developer, I want frontend integration tests so I can verify connect and polling behavior.

**Acceptance Criteria:**
- [ ] `frontend/tests/integration/integrations.test.tsx` exists.
- [ ] Tests cover connect modal and polling UI.
- [ ] Network calls are mocked.
- [ ] Typecheck passes.

## Functional Requirements
- FR-1: Add tests for connect and sync status UI.
- FR-2: Mock API client responses.

## Non-Goals
- No backend validation.

## Success Metrics
- Tests pass in CI.

## Assumptions
- UI components exist per plan.
