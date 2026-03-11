"""Pydantic models for email ingestion configuration."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class EmailIngestConfig(BaseModel):
    """Database row for email_ingest_configs."""

    id: UUID
    user_id: UUID
    ingest_hash: str
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class EmailIngestConfigResponse(BaseModel):
    """Public response for email ingest config."""

    ingest_address: str
    is_active: bool
    created_at: datetime


class EmailIngestActivateResponse(BaseModel):
    """Response when activating email ingestion."""

    ingest_address: str
    message: str
