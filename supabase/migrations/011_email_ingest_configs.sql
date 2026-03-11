-- Migration: Email ingestion support
-- Date: 2026-03-11
-- Purpose: Enable email-based transaction ingestion via Cloudflare Email Workers

-- ============================================================================
-- 1. Email ingest configuration table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_ingest_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ingest_hash VARCHAR(16) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.email_ingest_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email config"
    ON public.email_ingest_configs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email config"
    ON public.email_ingest_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email config"
    ON public.email_ingest_configs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email config"
    ON public.email_ingest_configs FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_ingest_configs_hash
    ON public.email_ingest_configs(ingest_hash);

-- ============================================================================
-- 2. Allow transactions without a funding source (email-ingested)
-- ============================================================================

-- Add user_id to transactions for email-ingested ones (no funding source)
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Make funding_source_id nullable for email-ingested transactions
ALTER TABLE public.transactions
    ALTER COLUMN funding_source_id DROP NOT NULL;

-- Add source_type to distinguish email-ingested from API-synced transactions
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'SYNC' NOT NULL;

-- Add bank_name for email-ingested transactions (e.g. 'Revolut', 'Sumeria')
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);

-- Ensure either funding_source_id or user_id is set
ALTER TABLE public.transactions
    ADD CONSTRAINT chk_transaction_owner
    CHECK (funding_source_id IS NOT NULL OR user_id IS NOT NULL);

-- Index for querying email-ingested transactions by user
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
    ON public.transactions(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_source_type
    ON public.transactions(source_type);

-- ============================================================================
-- 3. Email ingest log (processed emails tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_ingest_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id VARCHAR(500) UNIQUE NOT NULL,
    from_addr VARCHAR(255),
    subject VARCHAR(500),
    bank_name VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSED',
    error_message TEXT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_ingest_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email log"
    ON public.email_ingest_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_ingest_log_user
    ON public.email_ingest_log(user_id);

CREATE INDEX IF NOT EXISTS idx_email_ingest_log_message_id
    ON public.email_ingest_log(message_id);
