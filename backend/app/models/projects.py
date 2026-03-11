"""Pydantic models for projects, project members, and project funding sources.

Roles: OWNER | MEMBER | PENDING_INVITE (DB enum: project_member_role_enum)
"""

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel

from app.models.funding_plans import FundingPlanResponse


class MemberRole(str, Enum):
    OWNER = "OWNER"
    MEMBER = "MEMBER"
    PENDING_INVITE = "PENDING_INVITE"


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ProjectCreate(BaseModel):
    """Payload for the wizard 'Create Project' submit."""

    name: str
    target_amount: float
    target_currency: str = "EUR"
    target_date: date | None = None
    category: str | None = None
    funding_strategy: str | None = None  # 'fiat' | 'crypto'
    invited_emails: list[str] = []
    funding_source_ids: list[str] = []


class InviteMemberRequest(BaseModel):
    email: str


class RespondToInviteRequest(BaseModel):
    accept: bool


class ProjectUpdate(BaseModel):
    """Payload for updating a project from the detail page."""

    name: str | None = None
    target_amount: float | None = None
    target_currency: str | None = None
    target_date: date | None = None
    category: str | None = None
    funding_strategy: str | None = None  # 'fiat' | 'crypto'
    funding_source_ids: list[str] | None = None


class AssignFundingSourceRequest(BaseModel):
    funding_source_id: str
    allocated_amount: float | None = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ProjectMemberResponse(BaseModel):
    user_id: str
    role: MemberRole
    full_name: str | None = None
    avatar_url: str | None = None
    email: str | None = None


class ProjectFundingSourceResponse(BaseModel):
    funding_source_id: str
    allocated_amount: float | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    target_amount: float
    target_currency: str
    target_date: date | None = None
    category: str | None = None
    funding_strategy: str | None = None
    created_by: str
    current_amount: float = 0.0
    members: list[ProjectMemberResponse] = []
    funding_sources: list[ProjectFundingSourceResponse] = []
    funding_plans: list[FundingPlanResponse] = []
    created_at: datetime
    updated_at: datetime


class ProjectListItem(BaseModel):
    id: str
    name: str
    target_amount: float
    target_currency: str
    target_date: date | None = None
    category: str | None = None
    funding_strategy: str | None = None
    current_amount: float = 0.0
    progress_percent: float = 0.0
    member_count: int = 0
    funding_sources_count: int = 0
