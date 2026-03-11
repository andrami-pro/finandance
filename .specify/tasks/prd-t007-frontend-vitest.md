# PRD: T007 Configure Frontend Tests with Vitest

## Introduction
Set up frontend testing with Vitest and add scripts in `frontend/package.json`.

## Goals
- Configure Vitest to run component and integration tests.
- Add test scripts to `frontend/package.json`.

## User Stories

### US-001: Frontend test configuration
**Description:** As a developer, I want Vitest configured so I can run frontend tests consistently.

**Acceptance Criteria:**
- [ ] `frontend/vitest.config.ts` exists with baseline configuration.
- [ ] `frontend/package.json` includes test scripts (e.g., `test`, `test:watch`).
- [ ] Typecheck passes.

## Functional Requirements
- FR-1: Add Vitest configuration file.
- FR-2: Add test-related scripts to `frontend/package.json`.
- FR-3: Ensure config supports React/TSX tests.

## Non-Goals
- No test cases added in this task.

## Design Considerations
- Align with Next.js 14 testing best practices.

## Technical Considerations
- Ensure jest-dom or testing-library setup only if required by plan.

## Success Metrics
- `npm run test` succeeds in an empty test suite.

## Open Questions
- None.

## Assumptions
- Vitest is the agreed test runner.
