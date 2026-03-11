# Implementation Plan: Finandance MVP

**Branch**: `001-finandance-mvp` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from Finandance MVP - Premium personal finance platform with shared projects and cash flow control

## Summary

Build a full-stack fintech MVP with Next.js frontend and FastAPI backend, connecting to Wise, Kraken, and Ledger APIs for financial data aggregation. The application enables users to create shared financial projects with collaborators, track budgets across multiple currencies, and split expenses. **2FA infrastructure (TOTP + recovery codes) is built from day one but enforcement is deferred to pre-launch to allow frictionless development. A single Supabase config toggle activates mandatory enforcement before going live.**

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript strict mode (Frontend)
**Primary Dependencies**: FastAPI, Next.js 14+, SQLAlchemy/SQLModel, Supabase Auth, shadcn/ui
**Charts**: Tremor (verify React 19 compatibility before installing — see Phase 1 note) or Recharts fallback
**Storage**: PostgreSQL (Supabase, EU region — Frankfurt `fra1` or London `eu-west-2`)
**Testing**: pytest + pytest-asyncio (backend), Vitest (frontend)
**Target Platform**: Web application (Vercel + Railway/Render, EU region)
**Project Type**: Full-stack web application (Frontend + Backend API)
**Performance Goals**: <200ms API response (p95), <2s page load, async integration sync
**Constraints**: EU data residency, mandatory 2FA from first login, API keys encrypted at rest with Fernet MultiFernet, APScheduler single-instance deployment

## Constitution Check

✅ **PASSED** - The plan adheres to the Finandance Constitution:

- **Security Over Convenience (NON-NEGOTIABLE)**: 2FA infrastructure built from day one (optional during dev, enforced pre-launch), Fernet MultiFernet encryption for API keys, recovery codes generated at 2FA setup
- **Privacy and GDPR**: EU hosting (Frankfurt/London), `ON DELETE CASCADE` for user data deletion, audit log for security events
- **Separation of Responsibilities (NON-NEGOTIABLE)**: Next.js for UI only, Python FastAPI for all business logic, financial calculations, and external API communication
- **Technology Stack**: Next.js App Router, TypeScript strict, FastAPI, Python 3.11+, PostgreSQL on Supabase, uv
- **UI/UX**: Light mode only, Soft UI/Neumorphism, Lora/Lato typography, Emerald/Teal accent colors, shadcn/ui base components

## Project Structure

### Documentation (this feature)

```text
specs/001-finandance-mvp/
├── plan.md              # This file
├── spec.md              # Feature specification
├── data-model.md        # Database schema and entities
├── quickstart.md        # Development setup guide
├── contracts/
│   └── api-contracts.md # API endpoint contracts
└── tasks.md             # Task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Backend (Python FastAPI)
backend/
├── app/
│   ├── api/v1/          # Versioned API endpoints (routers)
│   ├── core/            # Config, security, auth (JWT validation, Fernet)
│   ├── models/          # SQLAlchemy models
│   ├── services/        # Business logic (Wise, Kraken, Ledger, exchange rates)
│   ├── jobs/            # Background sync job management
│   └── main.py          # FastAPI app entry (global exception handler, CORS)
├── tests/
│   ├── unit/            # Pure logic tests (encryption, calculations)
│   └── integration/     # DB and API endpoint tests
├── pyproject.toml       # uv-managed dependencies
└── .env.example         # Template — never commit .env

# Frontend (Next.js)
frontend/
├── app/
│   ├── (auth)/          # Login, signup, 2FA setup, 2FA verify, recover routes
│   ├── (dashboard)/     # Protected routes: dashboard, integrations, projects, budget, transactions
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── dashboard/       # Net worth widgets, charts
│   └── projects/        # Project cards, invite flow, member list
├── lib/                 # API client (typed fetch wrapper), utils
├── hooks/               # useAuth, useSyncJob, useProjects, etc.
└── .env.example         # Template — never commit .env.local

# Database
supabase/
└── migrations/          # Sequential SQL migration files
```

**Structure Decision**: Separate `backend/` and `frontend/` directories at repository root. PostgreSQL on Supabase with RLS enforced at DB level. API versioned under `/api/v1/` from the start.

## Implementation Phases

### Phase 1: Base Infrastructure, Quality Gates, and Security Foundation

**Objective**: Establish project foundations including testing, linting, and mandatory security setup from day one

1. **Frontend Initialization (Next.js)**:
   - Initialize Next.js 14+ App Router project with TypeScript strict mode
   - Configure Tailwind CSS, `globals.css` (colors: Emerald/Teal, bg-slate-50), Lora/Lato fonts via Next.js font optimization
   - **Tremor compatibility check**: Verify `@tremor/react` supports React 19 before installing. If not compatible, use Recharts directly (shadcn/ui's underlying chart library) as drop-in replacement
   - Install: `lucide-react`, `clsx`, `tailwind-merge`, shadcn/ui CLI, Supabase JS SDK
   - Create folder structure per above

2. **Backend Initialization (FastAPI)**:
   - Create Python 3.11+ environment with `uv`
   - Initialize FastAPI project with `pyproject.toml`
   - Install dependencies: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `asyncpg`, `cryptography` (Fernet), `httpx`, `supabase`, `python-jose[cryptography]`, `APScheduler`, `pydantic-settings`
   - Configure `app/core/config.py` using Pydantic Settings (reads from `.env`)
   - **JWT validation**: Implement `get_current_user` FastAPI dependency using `SUPABASE_JWT_SECRET` to validate Supabase RS256 tokens on every protected route
   - **Global exception handler**: Override FastAPI default `{"detail": "..."}` with `{"error": {"code": "...", "message": "..."}}` format

3. **Testing Infrastructure (TDD prerequisite)**:
   - Backend: Configure `pytest`, `pytest-asyncio`, `httpx` (async test client), `pytest-cov`. Create `tests/conftest.py` with async DB session fixture pointing to a test schema
   - Frontend: Configure Vitest with `@testing-library/react`. Create `vitest.config.ts`. Add `test` and `test:coverage` npm scripts
   - Both must be working before any business logic is written (TDD requirement per Constitution)

4. **Code Quality Gates (Husky + Linting)**:
   - Frontend: `npx husky init`, configure `lint-staged` to run ESLint + Prettier on staged files before every commit
   - Backend: Configure `ruff` for linting and `mypy` for type checking. Add pre-commit hook
   - Add `.env` and `.env.local` to `.gitignore`. Create `.env.example` files for both backend and frontend

5. **Supabase Configuration (PostgreSQL + Auth)**:
   - Create Supabase project in EU region (Frankfurt `fra1` or London)
   - Enable Email/Password Auth. Configure TOTP MFA as **optional** during development. **Pre-launch checklist**: flip Supabase Auth MFA setting to "required" before going live — no code changes needed
   - Execute SQL migrations: create all tables per `data-model.md` (users, integrations, funding_sources, project_funding_sources, projects, project_members, transactions, exchange_rates, audit_log)
   - Apply all RLS policies per `data-model.md` — **test that cross-user data isolation works before proceeding to Phase 2**
   - Apply all performance indexes

### Phase 2: Backend — Security and Base Services (Python)

**Objective**: Create encrypted credential vault, external provider services, and sync infrastructure

1. **Security Module (Credential Vault)**:
   - Implement Fernet encryption using `MultiFernet` (supports key rotation via a list of keys from `MASTER_ENCRYPTION_KEY` env var)
   - Create `encrypt_token()` and `decrypt_token()` functions
   - **Key rotation strategy**: `MASTER_ENCRYPTION_KEY` accepts comma-separated keys; first key encrypts, all keys can decrypt. Rotation = add new key as first, re-encrypt existing keys in background job
   - Write unit tests for encryption/decryption with Decimal precision validation

2. **2FA Recovery Code Service**:
   - Generate 8 alphanumeric recovery codes at 2FA setup
   - Hash codes with bcrypt before DB storage (table: `user_recovery_codes`)
   - Expose `verify_recovery_code()` that marks code as used and writes to `audit_log`

3. **Integration Services (Read-Only)**:
   - **Wise Service**: `httpx` async client to `api.transferwise.com`. Fetch Balances (Jars) and Transactions. Map to `funding_sources` and `transactions` schema
   - **Kraken Service**: Authenticated client (`Private/Balance`, `Private/Ledgers`). Map to schema
   - **Ledger/Blockchain Service**: Query Mempool.space (BTC) or Etherscan (ETH) using public address. No API key needed
   - Write unit tests for each service with mocked HTTP responses (pytest + `respx`)

4. **Exchange Rate Service**:
   - Fetch rates from ECB API (EU-based, free) for all fiat currencies
   - Fetch crypto rates from CoinGecko or Kraken public API
   - Store in `exchange_rates` table. TTL: 1 hour. APScheduler refreshes every 30 minutes
   - `convert_to_base()` utility: converts any amount+currency to EUR using cached rates

5. **Sync Job Architecture (APScheduler)**:
   - **IMPORTANT**: APScheduler runs in-process. Deploy backend as single instance (`--workers 1`) on Railway/Render to avoid duplicate syncs. Document this in `quickstart.md`
   - Background sync job: decrypt API key → call provider service → upsert `funding_sources` → upsert `transactions` (idempotent via `external_transaction_id` UNIQUE constraint) → update `balance_in_base_currency` → write `last_synced_at`
   - Job status tracked in-memory (or Redis for V2) and exposed via `GET /api/v1/jobs/{job_id}`

### Phase 3: Backend — API Endpoints (FastAPI)

**Objective**: Expose all data to the frontend via versioned, authenticated endpoints

1. **Auth Endpoints**:
   - Thin wrappers around Supabase Auth SDK for signup/login
   - `POST /auth/2fa/setup`: generate TOTP secret + recovery codes, return once
   - `POST /auth/2fa/verify`: validate TOTP code, complete session
   - `POST /auth/2fa/recover`: validate recovery code, consume it, write audit log

2. **Dashboard Endpoints**:
   - `GET /api/v1/dashboard/net-worth?currency=EUR`: sum `balance_in_base_currency` from all user's funding sources, include `exchange_rates_as_of` timestamp
   - `GET /api/v1/dashboard/summary`: KPIs + top projects + recent transactions

3. **Integrations + Jobs Endpoints**:
   - `POST /api/v1/integrations/connect`: encrypt API key, save integration, queue initial sync, return `job_id`
   - `POST /api/v1/integrations/{id}/sync`: queue background sync, return `202` with `job_id`
   - `GET /api/v1/jobs/{job_id}`: return sync job status (QUEUED/RUNNING/COMPLETED/FAILED)

4. **Projects Endpoints**:
   - Full CRUD for projects, invitation flow (invite → accept/decline → leave)
   - `POST /api/v1/funding-sources/{id}/assign`: link source to project via `project_funding_sources`
   - `GET /api/v1/projects/{id}`: return project with current balance in `target_currency` (using exchange rates)

5. **Budget and Transactions Endpoints**:
   - `GET /api/v1/transactions?page=1&limit=50&sort=transaction_date&order=desc`: paginated with `total_count`
   - `PATCH /api/v1/transactions/{id}/split`: update `is_split`, `split_with_user_id`, `split_amount`
   - `GET /api/v1/budget/summary` and `/budget/categories`

6. **Audit Logging**:
   - Inject `audit_log` writes for all sensitive operations: integration add/delete, project create, member invite/join, 2FA events, recovery code use

### Phase 4: Frontend — Design System and Authentication (Mandatory 2FA)

**Objective**: Apply Constitution visual rules and implement complete auth flow including mandatory 2FA

Reference screens from `/stitch/`: `login.html`, `signup.html`, `onboarding-step-1.html`, `onboarding-step-2.html`, `onboarding-step-3.html`

> **Architectural update (2026-03-02) -- OKLCH Migration & Semantic Token Enforcement:**
> The design system foundation described below was implemented and subsequently cleaned up:
> - **Color space**: All CSS custom properties in `globals.css` now use **OKLCH** values sourced directly from `design-tokens-nova.json` (replacing manual HSL conversions that had bugs).
> - **Tailwind config**: `tailwind.config.ts` uses `oklch()` wrapper (not `hsl()`). Missing sidebar tokens added.
> - **Semantic tokens enforced**: ~180 hardcoded Tailwind color classes were replaced with semantic token classes across 10 component files. All future UI work must use semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-chart-1`, etc.) -- no direct palette classes like `bg-emerald-600` or `text-slate-500`.
> - **Font classes**: Use `font-sans` (Lato) and `font-serif` (Lora) exclusively -- never `font-lato`/`font-lora`.

1. **Design System (Soft UI)**:
   - Apply CSS variables in `globals.css`: Emerald `oklch(0.60 0.13 163)` primary, `bg-slate-50` background, `text-slate-800/500`
   - Base card component: `bg-white rounded-2xl shadow-xl` (elevated, tactile appearance)
   - Typography: Lora for H1/H2 and balance numbers, Lato for body/labels/nav/inputs

2. **Authentication Flow (2FA optional during dev, enforced pre-launch)**:
   - `/signup` → collects email+password → calls `/auth/signup` → main app (2FA setup available but not forced)
   - `/login` → email+password → main app; if user has 2FA enabled → redirects to `/auth/2fa/verify`
   - `/auth/2fa/setup` → displays QR code + 8 recovery codes → available from security settings
   - `/auth/2fa/verify` → TOTP input for users who have 2FA enabled
   - `/auth/2fa/recover` → recovery code input for device-lost scenario
   - Next.js Middleware: protects `/(dashboard)` routes via Supabase cookie presence check (Edge Runtime compatible — no `@supabase/ssr` in middleware due to Next.js 14 Edge Runtime limitations). Full cryptographic session validation happens in `(dashboard)/layout.tsx` via `createSupabaseServerClient`. 2FA gate activates when Supabase enforces MFA

### Phase 5: Frontend — Main Views (Dashboard & Integrations)

**Objective**: Connect UI with Python API, implement core data visualization

Reference screens: `dashboard.html`, `dashboard-2.html`, `integrations.html`

1. **Main Layout**:
   - Sidebar navigation (Lato font, emerald active states) + Header with user avatar
   - Global API client: typed fetch wrapper with JWT header injection and error normalization

2. **Integrations Hub (`/integrations`)**:
   - Provider cards (Wise, Kraken, Ledger) with connection modals
   - Connection modal for each provider with appropriate input (API key or public address)
   - Sync status polling: after connecting, poll `GET /api/v1/jobs/{job_id}` every 2s, show progress indicator
   - Table of discovered `funding_sources` with assign-to-project action

3. **Global Dashboard (`/dashboard`)**:
   - Net Worth KPI card (Lora font for balance number)
   - Asset Allocation Donut Chart
   - Shared Projects progress list
   - Exchange rate disclosure: show `exchange_rates_as_of` timestamp when balances involve conversion

### Phase 6: Frontend — Core Features (Projects & Cash Flow)

**Objective**: Complete collaborative experience and budget auditing

Reference screens: `goal-details.html`, `budget.html`, `transactions.html`, `portfolio.html`

1. **Shared Projects Flow**:
   - Multi-step creation wizard modal (name → target amount + currency → target date → invite)
   - Project Detail view (`/projects/[id]`): progress bar, member list, assigned funding sources
   - Invite collaborator: email input → success confirmation

2. **Budget and Transactions (`/budget` and `/transactions`)**:
   - Budget view: Spending vs Budget Area Chart + Category Donut Chart
   - Transactions: paginated table with `page`, `limit`, filtering by category/source, infinite scroll or page controls
   - **Split Expense**: slide-out panel on transaction click, "Split with partner" toggle, optional custom amount field, connects to `PATCH /api/v1/transactions/{id}/split`

### Phase 7: DevOps and Deployment

**Objective**: CI/CD pipeline and staging environment for safe, automated deployments

1. **GitHub Actions CI**:
   - On every PR: run `pytest` (backend) + `vitest` (frontend) + ESLint + mypy
   - Block merge if any check fails

2. **Staging Deployment**:
   - Frontend: auto-deploy PR preview to Vercel (EU region)
   - Backend: deploy to Railway/Render EU with `--workers 1` (single-instance for APScheduler)
   - Separate Supabase staging project (EU region) with its own env vars

3. **Environment Variable Management**:
   - All secrets managed via platform dashboards (Vercel env vars, Railway env vars)
   - Never committed to git
   - Document required vars in `quickstart.md`

---

## Complexity Tracking

| Complexity Item | Justification | Simpler Alternative Rejected Because |
|-----------------|--------------|--------------------------------------|
| Dual repository (frontend + backend) | Required by Constitution (NON-NEGOTIABLE separation of concerns) | Single repo would mix concerns |
| Fernet MultiFernet encryption for API keys | Security requirement — supports key rotation without re-deploying | Single-key Fernet can't rotate without re-encrypting all keys at once |
| 2FA infrastructure built pre-enforcement | Full TOTP + recovery code system built now; Supabase enforcement toggled pre-launch | Building it later risks rushed implementation near launch |
| Async sync with job polling | UX requirement — Wise/Kraken can take 5-30s; blocking sync would freeze UI | Synchronous sync gives poor UX |
| `project_funding_sources` many-to-many | Funding sources can contribute to multiple projects with partial allocation | Direct FK on `funding_sources` only allows 1 project per source |
| `exchange_rates` table + base currency calculation | Required for cross-currency net worth on dashboard | Without conversion, multi-currency totals are meaningless |
| APScheduler single-instance constraint | Prevents duplicate syncs; must document and enforce `--workers 1` | Multi-instance would require Redis-backed distributed lock (V2) |

---

## Next Steps

- Run `/speckit.tasks` to break this plan into atomic tasks
- Verify Tremor + React 19 compatibility before Phase 1 frontend work
- Confirm EU region availability for Railway/Render
