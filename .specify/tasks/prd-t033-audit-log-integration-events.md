# PRD: T033 Audit Log Writes for Integration Events

## Introduction
Add audit log writes for integration add/delete events.

## Goals
- Record integration events for audit history.

## User Stories

### US-001: Integration audit logging
**Description:** As a developer, I want audit logs for integration changes so actions are traceable.

**Acceptance Criteria:**
- [ ] `backend/app/services/audit_log_service.py` logs integration add/delete.
- [ ] Logs include actor, action, and timestamp.

## Functional Requirements
- FR-1: Add audit log entries for add/delete integration events.

## Non-Goals
- No UI for viewing logs.

## Success Metrics
- Logs written for relevant integration events.

## Assumptions
- Audit log model exists.
