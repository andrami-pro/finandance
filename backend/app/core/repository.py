"""Base repository pattern for Supabase table operations.

Provides typed CRUD helpers so each domain repository only needs to define
the table name and Pydantic model. All methods are synchronous (Supabase
Python SDK uses sync I/O under the hood).
"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel
from supabase import Client

T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    """Generic repository with typed CRUD operations.

    Usage::

        class IntegrationRepository(BaseRepository[Integration]):
            def __init__(self, client: Client) -> None:
                super().__init__(client, "integrations", Integration)
    """

    def __init__(self, client: Client, table_name: str, model: type[T]) -> None:
        self._client = client
        self._table = table_name
        self._model = model

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    def get_by_id(self, record_id: str) -> T | None:
        result = (
            self._client.table(self._table).select("*").eq("id", record_id).maybe_single().execute()
        )
        if result.data is None:
            return None
        return self._model.model_validate(result.data)

    def get_all(self, **filters: Any) -> list[T]:
        """Fetch all rows matching the provided equality filters."""
        query = self._client.table(self._table).select("*")
        for key, value in filters.items():
            query = query.eq(key, value)
        result = query.execute()
        return [self._model.model_validate(row) for row in result.data]

    def get_one(self, **filters: Any) -> T | None:
        """Fetch a single row matching filters, or None."""
        query = self._client.table(self._table).select("*")
        for key, value in filters.items():
            query = query.eq(key, value)
        result = query.maybe_single().execute()
        if result.data is None:
            return None
        return self._model.model_validate(result.data)

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    def create(self, data: dict[str, Any]) -> T:
        result = self._client.table(self._table).insert(data).execute()
        return self._model.model_validate(result.data[0])

    def update(self, record_id: str, data: dict[str, Any]) -> T | None:
        result = self._client.table(self._table).update(data).eq("id", record_id).execute()
        if not result.data:
            return None
        return self._model.model_validate(result.data[0])

    def upsert(self, data: dict[str, Any]) -> T:
        result = self._client.table(self._table).upsert(data).execute()
        return self._model.model_validate(result.data[0])

    def delete(self, record_id: str) -> bool:
        result = self._client.table(self._table).delete().eq("id", record_id).execute()
        return bool(result.data)
