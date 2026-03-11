"""Application configuration via Pydantic Settings.

Loads settings from the .env file (or environment variables).
A cached singleton is provided via get_settings().
"""

from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Supabase ---
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_service_role_key: str = Field(
        ..., description="Supabase service role key (backend only)"
    )
    supabase_jwt_secret: str = Field(
        ..., description="Supabase JWT secret for local token validation"
    )

    # --- Encryption (Fernet MultiFernet) ---
    master_encryption_key: str = Field(
        ...,
        description="Comma-separated Fernet keys. First key encrypts; all keys can decrypt.",
    )

    # --- Application ---
    environment: str = Field(default="development")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
        description="Comma-separated list of allowed CORS origins",
    )
    app_host: str = Field(default="0.0.0.0")
    app_port: int = Field(default=8000)

    # --- External APIs ---
    wise_api_base_url: str = Field(default="https://api.transferwise.com")
    ecb_api_url: str = Field(default="https://data-api.ecb.europa.eu/service/data/EXR")
    coingecko_api_url: str = Field(default="https://api.coingecko.com/api/v3")

    # --- Email Ingestion (Cloudflare Email Workers) ---
    webhook_secret: str = Field(
        default="dev-webhook-secret-change-me",
        description="Shared secret between Cloudflare Email Worker and backend webhook",
    )

    # --- Enable Banking (Open Banking / PSD2) ---
    enable_banking_app_id: str = Field(
        default="", description="Enable Banking application ID (UUID)"
    )
    enable_banking_key_path: str = Field(
        default="enable_banking_key.pem",
        description="Path to the RSA private key PEM file for Enable Banking JWT signing",
    )
    enable_banking_base_url: str = Field(
        default="https://api.enablebanking.com",
        description="Enable Banking API base URL",
    )
    enable_banking_redirect_uri: str = Field(
        default="http://localhost:3000/integrations/callback",
        description="OAuth callback URL for Enable Banking redirect",
    )

    @computed_field  # type: ignore[misc]
    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @computed_field  # type: ignore[misc]
    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached application settings singleton."""
    return Settings()
