# PRD: T073 Add Next.js Middleware Protection for Dashboard

## Introduction
Add middleware to protect dashboard routes from unauthenticated access.

## Goals
- Enforce auth checks for dashboard routes.

## User Stories

### US-001: Route protection
**Description:** As a developer, I want middleware protection so unauthenticated users cannot access the dashboard.

**Acceptance Criteria:**
- [ ] `frontend/middleware.ts` exists.
- [ ] Middleware checks session/auth state.
- [ ] Unauthenticated users are redirected to login.

## Functional Requirements
- FR-1: Add middleware with route matcher.
- FR-2: Implement redirect behavior.

## Non-Goals
- No backend changes.

## Success Metrics
- Protected routes require auth.

## Assumptions
- Auth session mechanism exists.
