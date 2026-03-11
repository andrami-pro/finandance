"""JWT validation FastAPI dependency.

Validates Supabase-issued JWTs (ES256) using public keys from the Supabase
JWKS endpoint. Keys are fetched once and cached in memory.

Usage::

    @router.get("/me")
    async def get_me(user: CurrentUser) -> UserResponse:
        return {"id": user.sub, "email": user.email}
"""

import json
import logging
import urllib.request
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.algorithms import ECAlgorithm
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)
_bearer_scheme = HTTPBearer(auto_error=True)


class AuthUser(BaseModel):
    """Authenticated user extracted from a validated Supabase JWT."""

    sub: str
    """Supabase user UUID (auth.users.id)."""

    email: str | None = None
    role: str | None = None


@lru_cache(maxsize=1)
def _get_jwks() -> dict[str, object]:
    """Fetch and cache Supabase JWKS public keys, keyed by kid."""
    settings = get_settings()
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    logger.info("Fetching JWKS from %s", url)
    with urllib.request.urlopen(url) as response:
        data = json.load(response)
    return {key["kid"]: ECAlgorithm.from_jwk(key) for key in data["keys"]}


def validate_jwt(token: str) -> AuthUser:
    """Decode and validate a Supabase JWT. Raises HTTP 401 on failure."""
    try:
        header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    kid = header.get("kid")
    alg = header.get("alg", "ES256")

    jwks = _get_jwks()
    public_key = jwks.get(kid)
    if public_key is None:
        logger.warning("Unknown kid in JWT header: %s", kid)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown token signing key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[alg],
            audience="authenticated",
        )
    except InvalidTokenError as exc:
        logger.warning("JWT validation failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return AuthUser(
        sub=payload["sub"],
        email=payload.get("email"),
        role=payload.get("role"),
    )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
) -> AuthUser:
    """FastAPI dependency: extract and validate the Bearer JWT."""
    return validate_jwt(credentials.credentials)


# Convenience alias for route signatures
CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
