# PRD: T010 Create Env Templates and .gitignore Entries

## Introduction
Create environment template files for backend and frontend and ensure sensitive files are ignored.

## Goals
- Add `.env.example` files to backend and frontend with required variables.
- Ensure `.gitignore` includes `.env` entries and other sensitive files.

## User Stories

### US-001: Environment templates
**Description:** As a developer, I want env template files so setup requirements are clear without exposing secrets.

**Acceptance Criteria:**
- [ ] `backend/.env.example` exists with required backend variables.
- [ ] `frontend/.env.local.example` exists with required frontend variables.
- [ ] Variables are clearly named and documented with placeholders.

### US-002: Git ignore safety
**Description:** As a developer, I want secrets excluded from version control.

**Acceptance Criteria:**
- [ ] `.gitignore` includes `.env`, `.env.local`, and other relevant secret files.
- [ ] No real secrets are committed.

## Functional Requirements
- FR-1: Add `backend/.env.example`.
- FR-2: Add `frontend/.env.local.example`.
- FR-3: Update `.gitignore` with secret file patterns.

## Non-Goals
- No environment validation logic.

## Design Considerations
- Use clear comments to explain expected values where appropriate.

## Technical Considerations
- Ensure env naming matches Next.js conventions.

## Success Metrics
- New contributors can identify required env variables from templates.

## Open Questions
- None.

## Assumptions
- Env variables needed for upcoming tasks are known at a high level.
