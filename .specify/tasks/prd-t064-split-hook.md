# PRD: T064 Wire Split Update Action

## Introduction
Add frontend hook to call split update endpoint.

## Goals
- Provide a hook for updating splits.

## User Stories

### US-001: Split update hook
**Description:** As a developer, I want a split update hook so the UI can persist split changes.

**Acceptance Criteria:**
- [ ] `frontend/hooks/useTransactions.ts` includes split update action.
- [ ] Errors are normalized.

## Functional Requirements
- FR-1: Implement split update API call in hook.

## Non-Goals
- No UI changes.

## Success Metrics
- Hook can be used by split drawer UI.

## Assumptions
- Transactions API endpoint exists.
