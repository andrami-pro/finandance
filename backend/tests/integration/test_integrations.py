"""Integration tests for /api/v1/integrations and /api/v1/jobs endpoints.

Uses the in-process ASGI test client (no real network/DB).
Auth is mocked via patching get_current_user.
Supabase DB calls are mocked via unittest.mock.
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

FAKE_USER_ID = str(uuid4())
FAKE_INTEGRATION_ID = str(uuid4())
FAKE_JOB_ID = str(uuid4())

# Fake auth user injected into all protected routes
_FAKE_AUTH_USER = MagicMock()
_FAKE_AUTH_USER.sub = FAKE_USER_ID
_FAKE_AUTH_USER.email = "test@finandance.test"


def _auth_override():
    """FastAPI dependency override for get_current_user."""
    return _FAKE_AUTH_USER


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def override_auth(async_client):
    """Inject fake auth for every test in this module."""
    from app.core.auth import get_current_user
    from app.main import app

    app.dependency_overrides[get_current_user] = _auth_override
    yield
    app.dependency_overrides.pop(get_current_user, None)


# ---------------------------------------------------------------------------
# GET /api/v1/integrations
# ---------------------------------------------------------------------------


async def test_list_integrations_empty(async_client):
    with patch("app.api.v1.integrations.get_supabase") as mock_sb:
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        response = await async_client.get("/api/v1/integrations")

    assert response.status_code == 200
    assert response.json() == []


async def test_list_integrations_returns_list(async_client):
    fake_data = [
        {
            "id": FAKE_INTEGRATION_ID,
            "user_id": FAKE_USER_ID,
            "provider_name": "WISE",
            "status": "ACTIVE",
            "last_synced_at": None,
            "updated_at": "2026-02-22T10:00:00",
            "encrypted_api_key": "encrypted",
            "public_address": None,
        }
    ]
    with patch("app.api.v1.integrations.get_supabase") as mock_sb:
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.execute.return_value.data = fake_data
        response = await async_client.get("/api/v1/integrations")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["provider_name"] == "WISE"
    # encrypted_api_key must NOT be returned
    assert "encrypted_api_key" not in body[0]


# ---------------------------------------------------------------------------
# POST /api/v1/integrations/connect
# ---------------------------------------------------------------------------


async def test_connect_wise_integration(async_client):
    with (
        patch("app.api.v1.integrations.get_supabase") as mock_sb,
        patch("app.api.v1.integrations.encrypt") as mock_enc,
        patch("app.api.v1.integrations.queue_sync_job") as mock_queue,
        patch("app.api.v1.integrations.write_audit_log") as _,
    ):
        mock_enc.return_value = "encrypted_key_abc"
        mock_queue.return_value = FAKE_JOB_ID
        mock_sb.return_value.table.return_value.insert.return_value.execute.return_value.data = [
            {
                "id": FAKE_INTEGRATION_ID,
                "user_id": FAKE_USER_ID,
                "provider_name": "WISE",
                "status": "PENDING",
                "last_synced_at": None,
                "updated_at": "2026-02-22T10:00:00",
                "encrypted_api_key": "encrypted_key_abc",
                "public_address": None,
            }
        ]

        response = await async_client.post(
            "/api/v1/integrations/connect",
            json={"provider": "WISE", "api_key": "plaintext_key"},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["provider"] == "WISE"
    assert body["status"] == "PENDING"
    assert "job_id" in body
    assert "encrypted_api_key" not in body


async def test_connect_ledger_with_public_address(async_client):
    fake_address = "bc1qtest123"
    with (
        patch("app.api.v1.integrations.get_supabase") as mock_sb,
        patch("app.api.v1.integrations.queue_sync_job") as mock_queue,
        patch("app.api.v1.integrations.write_audit_log") as _,
    ):
        mock_queue.return_value = FAKE_JOB_ID
        mock_sb.return_value.table.return_value.insert.return_value.execute.return_value.data = [
            {
                "id": FAKE_INTEGRATION_ID,
                "user_id": FAKE_USER_ID,
                "provider_name": "LEDGER",
                "status": "PENDING",
                "last_synced_at": None,
                "updated_at": "2026-02-22T10:00:00",
                "encrypted_api_key": None,
                "public_address": fake_address,
            }
        ]

        response = await async_client.post(
            "/api/v1/integrations/connect",
            json={"provider": "LEDGER", "public_address": fake_address, "chain": "BTC"},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["provider"] == "LEDGER"


async def test_connect_missing_credentials_returns_422(async_client):
    response = await async_client.post(
        "/api/v1/integrations/connect",
        json={"provider": "WISE"},  # no api_key and no public_address
    )
    assert response.status_code == 422


async def test_connect_duplicate_returns_409(async_client):
    with (
        patch("app.api.v1.integrations.get_supabase") as mock_sb,
        patch("app.api.v1.integrations.encrypt") as mock_enc,
    ):
        mock_enc.return_value = "enc"
        # Simulate unique constraint violation from Supabase
        mock_sb.return_value.table.return_value.insert.return_value.execute.side_effect = Exception(
            "duplicate key value violates unique constraint"
        )

        response = await async_client.post(
            "/api/v1/integrations/connect",
            json={"provider": "WISE", "api_key": "key123"},
        )

    assert response.status_code == 409


# ---------------------------------------------------------------------------
# DELETE /api/v1/integrations/{id}
# ---------------------------------------------------------------------------


async def test_delete_integration_success(async_client):
    with (
        patch("app.api.v1.integrations.get_supabase") as mock_sb,
        patch("app.api.v1.integrations.write_audit_log") as _,
    ):
        # First: verify ownership (get returns the integration)
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "id": FAKE_INTEGRATION_ID,
            "user_id": FAKE_USER_ID,
            "provider_name": "WISE",
        }
        mock_sb.return_value.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
            {"id": FAKE_INTEGRATION_ID}
        ]

        response = await async_client.delete(f"/api/v1/integrations/{FAKE_INTEGRATION_ID}")

    assert response.status_code == 204


async def test_delete_integration_not_found(async_client):
    with patch("app.api.v1.integrations.get_supabase") as mock_sb:
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

        response = await async_client.delete(f"/api/v1/integrations/{FAKE_INTEGRATION_ID}")

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/integrations/{id}/sync
# ---------------------------------------------------------------------------


async def test_trigger_sync_returns_202(async_client):
    with (
        patch("app.api.v1.integrations.get_supabase") as mock_sb,
        patch("app.api.v1.integrations.queue_sync_job") as mock_queue,
    ):
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "id": FAKE_INTEGRATION_ID,
            "user_id": FAKE_USER_ID,
            "provider_name": "WISE",
            "status": "ACTIVE",
        }
        mock_queue.return_value = FAKE_JOB_ID

        response = await async_client.post(f"/api/v1/integrations/{FAKE_INTEGRATION_ID}/sync")

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "QUEUED"
    assert "job_id" in body


# ---------------------------------------------------------------------------
# GET /api/v1/jobs/{job_id}
# ---------------------------------------------------------------------------


async def test_get_job_status_running(async_client):
    with patch("app.api.v1.jobs.get_job_status") as mock_status:
        mock_status.return_value = {
            "job_id": FAKE_JOB_ID,
            "status": "RUNNING",
            "integration_id": FAKE_INTEGRATION_ID,
            "started_at": "2026-02-22T10:00:00Z",
        }
        response = await async_client.get(f"/api/v1/jobs/{FAKE_JOB_ID}")

    assert response.status_code == 200
    assert response.json()["status"] == "RUNNING"


async def test_get_job_status_completed(async_client):
    with patch("app.api.v1.jobs.get_job_status") as mock_status:
        mock_status.return_value = {
            "job_id": FAKE_JOB_ID,
            "status": "COMPLETED",
            "integration_id": FAKE_INTEGRATION_ID,
            "funding_sources_synced": 2,
            "transactions_synced": 10,
            "completed_at": "2026-02-22T10:00:08Z",
        }
        response = await async_client.get(f"/api/v1/jobs/{FAKE_JOB_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "COMPLETED"
    assert body["funding_sources_synced"] == 2


async def test_get_job_status_not_found(async_client):
    with patch("app.api.v1.jobs.get_job_status") as mock_status:
        mock_status.return_value = None
        response = await async_client.get(f"/api/v1/jobs/{FAKE_JOB_ID}")

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/funding-sources
# ---------------------------------------------------------------------------


async def test_list_funding_sources(async_client):
    fake_source = {
        "id": str(uuid4()),
        "integration_id": FAKE_INTEGRATION_ID,
        "user_id": FAKE_USER_ID,
        "external_source_id": "99",
        "name": "EUR Jar",
        "asset_type": "fiat",
        "currency": "EUR",
        "current_balance": "1234.56",
        "balance_in_base_currency": "1234.56",
        "updated_at": "2026-02-22T10:00:00",
    }
    with patch("app.api.v1.funding_sources.get_supabase") as mock_sb:
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            fake_source
        ]
        response = await async_client.get("/api/v1/funding-sources")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "EUR Jar"
    assert body[0]["currency"] == "EUR"
