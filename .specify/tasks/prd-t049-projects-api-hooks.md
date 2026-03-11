# PRD: T049 Wire Projects API Client + Hooks

## Status: DONE (2026-03-04)

## Implementation Notes

**File**: `frontend/src/hooks/useProjects.ts`

Hooks implemented:
- `useProjects()` — list projects via `GET /api/v1/projects` (auth-aware, waits for session)
- `useProjectDetail(id)` — fetch single project via `GET /api/v1/projects/{id}`
- `useCreateProject()` — submit wizard via `POST /api/v1/projects`
- `useUpdateProject(id)` — save changes via `PUT /api/v1/projects/{id}`
- `useDeleteProject(id)` — delete via `DELETE /api/v1/projects/{id}`
- `useFundingSources()` — fetch from `GET /api/v1/funding-sources` (maps row to FundingSourceOption)

All hooks:
- Use the shared `api` client from `@/lib/api`
- Are auth-aware (wait for `useAuth()` to resolve before fetching)
- Normalize errors via `ApiException`
- Return typed state (loading, error, data)

**Performance rewrite** (2026-03-03):

Module-level caches were added to eliminate redundant network calls when multiple components mount hooks for the same data:

- `_projectsCache` — stores the last-fetched projects list.
- `_projectDetailCache` — `Map<string, ProjectResponse>` keyed by project ID.
- `_fundingSourcesCache` — stores the last-fetched funding sources list.

Each hook initialises with cached data (`loading: false` if cache is populated), then revalidates in the background on mount. This means pages that remount (e.g. navigating back) show stale data instantly while fresh data loads silently.

**Invalidation system**:

- `invalidateProjects()` — exported function that clears `_projectsCache` and notifies all registered listeners.
- Mounted `useProjects` instances subscribe via a listener array; on invalidation they re-trigger a fetch.
- `useCreateProject`, `useUpdateProject`, and `useDeleteProject` all call `invalidateProjects()` after a successful mutation so list views stay consistent.

**Payload changes**:
- `useCreateProject` payload now includes `funding_strategy: FundingStrategy | null` instead of `funding_source_ids`.
- `useUpdateProject` payload also includes optional `funding_strategy` field.

### Number parsing fix (2026-03-04)
`useFundingSources()` now parses `current_balance` with `Number()` (backend returns Decimal as string). Also maps `balance_in_base_currency` to `balanceInBaseCurrency: number | null` on `FundingSourceOption`.

## Acceptance Criteria
- [x] All hooks implemented and used by wizard + detail page.
- [x] Auth race condition handled (hooks wait for session).
- [x] Typed responses matching backend schemas.
- [x] Error normalization via ApiException.
- [x] Module-level caches for projects list, project detail, and funding sources.
- [x] `invalidateProjects()` invalidation + listener system keeps list views consistent after mutations.
- [x] `funding_strategy` field in create/update payloads.
- [x] `current_balance` parsed as Number (not string). `balanceInBaseCurrency` mapped from API.
