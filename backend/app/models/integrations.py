"""Pydantic models for the integrations table.

Providers: WISE, KRAKEN, LEDGER
Status: PENDING → ACTIVE | PENDING → ERROR | ACTIVE ↔ ERROR
"""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class ProviderName(str, Enum):
    WISE = "WISE"
    KRAKEN = "KRAKEN"
    LEDGER = "LEDGER"
    REVOLUT = "REVOLUT"


class IntegrationStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    ERROR = "ERROR"


class IntegrationCreate(BaseModel):
    """Payload for inserting a new integration row."""

    user_id: UUID
    provider_name: ProviderName
    encrypted_api_key: str | None = None
    public_address: str | None = None
    status: IntegrationStatus = IntegrationStatus.PENDING


class Integration(BaseModel):
    """Full integration record as returned from the database."""

    id: UUID
    user_id: UUID
    provider_name: ProviderName
    encrypted_api_key: str | None = None
    public_address: str | None = None
    status: IntegrationStatus
    last_synced_at: datetime | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class IntegrationPublic(BaseModel):
    """Integration record safe for API responses (no encrypted key)."""

    id: UUID
    user_id: UUID
    provider_name: ProviderName
    status: IntegrationStatus
    last_synced_at: datetime | None = None
    updated_at: datetime
    public_address: str | None = None

    model_config = {"from_attributes": True}
