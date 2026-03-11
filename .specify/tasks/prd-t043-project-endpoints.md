# PRD: T043 Implement Project Endpoints

## Status: DONE (2026-03-03)

## Implementation Notes

**File**: `backend/app/api/v1/projects.py`

Endpoints:
- `GET    /api/v1/projects`              → list user's projects (ProjectListItem[])
- `POST   /api/v1/projects`              → create project (ProjectResponse, 201)
- `GET    /api/v1/projects/{id}`         → project detail (ProjectResponse)
- `PUT    /api/v1/projects/{id}`         → update project (ProjectResponse)
- `DELETE /api/v1/projects/{id}`         → delete project (204 No Content)
- `POST   /api/v1/projects/{id}/invite`  → invite member (201)
- `POST   /api/v1/projects/{id}/respond` → accept/decline invite
- `POST   /api/v1/projects/{id}/funding` → assign funding source (201)

All endpoints require JWT auth via `CurrentUser` dependency. Owner-only checks on update/delete/invite.

## Acceptance Criteria
- [x] All endpoints defined and registered in `main.py`.
- [x] Standardized response shapes via Pydantic models.
- [x] Owner authorization enforced on mutating operations.
