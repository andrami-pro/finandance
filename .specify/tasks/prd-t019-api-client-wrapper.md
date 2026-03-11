# PRD: T019 Create Shared API Client Wrapper

## Introduction
Create a shared API client wrapper for frontend with standardized error handling.

## Goals
- Provide a reusable API client helper.
- Normalize error shapes for UI use.

## User Stories

### US-001: Frontend API wrapper
**Description:** As a developer, I want a shared API client wrapper so all API calls handle errors consistently.

**Acceptance Criteria:**
- [ ] `frontend/lib/api.ts` exports a client wrapper.
- [ ] Errors are normalized to a consistent shape.
- [ ] Wrapper supports auth headers when needed.

## Functional Requirements
- FR-1: Implement request helper with base URL.
- FR-2: Normalize error responses.

## Non-Goals
- No per-feature API hooks.

## Success Metrics
- Feature hooks can use the wrapper without duplication.

## Assumptions
- API base URL is configured via env.
