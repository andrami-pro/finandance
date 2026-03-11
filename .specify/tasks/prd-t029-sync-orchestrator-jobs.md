# PRD: T029 Implement Sync Orchestrator + Job Tracker

## Introduction
Create the sync orchestrator and job tracker for integration syncing.

## Goals
- Orchestrate sync jobs across providers.
- Track job status transitions.

## User Stories

### US-001: Sync job orchestration
**Description:** As a developer, I want a sync orchestrator so integrations sync asynchronously and report status.

**Acceptance Criteria:**
- [ ] `backend/app/jobs/sync_jobs.py` exists.
- [ ] Jobs can be created, updated, and completed.
- [ ] Status updates are persisted.

## Functional Requirements
- FR-1: Implement job lifecycle (queued, running, completed, failed).
- FR-2: Trigger provider syncs using service clients.

## Non-Goals
- No UI updates.

## Success Metrics
- Jobs reflect correct status after sync.

## Assumptions
- Job schema exists in DB.

## Status Notes

**Status: In Progress** (sync orchestrator implemented, Wise direction logic fixed 2026-03-03)

### Wise Sync Pipeline Direction Fix (2026-03-03)

The WISE branch in `backend/app/jobs/sync_jobs.py` was rewritten to use the corrected
direction detection logic from the Wise service client.

**Changes:**
- Removed `_parse_wise_activities()` helper (was tied to the broken Activities endpoint
  approach).
- Rewrote WISE sync branch to consume `(recipient_id, transfers)` tuple from
  `wise_service.get_transactions()`.
- Direction is now determined by comparing each transfer's `targetAccount` against
  `recipientId`: match = IN, mismatch = OUT.

See also: T026 status notes for the service client side of this fix.
