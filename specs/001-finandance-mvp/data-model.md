# Data Model: Finandance MVP

## Overview

This document defines the database schema and entity relationships for the Finandance MVP. All entities map to PostgreSQL tables in Supabase.

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│    users    │       │   integrations   │       │   funding_sources    │
├─────────────┤       ├──────────────────┤       ├──────────────────────┤
│ id (PK)     │◄──────│ user_id (FK)     │◄──────│ integration_id (FK)  │
│ full_name   │       │ provider_name    │       │ user_id (FK)         │
│ avatar_url  │       │ encrypted_key?   │       │ external_id          │
│ created_at  │       │ public_address   │       │ name                 │
└─────────────┘       │ status           │       │ asset_type           │
                      │ last_synced_at   │       │ currency             │
                      │ updated_at       │       │ current_balance      │
                      └──────────────────┘       │ balance_base_curr    │
                                                 │ updated_at           │
                                                 └──────────────────────┘
                                                           │
                                          ┌────────────────┘
                                          ▼
                               ┌──────────────────────────┐
                               │  project_funding_sources │
                               ├──────────────────────────┤
                               │ project_id (FK)          │◄───┐
                               │ funding_source_id (FK)   │    │
                               │ allocated_amount         │    │
                               └──────────────────────────┘    │
                                                               │
                                               ┌──────────────┴──┐
                                               │    projects     │
                                               ├─────────────────┤
                                               │ id (PK)         │
                                               │ name            │
                                               │ target_amount   │
                                               │ target_currency │
                                               │ target_date     │
                                               │ created_by (FK) │
                                               │ created_at      │
                                               │ updated_at      │
                                               └─────────────────┘
                                                         │
                                               ┌─────────▼───────────┐
                                               │  project_members    │
                                               ├─────────────────────┤
                                               │ project_id (FK)     │
                                               │ user_id (FK)        │
                                               │ role                │
                                               │ invited_by (FK)     │
                                               └─────────────────────┘
                                                         │
                                               ┌─────────▼───────────┐
                                               │    transactions     │
                                               ├─────────────────────┤
                                               │ id (PK)             │
                                               │ source_id (FK)      │
                                               │ ext_trans_id        │
                                               │ amount              │
                                               │ currency            │
                                               │ description         │
                                               │ category            │
                                               │ trans_date          │
                                               │ is_split            │
                                               │ split_with          │
                                               │ split_amount        │
                                               └─────────────────────┘

┌───────────────────┐       ┌──────────────────────────────────────────────┐
│  exchange_rates   │       │                 audit_log                    │
├───────────────────┤       ├──────────────────────────────────────────────┤
│ id (PK)           │       │ id (PK)                                      │
│ from_currency     │       │ user_id (FK)                                 │
│ to_currency       │       │ action                                       │
│ rate              │       │ resource_type                                │
│ fetched_at        │       │ resource_id                                  │
└───────────────────┘       │ metadata (JSONB)                             │
                            │ created_at                                   │
                            └──────────────────────────────────────────────┘
```

## Database Tables

### Table: `users`

Standard Supabase auth.users table. Extended with profile data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK auth.users | User identifier |
| full_name | VARCHAR(255) | | User's full name |
| avatar_url | VARCHAR(500) | NULLABLE | Profile picture URL |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |

### Table: `integrations`

Stores connections to financial providers. API keys are Fernet-encrypted.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Integration identifier |
| user_id | UUID | FK users.id, CASCADE | Owner user |
| provider_name | ENUM('WISE', 'KRAKEN', 'LEDGER') | NOT NULL | Provider type |
| encrypted_api_key | TEXT | **NULLABLE** | Fernet-encrypted API key (NULL for Ledger) |
| public_address | VARCHAR(255) | NULLABLE | For Ledger/cold wallet public addresses |
| status | ENUM('ACTIVE', 'ERROR', 'PENDING') | DEFAULT 'PENDING' | Connection status |
| last_synced_at | TIMESTAMP | NULLABLE | Last successful sync |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last record update |

**DB-level constraints**:
- `UNIQUE(user_id, provider_name)` — One integration per provider per user, enforced at DB level
- `CHECK (encrypted_api_key IS NOT NULL OR public_address IS NOT NULL)` — At least one credential required

### Table: `funding_sources`

Discovered accounts/wallets from integrations (Jars, Pockets, Wallets).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Funding source ID |
| integration_id | UUID | FK integrations.id, CASCADE | Parent integration |
| user_id | UUID | FK users.id, CASCADE | Owner user |
| external_source_id | VARCHAR(255) | NOT NULL | ID at provider |
| name | VARCHAR(255) | NOT NULL | Display name |
| asset_type | VARCHAR(50) | NOT NULL | fiat, crypto, etc. |
| currency | VARCHAR(10) | NOT NULL | ISO 4217 code (EUR, USD, BTC, ETH…) |
| current_balance | NUMERIC(18,8) | NOT NULL, DEFAULT 0 | Native balance |
| balance_in_base_currency | NUMERIC(18,2) | NULLABLE | Balance converted to EUR (updated at each sync) |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last balance update |

**Design note**: `funding_sources` no longer holds a direct `project_id` FK. Project assignment is managed via `project_funding_sources` (many-to-many), allowing one source to contribute to multiple projects with optional partial allocation.

### Table: `project_funding_sources`

Many-to-many pivot between projects and funding sources. Enables partial allocation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| project_id | UUID | FK projects.id, CASCADE | Project reference |
| funding_source_id | UUID | FK funding_sources.id, CASCADE | Funding source reference |
| allocated_amount | NUMERIC(18,8) | NULLABLE | Explicit allocated amount; NULL = use full balance |

**Primary Key**: (project_id, funding_source_id)

### Table: `projects`

Shared financial goals.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Project ID |
| name | VARCHAR(255) | NOT NULL | Project name |
| target_amount | NUMERIC(18,2) | NOT NULL | Financial goal amount |
| target_currency | VARCHAR(10) | NOT NULL, DEFAULT 'EUR' | Currency for target (ISO 4217) |
| target_date | DATE | NULLABLE | Target completion date |
| created_by | UUID | FK users.id | Project creator |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

### Table: `project_members`

Collaboration pivot table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| project_id | UUID | FK projects.id, CASCADE | Project reference |
| user_id | UUID | FK users.id, CASCADE | Member reference |
| role | ENUM('OWNER', 'MEMBER', 'PENDING_INVITE') | NOT NULL | Member role |
| invited_by | UUID | FK users.id, NULLABLE | User who sent the invitation (audit trail) |

**Primary Key**: (project_id, user_id)

### Table: `transactions`

Synchronized transaction history for budgeting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Transaction ID |
| funding_source_id | UUID | FK funding_sources.id, CASCADE | Source account |
| external_transaction_id | VARCHAR(255) | UNIQUE | Provider's ID (idempotency key for sync) |
| amount | NUMERIC(18,8) | NOT NULL | +/- amount in native currency |
| currency | VARCHAR(10) | NOT NULL | Currency code |
| description | VARCHAR(500) | NULLABLE | Transaction text |
| category | VARCHAR(100) | NULLABLE | User-assigned category |
| transaction_date | TIMESTAMP | NOT NULL | Transaction date |
| is_split | BOOLEAN | DEFAULT FALSE | Split enabled? |
| split_with_user_id | UUID | FK users.id, NULLABLE | Split partner |
| split_amount | NUMERIC(18,8) | NULLABLE | Explicit split amount; NULL = 50/50 |

### Table: `exchange_rates`

Cached currency conversion rates. Refreshed periodically via APScheduler (TTL: 1 hour).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Rate ID |
| from_currency | VARCHAR(10) | NOT NULL | Source currency |
| to_currency | VARCHAR(10) | NOT NULL | Target currency (default: EUR) |
| rate | NUMERIC(18,8) | NOT NULL | Conversion rate |
| fetched_at | TIMESTAMP | NOT NULL | When the rate was last fetched |

**Constraints**: `UNIQUE(from_currency, to_currency)`

**Data source**: ECB API (free, EU-based) or Open Exchange Rates. Rate is used to populate `funding_sources.balance_in_base_currency` at each sync.

### Table: `audit_log`

Append-only log for security-sensitive operations. Never updated or deleted.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Log entry ID |
| user_id | UUID | FK users.id, NULLABLE | Acting user (NULL for system actions) |
| action | VARCHAR(100) | NOT NULL | Action type |
| resource_type | VARCHAR(50) | NOT NULL | Entity type (integration, project…) |
| resource_id | UUID | NULLABLE | Affected resource ID |
| metadata | JSONB | NULLABLE | Additional context (IP, provider, etc.) |
| created_at | TIMESTAMP | DEFAULT NOW() | When the action occurred |

**Audited actions**: `INTEGRATION_ADDED`, `INTEGRATION_DELETED`, `PROJECT_CREATED`, `PROJECT_MEMBER_INVITED`, `PROJECT_MEMBER_JOINED`, `PROJECT_MEMBER_LEFT`, `API_KEY_ROTATED`, `2FA_ENABLED`, `2FA_DISABLED`, `RECOVERY_CODE_USED`

## Validation Rules

1. **Integration uniqueness**: `UNIQUE(user_id, provider_name)` enforced at DB level, not only in application code
2. **Integration credentials**: `CHECK (encrypted_api_key IS NOT NULL OR public_address IS NOT NULL)` — prevents orphaned records
3. **Project ownership**: At least one OWNER per project at all times (enforced in application layer)
4. **Balance precision**: NUMERIC(18,8) for all balances (8 decimal places supports crypto; fiat will naturally use 2)
5. **Currency codes**: ISO 4217 compliant (EUR, USD, BTC, ETH, etc.)
6. **API key encryption**: All keys encrypted with Fernet (MultiFernet for key rotation support) before DB insert; Ledger uses `public_address` only
7. **Exchange rates TTL**: Rates older than 1 hour must be refreshed before being used in net-worth calculations

## State Transitions

### Integration Status
```
PENDING → ACTIVE (on successful first sync)
PENDING → ERROR (on sync failure)
ACTIVE → ERROR (on subsequent sync failure)
ERROR → ACTIVE (on retry success)
```

### Project Member Role
```
(null) → PENDING_INVITE (on invitation sent)
PENDING_INVITE → MEMBER (on invitation accepted)
PENDING_INVITE → (removed) (on invitation declined)
MEMBER → (removed) (on voluntary leave or removal by OWNER)
```

## Indexes

```sql
-- Core lookup indexes
CREATE INDEX idx_integrations_user ON integrations(user_id);
CREATE INDEX idx_funding_sources_user ON funding_sources(user_id);
CREATE INDEX idx_funding_sources_integration ON funding_sources(integration_id);
CREATE INDEX idx_transactions_source ON transactions(funding_source_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_funding_sources_project ON project_funding_sources(project_id);
CREATE INDEX idx_project_funding_sources_source ON project_funding_sources(funding_source_id);

-- Exchange rates
CREATE INDEX idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_fetched ON exchange_rates(fetched_at DESC);

-- Audit log queries
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Unique constraints (enforced as indexes)
CREATE UNIQUE INDEX idx_integrations_unique_provider ON integrations(user_id, provider_name);
CREATE UNIQUE INDEX idx_exchange_rates_unique_pair ON exchange_rates(from_currency, to_currency);
```

## Row Level Security (RLS) Policies

RLS must be enabled on all tables. All SELECT/INSERT/UPDATE/DELETE operations are filtered by authenticated user.

```sql
-- integrations: owner only
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY integrations_owner ON integrations
  USING (user_id = auth.uid());

-- funding_sources: owner only
ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY funding_sources_owner ON funding_sources
  USING (user_id = auth.uid());

-- projects: visible to members
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_member ON projects
  USING (id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  ));

-- project_members: visible within same project
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_members_visible ON project_members
  USING (project_id IN (
    SELECT project_id FROM project_members pm WHERE pm.user_id = auth.uid()
  ));

-- project_funding_sources: visible to project members
ALTER TABLE project_funding_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY pfs_member ON project_funding_sources
  USING (project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  ));

-- transactions: owner of the funding source
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_owner ON transactions
  USING (funding_source_id IN (
    SELECT id FROM funding_sources WHERE user_id = auth.uid()
  ));

-- exchange_rates: readable by all authenticated users (no PII)
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY exchange_rates_read ON exchange_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- audit_log: users see only their own entries
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_owner ON audit_log
  USING (user_id = auth.uid());
```
