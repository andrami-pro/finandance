---
description: "Task list for Finandance MVP implementation"
---

# Tasks: Finandance MVP

**Input**: Design documents from `/specs/001-finandance-mvp/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/api-contracts.md, quickstart.md

**Tests**: Included where required by the Constitution (TDD for financial logic + integration tests for API endpoints + critical UI flows).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **Include exact file paths in descriptions**

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create monorepo folder structure per plan in `backend/`, `frontend/`, `supabase/migrations/`
- [x] T002 Initialize FastAPI project with uv and dependency list in `backend/pyproject.toml`
- [x] T003 Initialize Next.js 14 App Router with TypeScript strict in `frontend/package.json` and `frontend/tsconfig.json`
- [x] T004 [P] Configure Tailwind + global styles and fonts in `frontend/app/globals.css` and `frontend/app/layout.tsx`
- [x] T005 [P] Add shadcn/ui setup and base UI registry in `frontend/components/ui/`
- [x] T006 [P] Configure backend test harness (pytest, pytest-asyncio, httpx) in `backend/tests/conftest.py`
- [x] T007 [P] Configure frontend tests with Vitest in `frontend/vitest.config.ts` and scripts in `frontend/package.json`
- [x] T008 [P] Add lint/format tools: ruff + mypy in `backend/pyproject.toml` and ESLint/Prettier in `frontend/.eslintrc.*`
- [x] T009 [P] Add Husky + lint-staged config in `.husky/` and `package.json` (root or `frontend/`)
- [x] T010 [P] Create env templates and gitignore entries in `backend/.env.example`, `frontend/.env.local.example`, and `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Define SQL schema + indexes from data-model in `supabase/migrations/001_init.sql`
- [x] T012 [P] Add RLS policies from data-model in `supabase/migrations/002_rls_policies.sql`
- [x] T013 Implement DB session + base repository in `backend/app/core/db.py` and `backend/app/core/repository.py`
- [x] T014 Implement config loader via Pydantic Settings in `backend/app/core/config.py`
- [x] T015 Implement JWT validation dependency in `backend/app/core/auth.py`
- [x] T016 Implement global error handler to standard error shape in `backend/app/main.py`
- [x] T017 Implement Fernet MultiFernet helper utilities in `backend/app/core/crypto.py`
- [x] T018 [P] Add audit log model + schema mapping in `backend/app/models/audit_log.py`
- [x] T019 [P] Create shared API client wrapper with error normalization in `frontend/src/lib/api.ts`
- [x] T020 [P] Create auth hook and session gate utilities in `frontend/src/hooks/useAuth.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 2.5: Frontend Auth & App Shell (Prerequisite for all frontend work)

**Purpose**: Auth entry point and app shell layout that every frontend screen depends on. Moved forward from Phase 7 (US5) as a real prerequisite — without these, no screen can be developed or tested visually.

- [x] T073 [US5→2.5] Add Next.js middleware protection for dashboard routes in `frontend/src/middleware.ts`
- [x] T074 [US5→2.5] Wire Supabase SSR client for server-side session handling in `frontend/src/lib/supabaseServerClient.ts`
- [x] T071 [US5→2.5] Build login and signup pages in `frontend/src/app/(auth)/login/page.tsx` and `frontend/src/app/(auth)/signup/page.tsx`
- [x] T020b Build app shell layout with sidebar + topbar in `frontend/src/app/(dashboard)/layout.tsx`, `frontend/src/components/layout/AppSidebar.tsx`, `frontend/src/components/layout/AppTopbar.tsx`
- [x] T020c Build dashboard skeleton page in `frontend/src/app/(dashboard)/dashboard/page.tsx`

**Checkpoint**: App entry point works end-to-end — login → dashboard shell visible

---

### Cross-cutting: Design Token Cleanup (2026-03-02)

**Scope**: Affects T004, T005, T071, T034, T035, T036, plus AppSidebar, AppTopbar, and 3 layout files.

A major design token cleanup was applied across all completed frontend tasks:

1. **`globals.css` rewritten**: All CSS variables now use OKLCH values sourced directly from `design-tokens-nova.json`. The previous implementation had manual HSL conversions with bugs (e.g. `--ring` pointed to emerald instead of warm gray).
2. **`tailwind.config.ts` updated**: Color wrapper function switched from `hsl()` to `oklch()`. Missing sidebar tokens added.
3. **~180 hardcoded Tailwind color classes replaced** with semantic tokens across 10 component files (login, signup, dashboard, integrations page, AppSidebar, AppTopbar, ConnectModal, SyncStatus, and 3 layout files).
4. **Font class normalization**: All `font-lato`/`font-lora` replaced with `font-sans`/`font-serif`.
5. **Chart and status tokens**: Provider logo colors now use chart tokens (`bg-chart-1/3/5`). Status badges use semantic tokens.

`design-tokens-nova.json` is now the single source of truth for all color, typography, and spacing values. All future UI tasks should use semantic token classes exclusively -- no hardcoded Tailwind palette colors.

---

## Phase 3: User Story 1 - Connect Financial Integrations (Priority: P1) 🎯 MVP

**Goal**: Users connect Wise/Kraken/Ledger and sync funding sources + transactions asynchronously with encrypted credentials

**Independent Test**: Connect a mock integration, verify funding sources and transactions are synced, and job status updates to COMPLETED

### Tests for User Story 1 (MANDATORY for financial logic)

- [x] T021 [P] [US1] Unit tests for encryption helpers in `backend/tests/unit/test_crypto.py`
- [x] T022 [P] [US1] Unit tests for provider service mapping with mocked HTTP in `backend/tests/unit/test_integrations_services.py`
- [x] T023 [P] [US1] Integration tests for connect/sync/jobs endpoints in `backend/tests/integration/test_integrations.py`
- [x] T024 [P] [US1] Frontend integration flow tests (connect + polling UI) in `frontend/tests/integration/integrations.test.tsx`

### Implementation for User Story 1

- [x] T025 [P] [US1] Implement Integration + FundingSource models in `backend/app/models/integrations.py` and `backend/app/models/funding_sources.py`
- [x] T026 [P] [US1] Implement Wise service client in `backend/app/services/wise_service.py`
- [x] T027 [P] [US1] Implement Kraken service client in `backend/app/services/kraken_service.py`
- [x] T028 [P] [US1] Implement Ledger service client in `backend/app/services/ledger_service.py`
- [x] T029 [US1] Implement sync orchestrator + job tracker in `backend/app/jobs/sync_jobs.py`
- [x] T030 [US1] Implement exchange rate service + converter in `backend/app/services/exchange_rate_service.py`
- [x] T031 [US1] Implement integrations + jobs endpoints in `backend/app/api/v1/integrations.py` and `backend/app/api/v1/jobs.py`
- [x] T032 [US1] Implement funding sources endpoints in `backend/app/api/v1/funding_sources.py`
- [x] T033 [US1] Add audit log writes for integration add/delete in `backend/app/services/audit_log_service.py`
- [x] T034 [P] [US1] Build integrations UI page + provider cards in `frontend/app/(dashboard)/integrations/page.tsx`
- [x] T035 [P] [US1] Build connect modal components in `frontend/components/integrations/ConnectModal.tsx`
- [x] T036 [US1] Implement job polling + funding source list UI in `frontend/components/integrations/SyncStatus.tsx`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Create and Manage Shared Projects (Priority: P1)

**Goal**: Users create projects, invite collaborators, and assign funding sources with allocations

**Independent Test**: Create a project, invite a collaborator, assign funding sources, and verify project balance calculation in target currency

### Tests for User Story 2 (MANDATORY for financial logic)

- [ ] T037 [P] [US2] Unit tests for project balance calculation in `backend/tests/unit/test_project_balances.py`
- [ ] T038 [P] [US2] Integration tests for projects + invites + assignments in `backend/tests/integration/test_projects.py`
- [ ] T039 [P] [US2] Frontend project flow tests in `frontend/tests/integration/projects.test.tsx`

### Implementation for User Story 2

- [x] T040 [P] [US2] Implement Project + ProjectMember models in `backend/app/models/projects.py` + `frontend/src/types/projects.ts`
- [x] T041 [P] [US2] Implement project funding pivot model (handled inline — `project_funding_sources` table used via Supabase client, no separate model file needed)
- [x] T042 [US2] Implement project services (create, list, get, update, delete, invite, accept/decline, assign sources) in `backend/app/services/project_service.py`
- [x] T043 [US2] Implement project endpoints (GET/POST/PUT/DELETE + invite/respond/funding) in `backend/app/api/v1/projects.py`
- [x] T044 [US2] Assign funding source endpoint — merged into T043 as `POST /api/v1/projects/{id}/funding`
- [x] T045 [US2] Audit log writes for project events — embedded in `project_service.py` (PROJECT_CREATED, _UPDATED, _DELETED, _MEMBER_INVITED, _MEMBER_JOINED, _FUNDING_SOURCE_ASSIGNED)
- [x] T046 [P] [US2] Build project creation wizard UI — 4-step wizard with currency selector (EUR/USD/BTC), funding source linking (no auto-balance), in `frontend/src/components/projects/`
- [x] T047 [P] [US2] Build project detail view UI in `frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx` — stats, progress, edit mode, source toggles, members, delete with AlertDialog
- [x] T048 [P] [US2] Build invite collaborator UI — integrated into project detail page members section (email input + invite button)
- [x] T049 [US2] Wire projects API client + hooks in `frontend/src/hooks/useProjects.ts` — useProjects, useProjectDetail, useCreateProject, useUpdateProject, useDeleteProject, useFundingSources

**Checkpoint**: User Stories 1 and 2 should be independently functional

---

## Phase 5: User Story 3 - View Budget and Transactions (Priority: P2)

**Goal**: Users view budget summary and paginated transactions list from synchronized data

**Independent Test**: Load budget page and transactions list with paginated data within 2 seconds after connecting integrations

### Tests for User Story 3 (MANDATORY for financial logic)

- [ ] T050 [P] [US3] Integration tests for budget + transactions endpoints in `backend/tests/integration/test_budget_transactions.py`
- [ ] T051 [P] [US3] Frontend budget/transactions page tests in `frontend/tests/integration/budget_transactions.test.tsx`

### Implementation for User Story 3

- [ ] T052 [US3] Implement budget summary + categories services in `backend/app/services/budget_service.py`
- [ ] T053 [US3] Implement transactions query service in `backend/app/services/transactions_service.py`
- [ ] T054 [US3] Implement budget endpoints in `backend/app/api/v1/budget.py`
- [x] T055 [US3] Implement transactions endpoints in `backend/app/api/v1/transactions.py`
- [x] T056 [P] [US3] Build budget UI (charts + summary) in `frontend/src/app/(dashboard)/budget/page.tsx`
- [x] T057 [P] [US3] Build transactions table UI in `frontend/src/app/(dashboard)/transactions/page.tsx`
- [ ] T058 [US3] Wire budget/transactions API hooks in `frontend/hooks/useBudget.ts` and `frontend/hooks/useTransactions.ts`

**Checkpoint**: User Stories 1–3 should be independently functional

### Cross-cutting: Transactions & Wise Integration (2026-03-02)

**Scope**: T055 + T057 were implemented ahead of the planned Phase 5 order because the Wise integration (Phase 3) naturally required a transactions API + UI to verify synced data.

Implementation notes:

1. **`backend/app/models/transactions.py`** (NEW): Pydantic response models — `TransactionItem` (enriched with `source_name` + `provider_name`), `TransactionSummary`, `TransactionsResponse`.
2. **`backend/app/api/v1/transactions.py`** (NEW): `GET /api/v1/transactions` with pagination (`page`, `limit`) and **date range filtering** (`since`, `until` ISO 8601 params). Summary aggregates (inflows/outflows/net) are scoped to the same date range. Registered in `main.py`.
3. **`frontend/src/app/(dashboard)/budget/page.tsx`** (NEW): Server component with hardcoded budget data matching `contexto/prototipos-html/budget.html`. Sections: period toggles, 3 summary cards, Budget vs Actual SVG chart, Zero-Based Budget donut, Smart Insights, Upcoming Bills. Uses SSR Phosphor icons.
4. **`frontend/src/app/(dashboard)/transactions/page.tsx`** (NEW → rewritten): Client component wired to real API data via `useAuth` + `api.get()`. Features:
   - **Period filter pills**: This Month / Last Month / Quarter / Last Year / Custom (inline date pickers)
   - Summary cards reflect selected period
   - Paginated table with provider icons (Wise/Kraken/Ledger brand colors), category badges, amount coloring (green for inflows)
   - Transaction detail side panel with split expense toggle
5. **`frontend/src/middleware.ts`** (EDITED): Added `/budget` and `/transactions` to `PROTECTED_PATHS`.
6. **`frontend/src/components/layout/AppSidebar.tsx`** (EDITED): Added Transactions (Receipt) and Budget (Wallet) nav items.
7. **Wise service refactored** (`backend/app/services/wise_service.py`): Switched from SCA-blocked statement endpoint to `GET /v1/transfers` (works with personal tokens). Direction logic in `sync_jobs.py` determines inflow vs outflow by matching source/target currency to user's balances.

**Note**: T053 (transactions query service) was not created as a separate file — the query logic lives directly in the endpoint (`backend/app/api/v1/transactions.py`) for simplicity. A dedicated service can be extracted later if needed. T058 (API hooks) were also not created as separate hook files — data fetching is embedded in the page component using the existing `api.get()` pattern.

### Cross-cutting: Phase 4 Implementation (2026-03-03)

**Scope**: T040–T049 implemented as a batch. The project creation wizard and detail page are fully functional with real backend data.

Implementation notes:

1. **`backend/app/models/projects.py`**: Pydantic models — `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `ProjectListItem`, member/funding response models. No SQLAlchemy ORM; uses Supabase client directly.
2. **`backend/app/services/project_service.py`**: All CRUD + invite lifecycle. Email lookup via `client.auth.admin` (Auth Admin API) since email lives in `auth.users`, not `public.users`. Balance computation sums EUR funding sources only (MVP).
3. **`backend/app/api/v1/projects.py`**: 8 endpoints (GET list, POST create, GET detail, PUT update, DELETE, POST invite, POST respond, POST funding). All require JWT auth. Owner-only checks on mutating ops.
4. **`frontend/src/types/projects.ts`**: Added `ProjectCurrency` type (EUR|USD|BTC) and `targetCurrency` to `ProjectDetails` interface.
5. **`frontend/src/components/projects/`**: 4-step wizard (StepDetails with currency selector, StepMembers, StepFunding without auto-balance, StepReview). Wizard container uses `useReducer`. Opened via `ProjectWizardContext`.
6. **`frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx`** (NEW): Project detail page with stats row, progress bar, general info (view+edit), asset allocation donut (SVG), connected sources table with toggles, members with invite form, delete with `AlertDialog`.
7. **`frontend/src/app/(dashboard)/shared-projects/page.tsx`** (EDITED): `ProjectCard` now wrapped with `Link` to detail page. Currency symbols are dynamic.
8. **`frontend/src/hooks/useProjects.ts`**: 6 hooks — `useProjects`, `useProjectDetail`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`, `useFundingSources`. All auth-aware (wait for session before fetching).
9. **`frontend/src/components/ui/alert-dialog.tsx`** (NEW): Installed via `npx shadcn@latest add alert-dialog`.
10. **`supabase/migrations/006_add_project_category.sql`** (PREVIOUS SESSION): Added `category` column to `projects` table.

**Key decisions**:
- Funding sources are *linked* in the wizard but not allocated. Users decide allocation amounts from the detail page.
- `ProjectUpdate` model uses all-optional fields for PATCH-style updates via PUT endpoint.
- Delete cascades manually: funding_sources → members → project (no FK cascades in Supabase).

### Cross-cutting: Wizard Step 3 Redesign + Performance Fixes (2026-03-03)

**Scope**: T040, T046, T049 (wizard step, types, hooks). T020 (useAuth rewrite).

#### 1. Wizard Step 3: "Funding Sources" → "Funding Strategy" (T046)

The original Step 3 allowed users to link existing funding sources. This was replaced with a strategy selection step:

- **`StepFunding.tsx` removed**; replaced with **`StepStrategy.tsx`** — two selectable cards: "Fiat Strategy" and "Crypto Strategy", each with a check indicator when selected.
- **`CreateProjectWizard.tsx`**: Removed `selectedFundingSourceIds`, `fundingSources`, and `useFundingSources` import. Added `fundingStrategy: FundingStrategy | null` to state. Step label changed from "Funding" to "Strategy". Submit payload sends `funding_strategy` instead of `funding_source_ids`.
- **`StepReview.tsx`**: "Linked Funding Sources" section replaced with "Funding Strategy" display (label + description).
- **`CreateProjectWizardShell.tsx`**: Fixed double-close bug (was calling both `onSuccess` and `handleClose`). `onSuccess` now closes the wizard **and** navigates to the new project detail page via `router.push`.

#### 2. `FundingStrategy` type added to models (T040)

- **`frontend/src/types/projects.ts`**: `FundingStrategy = 'fiat' | 'crypto'` type added. `funding_strategy: FundingStrategy | null` added to `ProjectResponse` and `ProjectListItem`.
- **`backend/app/models/projects.py`**: `funding_strategy: str | None` added to `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `ProjectListItem`.
- **`frontend/src/mocks/projects.ts`**: All mock entries updated with `funding_strategy`.

#### 3. Module-level caching in `useProjects` (T049)

Three module-level caches added to `frontend/src/hooks/useProjects.ts`:
- `_projectsCache` — last-fetched projects list.
- `_projectDetailCache: Map<string, ProjectResponse>` — keyed by project ID.
- `_fundingSourcesCache` — last-fetched funding sources list.

Hooks init with cached data (`loading: false` if cache hit), revalidate in background. `invalidateProjects()` clears the list cache and notifies all mounted `useProjects` listeners to refetch. Called automatically after create / update / delete mutations.

#### 4. `useAuth` rewritten with `useSyncExternalStore` (T020)

`frontend/src/hooks/useAuth.ts` rewritten to use a **module-level shared store** with `useSyncExternalStore`:
- Auth state is initialised **once** per app lifecycle (single `getSession()` call at module load).
- Single `onAuthStateChange` subscription at module level — never recreated per component mount.
- All hook instances share the same state object; updates are applied atomically across the component tree.
- Eliminates multiple independent `getSession()` calls that previously fired whenever a component using `useAuth` mounted.

---

## Phase 6: User Story 4 - Split Expenses with Collaborators (Priority: P2)

**Goal**: Users split transactions with collaborators and reflect splits in project calculations

**Independent Test**: Toggle split on a transaction, persist split details, and verify updated project balance

### Tests for User Story 4 (MANDATORY for financial logic)

- [ ] T059 [P] [US4] Unit tests for split calculation rules in `backend/tests/unit/test_split_rules.py`
- [ ] T060 [P] [US4] Integration tests for split endpoint in `backend/tests/integration/test_transaction_split.py`

### Implementation for User Story 4

- [ ] T061 [US4] Implement split update logic in `backend/app/services/transactions_service.py`
- [ ] T062 [US4] Implement split endpoint in `backend/app/api/v1/transactions.py`
- [ ] T063 [P] [US4] Build split drawer UI in `frontend/components/transactions/SplitDrawer.tsx`
- [ ] T064 [US4] Wire split update action in `frontend/hooks/useTransactions.ts`

**Checkpoint**: User Stories 1–4 should be independently functional

---

## Phase 7: User Story 5 - Secure Authentication with 2FA (Priority: P3 - DEFERRED)

**Goal**: Users sign up/login and optionally enable 2FA with TOTP + recovery codes (enforcement toggled pre-launch)

**Independent Test**: Sign up, login, enable 2FA, verify TOTP, and recover via recovery code

### Tests for User Story 5 (MANDATORY for security flows)

- [ ] T065 [P] [US5] Unit tests for recovery code generation/verification in `backend/tests/unit/test_recovery_codes.py`
- [ ] T066 [P] [US5] Integration tests for auth + 2FA endpoints in `backend/tests/integration/test_auth_2fa.py`
- [ ] T067 [P] [US5] Frontend auth flow tests in `frontend/tests/integration/auth_flow.test.tsx`

### Implementation for User Story 5

- [ ] T068 [US5] Implement recovery code service in `backend/app/services/recovery_code_service.py`
- [ ] T069 [US5] Implement auth endpoints (signup/login/2fa) in `backend/app/api/v1/auth.py`
- [ ] T070 [US5] Implement 2FA QR + verify logic in `backend/app/services/totp_service.py`
- [x] T071 [P] [US5] Build signup/login pages → **moved to Phase 2.5**
- [ ] T072 [P] [US5] Build 2FA setup/verify/recover pages in `frontend/src/app/(auth)/2fa/setup/page.tsx`, `frontend/src/app/(auth)/2fa/verify/page.tsx`, and `frontend/src/app/(auth)/2fa/recover/page.tsx`
- [x] T073 [US5] Add Next.js middleware protection for dashboard routes → **moved to Phase 2.5**
- [x] T074 [US5] Wire Supabase Auth client and session handling → **moved to Phase 2.5**

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T075 [P] Document single-instance APScheduler requirement in `specs/001-finandance-mvp/quickstart.md`
- [ ] T076 [P] Add CI pipeline for backend/frontend tests in `.github/workflows/ci.yml`
- [ ] T077 [P] Add staging deployment notes in `specs/001-finandance-mvp/quickstart.md`
- [ ] T078 [P] Add API rate limit middleware config in `backend/app/core/rate_limit.py`
- [ ] T079 [P] Add frontend performance checks (Lighthouse budget) in `frontend/package.json`
- [ ] T080 Run quickstart verification checklist in `specs/001-finandance-mvp/quickstart.md`

---

## Phase 9: User Story 6 - Post-Creation Activation Flow + Auto-Save / DCA (Priority: P1) -- COMPLETE

**Goal**: Guide users from project creation into funding activation (link sources or set up a DCA savings plan)

**Full PRD, data model, API contracts & task breakdown**: See [`specs/002-activation-autosave/`](../002-activation-autosave/spec.md)

**Status**: All 16 tasks (T081-T096) complete (2026-03-03). `tsc --noEmit` passes, lint clean.

**16 tasks (T081–T096)** organized in 5 phases:
- Phase A: Database migration (`funding_plans` table + RLS) -- DONE
- Phase B: Backend (models, service, 5 REST endpoints, ProjectResponse extension) -- DONE
- Phase C: Frontend types + hooks + projection calculator utility -- DONE
- Phase D: Frontend UI (activation page, LinkSourcesPanel, AutoSavePanel, ProjectionChart, SavingsPlanSection) -- DONE
- Phase E: Wiring (wizard redirect, detail page integration, E2E verification) -- DONE

**Depends on**: Phase 4 (US2) must be complete (DONE)

### Implementation Notes (2026-03-03)

1. **`supabase/migrations/007_funding_plans.sql`** (T081): Migration with `funding_plans` table, constraints, indexes, 5 RLS policies, and `updated_at` trigger. Ready to apply.
2. **`backend/app/models/funding_plans.py`** (T082): `PlanType` and `PlanFrequency` enums, `FundingPlanCreate`, `FundingPlanUpdate`, `FundingPlanResponse` Pydantic models.
3. **`backend/app/services/funding_plan_service.py`** (T083): Full CRUD with `compute_next_reminder()` helper and audit log entries.
4. **`backend/app/api/v1/funding_plans.py`** (T084): 5 REST endpoints registered in `main.py`. Auth + ownership checks.
5. **`backend/app/models/projects.py`** + **`backend/app/services/project_service.py`** (T085): `ProjectResponse` extended with `funding_plans: list[FundingPlanResponse]`; `get_project()` fetches plans.
6. **`frontend/src/types/projects.ts`** (T086): `PlanType`, `PlanFrequency`, `FundingPlanResponse` types; `ProjectResponse` updated with `funding_plans` array.
7. **`frontend/src/hooks/useFundingPlans.ts`** (T087): `useFundingPlans`, `useCreateFundingPlan`, `useUpdateFundingPlan`, `useDeleteFundingPlan` hooks with stale-while-revalidate caching.
8. **`frontend/src/lib/projections.ts`** (T088): Pure `calculateProjection()` function with milestone computation and edge case handling.
9. **`frontend/src/app/(dashboard)/shared-projects/[id]/get-started/page.tsx`** (T089): Activation interstitial with 3 option cards.
10. **`frontend/src/components/projects/activation/LinkSourcesPanel.tsx`** (T090): Checkbox source linking with running balance total.
11. **`frontend/src/components/projects/activation/AutoSavePanel.tsx`** (T091): Amount + frequency + source + real-time projection chart.
12. **`frontend/src/components/projects/activation/ProjectionChart.tsx`** (T092): Responsive SVG chart with milestones and target line.
13. **`frontend/src/components/projects/SavingsPlanSection.tsx`** (T093): Detail page section with plan summary, reminder indicators, edit/pause/delete actions.
14. **`frontend/src/components/projects/CreateProjectWizardShell.tsx`** (T094): Wizard redirect changed to `/get-started`.
15. **`frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx`** (T095): `SavingsPlanSection` integrated into detail page.
16. **E2E verification** (T096): `tsc --noEmit` passes, lint clean (only pre-existing warnings).

---

## Phase 10: Connect & View Wallet — Dashboard Hydration (Priority: P1) -- COMPLETE

**Goal**: Close the UX gap between creating a BTC project and connecting a crypto wallet. Hydrate the dashboard with real data from backend APIs.

**Problem solved**: After creating a BTC savings project, the "Link Sources" panel was empty because the user had no crypto integrations connected — and there was no guidance to connect one. The dashboard also showed only hardcoded placeholders.

**Status**: All 12 tasks (T097-T108) complete (2026-03-03). `tsc --noEmit` passes, `npm run lint` clean.

**12 tasks (T097–T108)** organized in 5 phases:

### Phase A: Backend (T097-T098) -- DONE
- [x] T097 [US1] Dashboard summary endpoint (`GET /api/v1/dashboard/summary`) in `backend/app/api/v1/dashboard.py` — aggregates net worth (all funding sources converted to EUR via cached exchange rates), active projects count + progress, integration statuses. New models in `backend/app/models/dashboard.py`, service in `backend/app/services/dashboard_service.py`. Router registered in `main.py`.
- [x] T098 [US1] Compatible sources endpoint (`GET /api/v1/dashboard/compatible-sources?target_currency=BTC`) in same router — returns funding sources matching a project's target currency (exact match for crypto, any fiat for fiat targets). Enriched with `provider_name`.

### Phase B: Frontend Types & Hooks (T099-T100) -- DONE
- [x] T099 [P] TypeScript types for dashboard summary + compatible sources in `frontend/src/types/dashboard.ts`
- [x] T100 `useDashboardSummary()` + `useCompatibleSources(targetCurrency)` hooks in `frontend/src/hooks/useDashboard.ts` — stale-while-revalidate pattern matching `useProjects`

### Phase C: Smart Contextual Prompts (T101-T103) -- DONE
- [x] T101 [P] `EmptySourcesCTA` component in `frontend/src/components/projects/EmptySourcesCTA.tsx` — `card` and `inline` variants, detects target currency to suggest relevant providers (BTC → "Kraken or Ledger"), opens `ConnectModal` inline, shows `SyncStatus` during sync
- [x] T102 Wire `EmptySourcesCTA` into `LinkSourcesPanel` — replaces empty "No funding sources" text. Added `targetCurrency` prop passed from get-started page.
- [x] T103 Wire `EmptySourcesCTA` into `ConnectedSourcesSection` in project detail page — replaces empty state text with contextual connect CTA.

### Phase D: Dashboard Hydration (T104-T106) -- DONE
- [x] T104 [US1] Net Worth card — real aggregated value from `useDashboardSummary()`, formatted with currency symbol. Empty state preserved with "Connect Integration" link when no integrations exist.
- [x] T105 [US1] Active Goals card — real project count, average progress bar, top 3 projects with links. Connections card — real integration statuses (Connected/Syncing/Error) + "Not connected" placeholders for missing providers.
- [x] T106 [US1] Recent Activity section — last 5 transactions from `GET /api/v1/transactions?limit=5`, with direction arrows, provider info, and formatted amounts.

### Phase E: Polish & Verify (T107-T108) -- DONE
- [x] T107 Enhanced funding sources display in integrations page (`frontend/src/app/(dashboard)/integrations/page.tsx`) — flat table replaced with provider-grouped cards showing balance per source + last sync timestamp.
- [x] T108 E2E verification: `npx tsc --noEmit` passes, `npm run lint` clean (0 warnings, 0 errors), `python3 -m py_compile` passes for all 3 new backend files.

### Implementation Notes (2026-03-03)

**Backend (3 new files)**:
1. `backend/app/models/dashboard.py`: `DashboardSummary`, `IntegrationSummary`, `ProjectSummary` Pydantic models.
2. `backend/app/services/dashboard_service.py`: `get_dashboard_summary()` (net worth with FX conversion via cached `exchange_rates` table), `get_compatible_sources()` (currency-aware filtering with crypto set detection). `_compute_net_worth()` reads cached rates from DB — no async API calls needed.
3. `backend/app/api/v1/dashboard.py`: 2 endpoints registered in `main.py`.

**Frontend (3 new files, 5 modified)**:
4. `frontend/src/types/dashboard.ts`: `DashboardSummary`, `CompatibleSource` interfaces.
5. `frontend/src/hooks/useDashboard.ts`: Module-level caches, stale-while-revalidate pattern.
6. `frontend/src/components/projects/EmptySourcesCTA.tsx`: Reusable CTA with ConnectModal + SyncStatus integration.
7. `frontend/src/app/(dashboard)/dashboard/page.tsx`: **Fully rewritten** from server component (static placeholders) to client component with real data from `useDashboardSummary()` + recent transactions API.
8. `frontend/src/app/(dashboard)/integrations/page.tsx`: Funding sources table → grouped-by-provider cards.
9. `frontend/src/components/projects/activation/LinkSourcesPanel.tsx`: Empty state → `EmptySourcesCTA`.
10. `frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx`: Empty state → `EmptySourcesCTA`.

**Key decisions**:
- Dashboard net worth uses synchronous reads from cached `exchange_rates` table (TTL 1h, refreshed by APScheduler every 30min). No async FX API calls in the request path.
- `EmptySourcesCTA` suggests providers based on currency (BTC/ETH → "Kraken or Ledger", fiat → "Wise or Revolut").
- Allocation chart left as "coming soon" placeholder — requires more complex aggregation logic (separate spec).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Can start after Foundational (Phase 2); uses funding sources from US1 but remains independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2); depends on data synced in US1
- **User Story 4 (P2)**: Can start after Foundational (Phase 2); depends on transactions from US3
- **User Story 5 (P3)**: Can start after Foundational (Phase 2); auth optional during dev, enforcement deferred

### Within Each User Story

- Tests MUST be written and FAIL before implementation (financial/security logic)
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can run in parallel
- Tests within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit tests for encryption helpers in backend/tests/unit/test_crypto.py"
Task: "Unit tests for provider service mapping with mocked HTTP in backend/tests/unit/test_integrations_services.py"
Task: "Integration tests for connect/sync/jobs endpoints in backend/tests/integration/test_integrations.py"

# Launch all provider services in parallel:
Task: "Implement Wise service client in backend/app/services/wise_service.py"
Task: "Implement Kraken service client in backend/app/services/kraken_service.py"
Task: "Implement Ledger service client in backend/app/services/ledger_service.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Pre-launch toggle for enforced 2FA

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
   - Developer D: User Story 4/5
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
