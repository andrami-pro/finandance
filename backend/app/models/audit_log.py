"""Pydantic models for the audit_log table.

The audit log is append-only — no UPDATE or DELETE operations are performed.
All writes go through AuditLogService using the service-role Supabase client.

Audited actions (from data-model.md):
  INTEGRATION_ADDED, INTEGRATION_DELETED,
  PROJECT_CREATED, PROJECT_MEMBER_INVITED, PROJECT_MEMBER_JOINED,
  PROJECT_MEMBER_LEFT, API_KEY_ROTATED,
  2FA_ENABLED, 2FA_DISABLED, RECOVERY_CODE_USED
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AuditLogCreate(BaseModel):
    """Payload for inserting a new audit log entry."""

    user_id: UUID | None = None
    """Acting user UUID. None for system-triggered actions."""

    action: str
    """Action type, e.g. 'INTEGRATION_ADDED'."""

    resource_type: str
    """Entity type, e.g. 'integration', 'project'."""

    resource_id: UUID | None = None
    """Affected resource UUID. None for non-entity-specific actions."""

    metadata: dict[str, Any] | None = None
    """Extra context (IP address, provider name, etc.)."""


class AuditLog(AuditLogCreate):
    """Full audit log record as returned from the database."""

    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
