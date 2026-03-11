# PRD: T008 Add Lint and Format Tools

## Introduction
Configure linting and formatting for backend (ruff, mypy) and frontend (ESLint, Prettier).

## Goals
- Add backend lint and type checking in `backend/pyproject.toml`.
- Add frontend lint and format configuration in `frontend/.eslintrc.*` and related files.

## User Stories

### US-001: Backend lint and type checks
**Description:** As a developer, I want ruff and mypy configured so backend code quality is enforceable.

**Acceptance Criteria:**
- [ ] `backend/pyproject.toml` includes ruff and mypy configuration.
- [ ] Backend lint/typecheck commands are defined or documented.

### US-002: Frontend lint and format checks
**Description:** As a developer, I want ESLint and Prettier configured so frontend code style is consistent.

**Acceptance Criteria:**
- [ ] ESLint configuration exists in `frontend/.eslintrc.*` (or equivalent).
- [ ] Prettier configuration exists and is wired into scripts.
- [ ] Typecheck passes.

## Functional Requirements
- FR-1: Configure ruff and mypy in `backend/pyproject.toml`.
- FR-2: Configure ESLint in `frontend/.eslintrc.*`.
- FR-3: Configure Prettier in frontend repo scope.

## Non-Goals
- No linting fixes of existing code beyond baseline configuration.

## Design Considerations
- Align formatting rules with team standards if specified.

## Technical Considerations
- Keep configurations minimal and strict enough for CI enforcement.

## Success Metrics
- Lint and format commands run without configuration errors.

## Open Questions
- None.

## Assumptions
- Ruff and mypy are chosen for backend; ESLint and Prettier for frontend.
