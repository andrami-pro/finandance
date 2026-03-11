# PRD: T001 Monorepo Folder Structure

## Introduction
Create the initial monorepo folder structure to match the plan and enable backend, frontend, and Supabase development streams.

## Goals
- Establish the required root folders for backend, frontend, and Supabase migrations.
- Ensure the structure matches the agreed plan for later tasks.

## User Stories

### US-001: Initialize monorepo folders
**Description:** As a developer, I want the monorepo folder structure created so that subsequent tasks have known locations for code and migrations.

**Acceptance Criteria:**
- [ ] Create root folders `backend/`, `frontend/`, and `supabase/migrations/`.
- [ ] Folder names match exactly and are tracked in version control.
- [ ] No unexpected files are created beyond placeholders if needed.

## Functional Requirements
- FR-1: Create `backend/` at repo root.
- FR-2: Create `frontend/` at repo root.
- FR-3: Create `supabase/migrations/` at repo root.

## Non-Goals
- No code generation or framework initialization.
- No configuration files beyond minimal placeholders if required by VCS.

## Design Considerations
- None.

## Technical Considerations
- Use empty placeholders (e.g., `.gitkeep`) only if necessary to track empty directories.

## Success Metrics
- All required folders exist and match the plan.

## Open Questions
- None.

## Assumptions
- The plan expects these exact folder names.
