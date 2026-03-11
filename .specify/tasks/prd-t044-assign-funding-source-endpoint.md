# PRD: T044 Assign Funding Source Endpoint

## Introduction
Add endpoint to assign funding sources to projects.

## Goals
- Enable assignment via API.

## User Stories

### US-001: Assign funding source
**Description:** As a developer, I want an assignment endpoint so projects can be linked to funding sources.

**Acceptance Criteria:**
- [ ] `backend/app/api/v1/funding_sources.py` includes assignment endpoint.
- [ ] Endpoint validates permissions.

## Functional Requirements
- FR-1: Implement assignment endpoint.

## Non-Goals
- No UI changes.

## Success Metrics
- Endpoint passes integration tests.

## Assumptions
- Project service supports assignment.
