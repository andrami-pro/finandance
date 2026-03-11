-- Migration: Initial schema for Finandance MVP
-- Date: 2026-02-23
-- Purpose: Create all core tables, indexes, constraints, and updated_at triggers
-- Feature: 001-finandance-mvp

-- ============================================================================
-- ENUM TYPES (idempotent)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE provider_name_enum AS ENUM ('WISE', 'KRAKEN', 'LEDGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_status_enum AS ENUM ('ACTIVE', 'ERROR', 'PENDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_member_role_enum AS ENUM ('OWNER', 'MEMBER', 'PENDING_INVITE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TRIGGER FUNCTION: update_updated_at_column
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS
'Automatically sets updated_at to NOW() on any UPDATE operation.';

-- ============================================================================
-- TABLE: public.users
-- Extends auth.users with profile data. Created by trigger on signup.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   VARCHAR(255),
    avatar_url  VARCHAR(500),
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE  public.users          IS 'User profile data extending Supabase auth.users.';
COMMENT ON COLUMN public.users.id       IS 'FK to auth.users — same UUID as the auth record.';
COMMENT ON COLUMN public.users.full_name IS 'Display name set during onboarding.';
COMMENT ON COLUMN public.users.avatar_url IS 'Optional profile picture URL.';

-- Trigger: auto-create public.users record on new Supabase auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- TABLE: public.integrations
-- Financial provider connections (Wise, Kraken, Ledger).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integrations (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID                    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider_name       provider_name_enum      NOT NULL,
    encrypted_api_key   TEXT,
    public_address      VARCHAR(255),
    status              integration_status_enum NOT NULL DEFAULT 'PENDING',
    last_synced_at      TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ             DEFAULT NOW() NOT NULL,
    -- At least one credential required
    CONSTRAINT chk_integration_credentials
        CHECK (encrypted_api_key IS NOT NULL OR public_address IS NOT NULL)
);

COMMENT ON TABLE  public.integrations                   IS 'Financial provider connections. API keys are Fernet-encrypted.';
COMMENT ON COLUMN public.integrations.encrypted_api_key IS 'Fernet-encrypted API key. NULL for Ledger (uses public_address).';
COMMENT ON COLUMN public.integrations.public_address    IS 'Ledger/cold wallet public address. NULL for API-based providers.';

-- Uniqueness: one integration per provider per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_unique_provider
    ON public.integrations (user_id, provider_name);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_integrations_updated_at ON public.integrations;
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: public.funding_sources
-- Discovered accounts/wallets from integrations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.funding_sources (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id          UUID            NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
    user_id                 UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    external_source_id      VARCHAR(255)    NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    asset_type              VARCHAR(50)     NOT NULL,
    currency                VARCHAR(10)     NOT NULL,
    current_balance         NUMERIC(18,8)   NOT NULL DEFAULT 0,
    balance_in_base_currency NUMERIC(18,2),
    updated_at              TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE  public.funding_sources IS 'Accounts and wallets discovered from provider integrations (Jars, Pockets, Wallets).';
COMMENT ON COLUMN public.funding_sources.balance_in_base_currency IS 'Balance converted to EUR at last sync using exchange_rates table.';

-- updated_at trigger
DROP TRIGGER IF EXISTS update_funding_sources_updated_at ON public.funding_sources;
CREATE TRIGGER update_funding_sources_updated_at
    BEFORE UPDATE ON public.funding_sources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: public.projects
-- Shared financial goals.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)    NOT NULL,
    target_amount   NUMERIC(18,2)   NOT NULL,
    target_currency VARCHAR(10)     NOT NULL DEFAULT 'EUR',
    target_date     DATE,
    created_by      UUID            NOT NULL REFERENCES public.users(id),
    created_at      TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.projects IS 'Shared financial goals with target amount and currency.';

-- updated_at trigger
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: public.project_members
-- Collaboration pivot: who belongs to each project.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_members (
    project_id  UUID                        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id     UUID                        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role        project_member_role_enum    NOT NULL,
    invited_by  UUID                        REFERENCES public.users(id),
    PRIMARY KEY (project_id, user_id)
);

COMMENT ON TABLE  public.project_members              IS 'Collaboration pivot: maps users to projects with roles.';
COMMENT ON COLUMN public.project_members.invited_by   IS 'User who sent the invitation. NULL for the project creator (OWNER).';

-- ============================================================================
-- TABLE: public.project_funding_sources
-- Many-to-many pivot: projects ↔ funding sources with optional allocation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_funding_sources (
    project_id          UUID            NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    funding_source_id   UUID            NOT NULL REFERENCES public.funding_sources(id) ON DELETE CASCADE,
    allocated_amount    NUMERIC(18,8),
    PRIMARY KEY (project_id, funding_source_id)
);

COMMENT ON TABLE  public.project_funding_sources IS 'Many-to-many between projects and funding sources with optional partial allocation.';
COMMENT ON COLUMN public.project_funding_sources.allocated_amount IS 'Explicit allocation. NULL = use full balance of the funding source.';

-- ============================================================================
-- TABLE: public.transactions
-- Synchronized transaction history for budgeting.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_source_id           UUID            NOT NULL REFERENCES public.funding_sources(id) ON DELETE CASCADE,
    external_transaction_id     VARCHAR(255)    UNIQUE,
    amount                      NUMERIC(18,8)   NOT NULL,
    currency                    VARCHAR(10)     NOT NULL,
    description                 VARCHAR(500),
    category                    VARCHAR(100),
    transaction_date            TIMESTAMPTZ     NOT NULL,
    is_split                    BOOLEAN         NOT NULL DEFAULT FALSE,
    split_with_user_id          UUID            REFERENCES public.users(id),
    split_amount                NUMERIC(18,8)
);

COMMENT ON TABLE  public.transactions IS 'Synchronized transaction history from funding sources.';
COMMENT ON COLUMN public.transactions.external_transaction_id IS 'Provider transaction ID. Acts as idempotency key during sync.';
COMMENT ON COLUMN public.transactions.split_amount IS 'Explicit split amount. NULL = 50/50 split when is_split = TRUE.';

-- ============================================================================
-- TABLE: public.exchange_rates
-- Cached currency conversion rates (TTL: 1 hour, refreshed by APScheduler).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency   VARCHAR(10)     NOT NULL,
    to_currency     VARCHAR(10)     NOT NULL DEFAULT 'EUR',
    rate            NUMERIC(18,8)   NOT NULL,
    fetched_at      TIMESTAMPTZ     NOT NULL
);

COMMENT ON TABLE public.exchange_rates IS 'Cached exchange rates. Refreshed every hour via APScheduler. Source: ECB + CoinGecko.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_unique_pair
    ON public.exchange_rates (from_currency, to_currency);

-- ============================================================================
-- TABLE: public.audit_log
-- Append-only log for security-sensitive operations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        REFERENCES public.users(id),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(50)  NOT NULL,
    resource_id     UUID,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE  public.audit_log           IS 'Append-only security audit log. Never updated or deleted.';
COMMENT ON COLUMN public.audit_log.user_id   IS 'Acting user. NULL for system-triggered actions.';
COMMENT ON COLUMN public.audit_log.metadata  IS 'Additional context (IP, provider name, etc.) stored as JSONB.';

-- ============================================================================
-- INDEXES: Core lookup performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_integrations_user
    ON public.integrations (user_id);

CREATE INDEX IF NOT EXISTS idx_funding_sources_user
    ON public.funding_sources (user_id);

CREATE INDEX IF NOT EXISTS idx_funding_sources_integration
    ON public.funding_sources (integration_id);

CREATE INDEX IF NOT EXISTS idx_transactions_source
    ON public.transactions (funding_source_id);

CREATE INDEX IF NOT EXISTS idx_transactions_date
    ON public.transactions (transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_project_members_user
    ON public.project_members (user_id);

CREATE INDEX IF NOT EXISTS idx_project_funding_sources_project
    ON public.project_funding_sources (project_id);

CREATE INDEX IF NOT EXISTS idx_project_funding_sources_source
    ON public.project_funding_sources (funding_source_id);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair
    ON public.exchange_rates (from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched
    ON public.exchange_rates (fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
    ON public.audit_log (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource
    ON public.audit_log (resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created
    ON public.audit_log (created_at DESC);
