"""
Global pytest fixtures for Finandance backend tests.

Usage:
  Unit tests:       backend/tests/unit/
  Integration tests: backend/tests/integration/

Run all tests:      uv run pytest
Run with coverage:  uv run pytest --cov=app --cov-report=term-missing
"""

from typing import AsyncGenerator

import httpx
import pytest
from httpx import ASGITransport

from app.main import app


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def async_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """
    Async HTTP client backed by the FastAPI ASGI app (no real network).

    Example usage in integration tests:
        async def test_health(async_client):
            response = await async_client.get("/health")
            assert response.status_code == 200
    """
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
