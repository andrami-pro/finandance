"""Projects API router.

Endpoints:
  GET    /api/v1/projects                     — list user's projects
  POST   /api/v1/projects                     — create project (wizard submit)
  GET    /api/v1/projects/{id}                — project detail
  PUT    /api/v1/projects/{id}                — update project
  DELETE /api/v1/projects/{id}                — delete project
  POST   /api/v1/projects/{id}/invite         — invite member by email
  POST   /api/v1/projects/{id}/respond        — accept/decline invite
  POST   /api/v1/projects/{id}/funding        — assign funding source
"""

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.projects import (
    AssignFundingSourceRequest,
    InviteMemberRequest,
    ProjectCreate,
    ProjectListItem,
    ProjectResponse,
    ProjectUpdate,
    RespondToInviteRequest,
)
from app.services.project_service import (
    assign_funding_source,
    create_project,
    delete_project,
    get_project,
    invite_member,
    list_projects,
    respond_to_invite,
    update_project,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[ProjectListItem])
def list_user_projects(user: CurrentUser) -> list[dict[str, Any]]:
    """Return all projects where the authenticated user is a member."""
    client = get_supabase()
    return list_projects(client, user_id=user.sub)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_new_project(payload: ProjectCreate, user: CurrentUser) -> dict[str, Any]:
    """Create a shared project from the wizard."""
    client = get_supabase()

    result = create_project(
        client,
        user_id=user.sub,
        name=payload.name,
        target_amount=payload.target_amount,
        target_currency=payload.target_currency,
        target_date=payload.target_date.isoformat() if payload.target_date else None,
        category=payload.category,
        invited_emails=payload.invited_emails,
        funding_source_ids=payload.funding_source_ids,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project",
        )

    return result


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_detail(project_id: UUID, user: CurrentUser) -> dict[str, Any]:
    """Get full project detail including members and funding sources."""
    client = get_supabase()

    result = get_project(client, project_id=str(project_id), user_id=user.sub)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
        )

    return result


@router.put("/{project_id}", response_model=ProjectResponse)
def update_existing_project(
    project_id: UUID, payload: ProjectUpdate, user: CurrentUser
) -> dict[str, Any]:
    """Update a project (name, target, category, funding sources)."""
    client = get_supabase()

    result = update_project(
        client,
        project_id=str(project_id),
        user_id=user.sub,
        name=payload.name,
        target_amount=payload.target_amount,
        target_currency=payload.target_currency,
        target_date=payload.target_date.isoformat() if payload.target_date else None,
        category=payload.category,
        funding_source_ids=payload.funding_source_ids,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can update this project",
        )

    return result


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_project(project_id: UUID, user: CurrentUser) -> None:
    """Delete a project. Only the owner can delete."""
    client = get_supabase()

    deleted = delete_project(
        client,
        project_id=str(project_id),
        user_id=user.sub,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can delete this project",
        )


@router.post("/{project_id}/invite", status_code=status.HTTP_201_CREATED)
def invite_project_member(
    project_id: UUID, payload: InviteMemberRequest, user: CurrentUser
) -> dict[str, Any]:
    """Invite a user to a project by email."""
    client = get_supabase()

    # Verify inviter is a member with OWNER role
    member_check = (
        client.table("project_members")
        .select("role")
        .eq("project_id", str(project_id))
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )
    if not member_check.data or member_check.data["role"] != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can invite members",
        )

    result = invite_member(
        client,
        project_id=str(project_id),
        inviter_id=user.sub,
        email=payload.email,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or already a member",
        )

    return result


@router.post("/{project_id}/respond")
def respond_to_project_invite(
    project_id: UUID, payload: RespondToInviteRequest, user: CurrentUser
) -> dict[str, Any]:
    """Accept or decline a project invitation."""
    client = get_supabase()

    updated = respond_to_invite(
        client,
        project_id=str(project_id),
        user_id=user.sub,
        accept=payload.accept,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending invitation found",
        )

    action = "accepted" if payload.accept else "declined"
    return {"status": action, "project_id": str(project_id)}


@router.post("/{project_id}/funding", status_code=status.HTTP_201_CREATED)
def assign_project_funding(
    project_id: UUID, payload: AssignFundingSourceRequest, user: CurrentUser
) -> dict[str, Any]:
    """Link a funding source to a project."""
    client = get_supabase()

    # Verify user is a member
    member_check = (
        client.table("project_members")
        .select("role")
        .eq("project_id", str(project_id))
        .eq("user_id", user.sub)
        .maybe_single()
        .execute()
    )
    if not member_check.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project members can assign funding sources",
        )

    result = assign_funding_source(
        client,
        project_id=str(project_id),
        funding_source_id=payload.funding_source_id,
        allocated_amount=payload.allocated_amount,
    )

    return result
