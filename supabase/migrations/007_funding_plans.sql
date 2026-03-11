-- Migration: Create funding_plans table for Auto-Save / DCA savings plans
-- Date: 2026-03-03
-- Purpose: New table to store savings plan configurations (Auto-Save / DCA).
--          MVP scope: plan + in-app reminders only (no automated transfers).
-- Feature: 002-activation-autosave
-- Depends-on: 001_init.sql, 002_rls_policies.sql

-- ============================================================================
-- TABLE: public.funding_plans
-- Savings plan configurations (Auto-Save / DCA) per user per project.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.funding_plans (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    funding_source_id   UUID            REFERENCES public.funding_sources(id) ON DELETE SET NULL,
    plan_type           VARCHAR(20)     NOT NULL DEFAULT 'dca',
    amount              NUMERIC(18,8)   NOT NULL,
    currency            VARCHAR(10)     NOT NULL,
    frequency           VARCHAR(20),
    next_reminder_at    TIMESTAMPTZ,
    is_active           BOOLEAN         NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMPTZ     DEFAULT NOW() NOT NULL,

    -- Only valid plan types
    CONSTRAINT chk_funding_plans_plan_type
        CHECK (plan_type IN ('dca', 'lump_sum')),

    -- Only valid frequencies (when set)
    CONSTRAINT chk_funding_plans_frequency
        CHECK (frequency IS NULL OR frequency IN ('weekly', 'biweekly', 'monthly')),

    -- DCA plans must have a frequency
    CONSTRAINT chk_dca_has_frequency
        CHECK (plan_type != 'dca' OR frequency IS NOT NULL),

    -- Amount must be positive
    CONSTRAINT chk_funding_plans_amount_positive
        CHECK (amount > 0)
);

COMMENT ON TABLE  public.funding_plans IS 'Savings plan configurations (Auto-Save / DCA). MVP: plan + in-app reminders only.';
COMMENT ON COLUMN public.funding_plans.project_id IS 'Associated project. CASCADE on delete.';
COMMENT ON COLUMN public.funding_plans.user_id IS 'Plan owner. CASCADE on delete (GDPR).';
COMMENT ON COLUMN public.funding_plans.funding_source_id IS 'Source to fund from. SET NULL if source disconnected — UI prompts re-link.';
COMMENT ON COLUMN public.funding_plans.plan_type IS 'dca = recurring contributions, lump_sum = one-time contribution.';
COMMENT ON COLUMN public.funding_plans.amount IS 'Contribution amount per period. Must be > 0.';
COMMENT ON COLUMN public.funding_plans.currency IS 'Currency of the contribution (typically matches project target_currency).';
COMMENT ON COLUMN public.funding_plans.frequency IS 'Contribution frequency. Required for DCA, NULL for lump_sum.';
COMMENT ON COLUMN public.funding_plans.next_reminder_at IS 'Next scheduled reminder timestamp. Calculated on create, advanced on acknowledge.';
COMMENT ON COLUMN public.funding_plans.is_active IS 'Whether the plan is active. Paused plans keep their config but stop reminders.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_funding_plans_project
    ON public.funding_plans (project_id);

CREATE INDEX IF NOT EXISTS idx_funding_plans_user
    ON public.funding_plans (user_id);

CREATE INDEX IF NOT EXISTS idx_funding_plans_next_reminder
    ON public.funding_plans (next_reminder_at)
    WHERE is_active = true;

-- ============================================================================
-- TRIGGER: updated_at auto-update
-- ============================================================================

DROP TRIGGER IF EXISTS update_funding_plans_updated_at ON public.funding_plans;
CREATE TRIGGER update_funding_plans_updated_at
    BEFORE UPDATE ON public.funding_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.funding_plans ENABLE ROW LEVEL SECURITY;

-- SELECT: Plan owner can view their own plans
DROP POLICY IF EXISTS "funding_plans_select_own" ON public.funding_plans;
CREATE POLICY "funding_plans_select_own"
    ON public.funding_plans FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- SELECT: Project members can view plans in their projects (read-only collaboration)
DROP POLICY IF EXISTS "funding_plans_select_project_member" ON public.funding_plans;
CREATE POLICY "funding_plans_select_project_member"
    ON public.funding_plans FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: Users can only create plans for themselves
DROP POLICY IF EXISTS "funding_plans_insert_own" ON public.funding_plans;
CREATE POLICY "funding_plans_insert_own"
    ON public.funding_plans FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own plans
DROP POLICY IF EXISTS "funding_plans_update_own" ON public.funding_plans;
CREATE POLICY "funding_plans_update_own"
    ON public.funding_plans FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own plans
DROP POLICY IF EXISTS "funding_plans_delete_own" ON public.funding_plans;
CREATE POLICY "funding_plans_delete_own"
    ON public.funding_plans FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

COMMENT ON POLICY "funding_plans_select_own" ON public.funding_plans IS
'Users can view their own savings plans.';

COMMENT ON POLICY "funding_plans_select_project_member" ON public.funding_plans IS
'Project members can view all plans in projects they belong to (read-only collaboration).';

COMMENT ON POLICY "funding_plans_insert_own" ON public.funding_plans IS
'Users can only create savings plans owned by themselves.';

COMMENT ON POLICY "funding_plans_update_own" ON public.funding_plans IS
'Users can only update their own savings plans.';

COMMENT ON POLICY "funding_plans_delete_own" ON public.funding_plans IS
'Users can only delete their own savings plans.';
