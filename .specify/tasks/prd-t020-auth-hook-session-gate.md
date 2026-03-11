# PRD: T020 Create Auth Hook and Session Gate Utilities

## Status: DONE (2026-03-03)

## Implementation Notes

**File**: `frontend/src/hooks/useAuth.ts`

The hook was implemented in two iterations:

**Initial implementation** (Phase 2 / T020):
- Used `useEffect` + `useState` internally per component instance.
- Called `supabase.auth.getSession()` independently on each mount.
- Subscribed to `onAuthStateChange` per instance.

**Rewrite** (2026-03-03 — performance fix):
- Rewrote to use `useSyncExternalStore` with a **module-level shared store**.
- Auth state is initialised once per app lifecycle via a single `getSession()` call.
- All hook instances across the component tree share the same state object — no duplicate fetches.
- A single `onAuthStateChange` subscription is registered at the module level and never recreated.
- `subscribe` / `getSnapshot` / `getServerSnapshot` satisfy the `useSyncExternalStore` contract.
- Listeners are notified synchronously on state change, ensuring all consumers update atomically.

**Session gate**: Route protection is handled at the middleware level (`frontend/src/middleware.ts`), not in the hook itself. The hook exposes `{ user, session, loading }` for component-level use.

## Acceptance Criteria
- [x] `frontend/src/hooks/useAuth.ts` exposes auth state and loading state.
- [x] Hook integrates with Supabase Auth via `supabaseClient.ts`.
- [x] Errors are handled gracefully.
- [x] Module-level shared store — auth state initialises once per app lifecycle.
- [x] No duplicate `getSession()` calls when multiple components use `useAuth`.
- [x] Session gate: protected routes enforced via `middleware.ts`.
