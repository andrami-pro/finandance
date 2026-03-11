# PRD: T018 Add Audit Log Model + Schema Mapping

## Introduction
Implement the audit log model and schema mapping for backend usage.

## Goals
- Add audit log model in backend.
- Map to the existing database schema.

## User Stories

### US-001: Audit log model
**Description:** As a developer, I want an audit log model so I can record critical events.

**Acceptance Criteria:**
- [ ] `backend/app/models/audit_log.py` defines the audit log model.
- [ ] Model fields match the database schema from data model.
- [ ] Model can be imported by services.

## Functional Requirements
- FR-1: Implement model fields and table mapping.
- FR-2: Ensure timestamps and actor fields are included.

## Non-Goals
- No audit log service logic.

## Success Metrics
- Audit log model matches schema and passes ORM validation.

## Assumptions
- Audit log table exists in migration.
