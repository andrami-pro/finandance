-- Migration: 012_freelance_income
-- Creates tables for the Freelance Income Tracker feature (F004):
--   - clients: user's freelance clients with expected monthly income
--   - expected_incomes: per-period expected income entries
--   - income_transaction_links: join table linking transactions to expected incomes
--   - Adds client_id FK to transactions table

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. clients
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.clients (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name                    VARCHAR(200)    NOT NULL,
    expected_amount_cents   BIGINT          NOT NULL DEFAULT 0,
    currency                VARCHAR(10)     NOT NULL DEFAULT 'EUR',
    payment_frequency       VARCHAR(20)     NOT NULL DEFAULT 'monthly',
    expected_day            SMALLINT        DEFAULT 1,
    notes                   TEXT,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT chk_client_frequency CHECK (
        payment_frequency IN ('monthly', 'biweekly', 'weekly', 'one_time')
    ),
    CONSTRAINT chk_expected_day CHECK (expected_day BETWEEN 1 AND 31),
    CONSTRAINT chk_amount_non_negative CHECK (expected_amount_cents >= 0)
);

COMMENT ON TABLE public.clients IS 'Freelance clients with expected monthly income amounts';

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select_own
    ON public.clients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY clients_insert_own
    ON public.clients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY clients_update_own
    ON public.clients FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY clients_delete_own
    ON public.clients FOR DELETE
    USING (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_clients_user_active
    ON public.clients (user_id, is_active)
    WHERE is_active = TRUE;

-- ── Auto-update updated_at ───────────────────────────────────────────────────
CREATE TRIGGER set_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. expected_incomes
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.expected_incomes (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_id               UUID            NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    period_start            DATE            NOT NULL,
    expected_amount_cents   BIGINT          NOT NULL,
    received_amount_cents   BIGINT          NOT NULL DEFAULT 0,
    currency                VARCHAR(10)     NOT NULL DEFAULT 'EUR',
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending',
    confirmed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_client_period UNIQUE (client_id, period_start),
    CONSTRAINT chk_income_status CHECK (
        status IN ('pending', 'partial', 'received', 'overdue')
    )
);

COMMENT ON TABLE public.expected_incomes IS 'Per-period expected income entries (one per client per period)';

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.expected_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY expected_incomes_select_own
    ON public.expected_incomes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY expected_incomes_insert_own
    ON public.expected_incomes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY expected_incomes_update_own
    ON public.expected_incomes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY expected_incomes_delete_own
    ON public.expected_incomes FOR DELETE
    USING (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_expected_incomes_user_period
    ON public.expected_incomes (user_id, period_start);

CREATE INDEX idx_expected_incomes_status
    ON public.expected_incomes (status)
    WHERE status IN ('pending', 'overdue');

-- ── Auto-update updated_at ───────────────────────────────────────────────────
CREATE TRIGGER set_expected_incomes_updated_at
    BEFORE UPDATE ON public.expected_incomes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. income_transaction_links
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.income_transaction_links (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_income_id      UUID            NOT NULL REFERENCES public.expected_incomes(id) ON DELETE CASCADE,
    transaction_id          UUID            NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount_cents            BIGINT          NOT NULL,
    linked_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_txn_link UNIQUE (expected_income_id, transaction_id)
);

COMMENT ON TABLE public.income_transaction_links IS 'Links income transactions to expected income entries (supports partial payments)';

-- ── RLS (via expected_incomes ownership) ─────────────────────────────────────
ALTER TABLE public.income_transaction_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY income_links_select
    ON public.income_transaction_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expected_incomes ei
            WHERE ei.id = expected_income_id AND ei.user_id = auth.uid()
        )
    );

CREATE POLICY income_links_insert
    ON public.income_transaction_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expected_incomes ei
            WHERE ei.id = expected_income_id AND ei.user_id = auth.uid()
        )
    );

CREATE POLICY income_links_delete
    ON public.income_transaction_links FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.expected_incomes ei
            WHERE ei.id = expected_income_id AND ei.user_id = auth.uid()
        )
    );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Add client_id to transactions
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.transactions
            ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_client
    ON public.transactions (client_id)
    WHERE client_id IS NOT NULL;
