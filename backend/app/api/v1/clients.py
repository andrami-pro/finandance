"""Clients API router.

Endpoints:
  GET    /api/v1/clients              — list clients
  POST   /api/v1/clients              — create a client
  PUT    /api/v1/clients/{client_id}  — update a client
  DELETE /api/v1/clients/{client_id}  — soft-delete a client
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.income import ClientCreate, ClientResponse, ClientUpdate
from app.services import client_service

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("/", response_model=list[ClientResponse])
def list_clients(
    user: CurrentUser,
    include_inactive: bool = Query(False, description="Include inactive clients"),
) -> list[dict[str, Any]]:
    """List clients for the authenticated user."""
    client = get_supabase()
    return client_service.list_clients(client, user_id=user.sub, include_inactive=include_inactive)


@router.post("/", response_model=ClientResponse, status_code=201)
def create_client(
    payload: ClientCreate,
    user: CurrentUser,
) -> dict[str, Any]:
    """Create a new freelance client."""
    client = get_supabase()
    return client_service.create_client(client, user_id=user.sub, data=payload.model_dump())


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    payload: ClientUpdate,
    user: CurrentUser,
) -> dict[str, Any]:
    """Update an existing client."""
    client = get_supabase()
    result = client_service.update_client(
        client, user_id=user.sub, client_id=client_id, data=payload.model_dump()
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return result


@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: str,
    user: CurrentUser,
) -> None:
    """Soft-delete a client (sets is_active=False)."""
    client = get_supabase()
    deleted = client_service.delete_client(client, user_id=user.sub, client_id=client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
