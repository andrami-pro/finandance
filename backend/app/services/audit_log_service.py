"""Audit log service.

Append-only writes to the audit_log table for security-sensitive operations.
Uses the Supabase service-role client to bypass RLS (system writes).

Audited actions (from data-model.md):
  INTEGRATION_ADDED, INTEGRATION_DELETED,
  PROJECT_CREATED, PROJECT_MEMBER_INVITED, PROJECT_MEMBER_JOINED,
  PROJECT_MEMBER_LEFT, API_KEY_ROTATED,
  2FA_ENABLED, 2FA_DISABLED, RECOVERY_CODE_USED
"""

import logging
from typing import Any
from uuid import UUID

from supabase import Client

from app.models.audit_log import AuditLogCreate

logger = logging.getLogger(__name__)


def write_audit_log(
    client: Client,
    *,
    user_id: UUID | str | None,
    action: str,
    resource_type: str,
    resource_id: UUID | str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Insert a new audit log entry.

    Failures are logged but not re-raised — audit logging must never
    break the primary operation flow.
    """
    try:
        entry = AuditLogCreate(
            user_id=UUID(str(user_id)) if user_id else None,
            action=action,
            resource_type=resource_type,
            resource_id=UUID(str(resource_id)) if resource_id else None,
            metadata=metadata,
        )
        client.table("audit_log").insert(entry.model_dump(mode="json")).execute()
    except Exception as exc:
        logger.warning(
            "Audit log write failed (action=%s, user=%s): %s",
            action,
            user_id,
            exc,
        )
