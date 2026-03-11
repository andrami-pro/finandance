-- Migration: 010_budget_limits
-- Creates the budget_limits table for per-user, per-category spending limits.

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_limits (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category        VARCHAR(100)    NOT NULL,
    amount_cents    BIGINT          NOT NULL,
    currency        VARCHAR(10)     NOT NULL DEFAULT 'EUR',
    period          VARCHAR(20)     NOT NULL DEFAULT 'monthly',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_category_period UNIQUE (user_id, category, period),
    CONSTRAINT chk_budget_period CHECK (period IN ('monthly', 'quarterly', 'yearly')),
    CONSTRAINT chk_amount_positive CHECK (amount_cents > 0)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_limits_select_own
    ON public.budget_limits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY budget_limits_insert_own
    ON public.budget_limits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY budget_limits_update_own
    ON public.budget_limits FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY budget_limits_delete_own
    ON public.budget_limits FOR DELETE
    USING (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_budget_limits_user_active
    ON public.budget_limits (user_id, is_active)
    WHERE is_active = TRUE;

-- ── Auto-update updated_at ───────────────────────────────────────────────────
CREATE TRIGGER set_budget_limits_updated_at
    BEFORE UPDATE ON public.budget_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
