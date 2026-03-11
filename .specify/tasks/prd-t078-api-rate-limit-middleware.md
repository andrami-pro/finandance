# PRD: T078 Add API Rate Limit Middleware Config

## Introduction
Implement backend rate limit middleware configuration.

## Goals
- Provide middleware config for API rate limiting.

## User Stories

### US-001: Rate limiting middleware
**Description:** As a developer, I want rate limiting so API abuse is controlled.

**Acceptance Criteria:**
- [ ] `backend/app/core/rate_limit.py` exists.
- [ ] Middleware config can be enabled in app startup.

## Functional Requirements
- FR-1: Add rate limit configuration and middleware wrapper.

## Non-Goals
- No UI changes.

## Success Metrics
- Middleware can be enabled without errors.

## Assumptions
- Rate limiting library is defined in plan.
