"""Supabase client factory.

The backend uses the **service role key** to bypass RLS for sync jobs and
server-side operations. RLS is enforced at the database level for all
client-facing reads; the backend validates the user's JWT separately via
`app.core.auth`.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return the cached Supabase service-role client singleton."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
