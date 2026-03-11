# PRD: T016 Implement Global Error Handler

## Introduction
Add a global error handler to standardize API error responses.

## Goals
- Ensure errors follow a consistent JSON shape.
- Improve API client error handling.

## User Stories

### US-001: Standardized error responses
**Description:** As a developer, I want a global error handler so API errors are consistent and predictable.

**Acceptance Criteria:**
- [ ] `backend/app/main.py` registers a global exception handler.
- [ ] Error responses match the standard error shape in specs.
- [ ] Validation and HTTP errors are normalized.

## Functional Requirements
- FR-1: Catch unhandled exceptions and return standardized payloads.
- FR-2: Normalize FastAPI/Starlette HTTP exceptions.

## Non-Goals
- No logging system setup.

## Success Metrics
- API returns consistent error shape across endpoints.

## Assumptions
- Standard error schema is defined in specs.
