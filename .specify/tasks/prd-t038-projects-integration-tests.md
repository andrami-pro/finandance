# PRD: T038 Integration Tests for Projects + Invites + Assignments

## Introduction
Add integration tests for project creation, invites, and funding source assignments.

## Goals
- Validate project and invite endpoints end-to-end.
- Ensure assignment logic works in API flow.

## User Stories

### US-001: Project integration tests
**Description:** As a developer, I want integration tests for projects so I can validate the core project flow.

**Acceptance Criteria:**
- [ ] `backend/tests/integration/test_projects.py` exists.
- [ ] Tests cover create project, invite, accept/decline, and assign funding sources.

## Functional Requirements
- FR-1: Add integration tests for project endpoints.
- FR-2: Validate assignment behavior.

## Non-Goals
- No frontend tests.

## Success Metrics
- Integration tests pass with test DB.

## Assumptions
- Project endpoints exist per plan.
