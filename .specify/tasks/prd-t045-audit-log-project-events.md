# PRD: T045 Audit Log Writes for Project Events

## Status: DONE (2026-03-03)

## Implementation Notes

Audit log writes are embedded in `backend/app/services/project_service.py` using the existing `write_audit_log()` from `audit_log_service.py`.

Events logged:
- `PROJECT_CREATED` — with metadata (name, target, currency, category, funding_sources, invited_emails)
- `PROJECT_UPDATED` — with metadata (updated fields, funding_source_ids)
- `PROJECT_DELETED` — project_id only
- `PROJECT_MEMBER_INVITED` — with invited_email and invited_user_id
- `PROJECT_MEMBER_JOINED` — on invite accept
- `PROJECT_FUNDING_SOURCE_ASSIGNED` — with funding_source_id and allocated_amount

## Acceptance Criteria
- [x] All project mutation actions write audit logs.
- [x] Logs include actor (user_id), action, resource_type, resource_id, and metadata.
