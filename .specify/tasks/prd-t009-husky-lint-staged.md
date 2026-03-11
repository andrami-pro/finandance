# PRD: T009 Add Husky and lint-staged

## Introduction
Set up Husky and lint-staged to enforce linting and formatting on pre-commit.

## Goals
- Add Husky hooks in `.husky/`.
- Configure lint-staged in root or frontend `package.json` as per plan.

## User Stories

### US-001: Pre-commit lint enforcement
**Description:** As a developer, I want pre-commit hooks to run lint/format checks so code quality is enforced automatically.

**Acceptance Criteria:**
- [ ] `.husky/` directory exists with a pre-commit hook.
- [ ] lint-staged config exists in root or `frontend/package.json`.
- [ ] Hook runs lint-staged on staged files.

## Functional Requirements
- FR-1: Add Husky setup and hook scripts.
- FR-2: Configure lint-staged tasks for frontend and/or backend files.
- FR-3: Ensure scripts are documented in package.json if needed.

## Non-Goals
- No custom Git hooks beyond pre-commit.

## Design Considerations
- Keep tasks fast to avoid slow commits.

## Technical Considerations
- If repo uses separate package.json, ensure correct scope for hooks.

## Success Metrics
- Committing triggers lint-staged for relevant files.

## Open Questions
- None.

## Assumptions
- Node tooling is available for Husky setup.
