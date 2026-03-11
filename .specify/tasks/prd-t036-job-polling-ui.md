# PRD: T036 Job Polling + Funding Source List UI

> **Post-completion update (2026-03-02) -- Design Token Cleanup:**
> SyncStatus component was updated as part of a project-wide design token cleanup:
> 1. Hardcoded Tailwind color classes replaced with semantic token classes.
> 2. Status indicators (queued/running/completed/failed) now use semantic tokens instead of direct color values.
> 3. All `font-lato`/`font-lora` replaced with `font-sans`/`font-serif`.

## Introduction
Implement UI for job polling status and funding source list.

## Goals
- Show sync job status updates.
- Display funding sources once synced.

## User Stories

### US-001: Sync status UI
**Description:** As a user, I want to see sync progress so I know when data is ready.

**Acceptance Criteria:**
- [ ] `frontend/components/integrations/SyncStatus.tsx` exists.
- [ ] UI shows job statuses (queued/running/completed/failed).
- [ ] Funding source list appears after completion.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- FR-1: Implement polling logic using API wrapper.
- FR-2: Render funding sources list.

## Non-Goals
- No advanced error analytics.

## Success Metrics
- UI reflects job status changes.

## Assumptions
- Jobs endpoints exist.
