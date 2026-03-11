"""Pydantic models for funding plans (Auto-Save / DCA).

Plan types: dca | lump_sum
Frequencies: weekly | biweekly | monthly (required for DCA)
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, field_validator


class PlanType(str, Enum):
    DCA = "dca"
    LUMP_SUM = "lump_sum"


class PlanFrequency(str, Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class FundingPlanCreate(BaseModel):
    """Payload for creating a new funding plan."""

    project_id: str
    funding_source_id: str | None = None
    plan_type: PlanType = PlanType.DCA
    amount: float
    currency: str
    frequency: PlanFrequency | None = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("frequency")
    @classmethod
    def dca_requires_frequency(cls, v: PlanFrequency | None, info: object) -> PlanFrequency | None:
        # Access other fields via info.data
        data = getattr(info, "data", {})
        plan_type = data.get("plan_type")
        if plan_type == PlanType.DCA and v is None:
            raise ValueError("DCA plans require a frequency")
        return v


class FundingPlanUpdate(BaseModel):
    """Payload for updating an existing funding plan."""

    funding_source_id: str | None = None
    amount: float | None = None
    frequency: PlanFrequency | None = None
    is_active: bool | None = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("amount must be greater than 0")
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class FundingPlanResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    funding_source_id: str | None = None
    plan_type: str
    amount: float
    currency: str
    frequency: str | None = None
    next_reminder_at: datetime | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class FundingPlanListResponse(BaseModel):
    items: list[FundingPlanResponse]
    count: int
