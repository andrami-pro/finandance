# PRD: T076 Add CI Pipeline for Backend/Frontend Tests

## Introduction
Add a CI workflow to run backend and frontend tests.

## Goals
- Create a CI pipeline for tests.

## User Stories

### US-001: CI pipeline
**Description:** As a developer, I want CI to run tests so regressions are caught automatically.

**Acceptance Criteria:**
- [ ] `.github/workflows/ci.yml` exists.
- [ ] Backend and frontend tests run in CI.

## Functional Requirements
- FR-1: Configure CI workflow steps.
- FR-2: Cache dependencies if appropriate.

## Non-Goals
- No deployment steps.

## Success Metrics
- CI workflow completes successfully on test branch.

## Assumptions
- GitHub Actions is the CI platform.
