# PRD: T015 Implement JWT Validation Dependency

## Introduction
Create a JWT validation dependency for backend endpoints.

## Goals
- Provide a reusable dependency for auth validation.
- Normalize authentication error handling.

## User Stories

### US-001: JWT validation dependency
**Description:** As a developer, I want a JWT validation helper so endpoints can enforce authentication consistently.

**Acceptance Criteria:**
- [ ] `backend/app/core/auth.py` includes a dependency that validates JWTs.
- [ ] Invalid or missing tokens yield standardized auth errors.
- [ ] Dependency is reusable across route modules.

## Functional Requirements
- FR-1: Parse and validate JWT signature and claims.
- FR-2: Expose user identity context to endpoints.

## Non-Goals
- No refresh token handling.

## Success Metrics
- Authenticated endpoints can gate access using the dependency.

## Assumptions
- JWT settings are defined in config.
