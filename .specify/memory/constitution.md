# Finandance Constitution
<!-- Fintech MVP - Shared Financial Projects Platform -->

## Vision and Purpose

We are building a premium personal finance web application focused on **"Shared Projects" (Shared Projects)**. It allows users (couples, friends, partners) to consolidate and visualize their combined wealth by integrating external sources (banks, exchanges, cold wallets) toward common financial goals.

## Core Principles

### I. Security Over Convenience (NON-NEGOTIABLE)
Banking security is non-negotiable. 2FA is mandatory from first login. Third-party credentials MUST NEVER be stored in plaintext. All API keys must be encrypted using Fernet before database insertion.

### II. Privacy and GDPR Compliance
All services must be hosted in the European Union. Account deletions must use `ON DELETE CASCADE` to guarantee the "Right to be Forgotten". User data must be processable and deletable per GDPR requirements.

### III. Separation of Responsibilities (NON-NEGOTIABLE)
Frontend (Next.js) is SOLELY responsible for the interface. ALL business logic, financial calculations, and external API communication MUST occur in the Backend (Python). The frontend MUST NEVER receive, see, or store banking API tokens.

### IV. Test-First Development
TDD mandatory for all financial logic: Tests written → User approved → Tests fail → Then implement. Decimal precision tests are mandatory for all currency calculations.

### V. Performance and Reliability
Financial data must load instantly (<200ms). Optimistic UI updates with rollback on failure. Decimal/Numeric data types must be used throughout (Python Decimal, PostgreSQL Numeric) to avoid floating-point errors.

## Additional Constraints

### Technology Stack

#### Frontend (The Face)
- **Framework**: Next.js (App Router) hosted on Vercel (Region: Frankfurt `fra1` or Paris `cdg1`)
- **Language**: TypeScript (Strict mode enabled, no implicit `any`)
- **Styles**: Tailwind CSS
- **Base Components**: shadcn/ui
- **Financial Charts**: Tremor

#### Backend (The Brain)
- **Framework**: FastAPI hosted on Railway/Render (Region: Europe)
- **Language**: Python 3.11+
- **Dependency Manager**: `uv`
- **Task Scheduling**: APScheduler (for periodic balance synchronizations)

#### Database and Authentication (The Foundations)
- **Database**: PostgreSQL hosted on Supabase (Region: Frankfurt or London)
- **ORM (Backend)**: SQLAlchemy or SQLModel
- **Authentication**: Supabase Auth with 2FA (Authenticator App/TOTP) configured as MANDATORY

### UI/UX Design Guide - STRICT MODE

The AI agent MUST adhere to this visual aesthetic for every generated component. NO "Flat" designs or generic Material Design allowed.

> **Design Tokens**: See [`design-tokens-nova.json`](design-tokens-nova.json) for complete color values, spacing, and radius tokens. This file is the source of truth - always reference it for exact values.

#### Global Theme
- **Light Mode Only** (Modo Claro). Global background: Very light gray / Off-white (`bg-slate-50`)

#### Container Style ("Soft UI" / Modern Neumorphism)
- All widgets, cards, and side panels must have pure white background (`bg-white`)
- Very rounded borders (`rounded-2xl` or `rounded-3xl`)
- Multiple soft, deep shadows (`shadow-xl` or custom) to appear elevated and tactile over the gray background

#### Color Palette
- **Primary Accent**: Emerald Green / Teal (from `design-tokens-nova.json`: `oklch(0.60 0.13 163)` for primary, `oklch(0.70 0.15 162)` for dark mode). Represents growth, primary buttons, and active states
- **Text**: Dark slate (`text-slate-800` for titles, `text-slate-500` for subtitles)
- **Chart Colors**: Use chart-1 through chart-5 from `design-tokens-nova.json` for financial data visualization

#### Typography (Dual System)
- **Lora (Serif)**: EXCLUSIVE USE for large headings (H1, H2), Card Titles, and Large Currency/Balance numbers (e.g., €45,000). Conveys elegance and "Private Banking"
- **Lato (Sans-Serif)**: EXCLUSIVE USE for body text, labels, tables, inputs, and navigation
- **Note**: Font loading and configuration managed via Next.js font optimization (see `design-tokens-nova.json` config: `font: "geist-mono"` as reference, but override with Lora/Lato per this guide)

### Security and Data Handling Rules

#### Integration Golden Rule
API keys (Wise, Kraken) MUST be encrypted by the Python backend using the `cryptography` library (Fernet module) BEFORE being inserted into PostgreSQL (Supabase).
- Only decrypt in Python server RAM during request execution
- Frontend MUST NEVER receive, view, or store banking API tokens
- Monetary amounts must be processed and stored using precise data types (`Numeric`/`Decimal` in database and Python) to avoid floating-point errors in balance calculations

### Integrations (Scope V1)

External connection scope is strictly limited to:
1. **Wise (TransferWise)**: Via REST API (Read-Only) to read "Jars/Pockets" balances
2. **Kraken**: Via REST API (Read-Only) to read cryptocurrency balances
3. **Ledger / Cold Wallets**: No direct API. Balance read from blockchain using public explorer APIs (e.g., Mempool.space for BTC) based on public addresses provided by user

## Development Workflow

### Code Review Requirements
- All PRs require at least one review
- Financial logic changes require specific test coverage
- Security review for data handling changes
- 2FA compliance verification for auth changes

### Testing Gates
- Unit tests for all utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows (login with 2FA, add integration, view combined balance)
- Minimum 80% code coverage for financial modules
- Decimal precision tests mandatory for all currency calculations

### Quality Standards
- ESLint with strict config
- TypeScript: noImplicitAny, strictNullChecks enabled
- Python: type hints required, Pydantic for validation
- Prettier for consistent formatting
- Husky pre-commit hooks

## Governance

**Version**: 1.0.0 | **Ratified**: 2026-02-22 | **Last Amended**: 2026-02-22

---

## Sync Impact Report
- Version change: 0.0.0 → 1.0.0 (Initial ratification)
- Modified principles: N/A (Initial creation)
- Added sections:
  - Vision and Purpose
  - Core Principles (5 principles)
  - Additional Constraints (Technology Stack, UI/UX Design Guide, Security Rules, Integrations)
  - Development Workflow (Code Review, Testing Gates, Quality Standards)
- Removed sections: N/A
- Templates requiring updates:
  - ✅ `.specify/templates/plan-template.md` - No conflicts detected
  - ✅ `.specify/templates/spec-template.md` - No conflicts detected
  - ✅ `.specify/templates/tasks-template.md` - No conflicts detected
- Follow-up TODOs: None
