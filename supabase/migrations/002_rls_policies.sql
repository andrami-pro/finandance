-- Migration: Row Level Security policies for Finandance MVP
-- Date: 2026-02-23
-- Purpose: Enable RLS and define per-table access policies for all user-owned data
-- Feature: 001-finandance-mvp
-- Depends-on: 001_init.sql

-- ============================================================================
-- TABLE: public.users
-- Users can only read and update their own profile.
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
    ON public.users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

COMMENT ON POLICY "users_select_own" ON public.users IS
'Users can only view their own profile.';

-- ============================================================================
-- TABLE: public.integrations
-- Owner-only access: users manage only their own provider connections.
-- ============================================================================

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integrations_select_own" ON public.integrations;
CREATE POLICY "integrations_select_own"
    ON public.integrations FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "integrations_insert_own" ON public.integrations;
CREATE POLICY "integrations_insert_own"
    ON public.integrations FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "integrations_update_own" ON public.integrations;
CREATE POLICY "integrations_update_own"
    ON public.integrations FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "integrations_delete_own" ON public.integrations;
CREATE POLICY "integrations_delete_own"
    ON public.integrations FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

COMMENT ON POLICY "integrations_select_own" ON public.integrations IS
'Users can only view their own financial provider integrations.';

-- ============================================================================
-- TABLE: public.funding_sources
-- Owner-only access: users manage only their own accounts/wallets.
-- ============================================================================

ALTER TABLE public.funding_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "funding_sources_select_own" ON public.funding_sources;
CREATE POLICY "funding_sources_select_own"
    ON public.funding_sources FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "funding_sources_insert_own" ON public.funding_sources;
CREATE POLICY "funding_sources_insert_own"
    ON public.funding_sources FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "funding_sources_update_own" ON public.funding_sources;
CREATE POLICY "funding_sources_update_own"
    ON public.funding_sources FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "funding_sources_delete_own" ON public.funding_sources;
CREATE POLICY "funding_sources_delete_own"
    ON public.funding_sources FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

COMMENT ON POLICY "funding_sources_select_own" ON public.funding_sources IS
'Users can only view funding sources they own.';

-- ============================================================================
-- TABLE: public.projects
-- Project members can view; only the OWNER can update/delete.
-- ============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
CREATE POLICY "projects_select_member"
    ON public.projects FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "projects_update_owner" ON public.projects;
CREATE POLICY "projects_update_owner"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (
        id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role = 'OWNER'
        )
    )
    WITH CHECK (
        id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role = 'OWNER'
        )
    );

DROP POLICY IF EXISTS "projects_delete_owner" ON public.projects;
CREATE POLICY "projects_delete_owner"
    ON public.projects FOR DELETE
    TO authenticated
    USING (
        id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role = 'OWNER'
        )
    );

COMMENT ON POLICY "projects_select_member" ON public.projects IS
'All project members (OWNER, MEMBER, PENDING_INVITE) can view the project.';

COMMENT ON POLICY "projects_update_owner" ON public.projects IS
'Only project OWNERs can modify project details.';

-- ============================================================================
-- TABLE: public.project_members
-- Members can view all members of projects they belong to.
-- Only OWNERs can insert/delete members; users can remove themselves.
-- ============================================================================

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_select_same_project" ON public.project_members;
CREATE POLICY "project_members_select_same_project"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "project_members_insert_owner" ON public.project_members;
CREATE POLICY "project_members_insert_owner"
    ON public.project_members FOR INSERT
    TO authenticated
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid() AND pm.role = 'OWNER'
        )
    );

DROP POLICY IF EXISTS "project_members_update_owner" ON public.project_members;
CREATE POLICY "project_members_update_owner"
    ON public.project_members FOR UPDATE
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid() AND pm.role = 'OWNER'
        )
        OR user_id = auth.uid()  -- Users can update their own membership (e.g., accept invite)
    )
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid() AND pm.role = 'OWNER'
        )
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "project_members_delete_owner_or_self" ON public.project_members;
CREATE POLICY "project_members_delete_owner_or_self"
    ON public.project_members FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()  -- Users can remove themselves
        OR project_id IN (
            SELECT project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid() AND pm.role = 'OWNER'
        )
    );

COMMENT ON POLICY "project_members_select_same_project" ON public.project_members IS
'Members see all other members in projects they belong to.';

-- ============================================================================
-- TABLE: public.project_funding_sources
-- Visible to all project members; only OWNERs can assign/remove.
-- ============================================================================

ALTER TABLE public.project_funding_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pfs_select_member" ON public.project_funding_sources;
CREATE POLICY "pfs_select_member"
    ON public.project_funding_sources FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "pfs_insert_owner" ON public.project_funding_sources;
CREATE POLICY "pfs_insert_owner"
    ON public.project_funding_sources FOR INSERT
    TO authenticated
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role = 'OWNER'
        )
    );

DROP POLICY IF EXISTS "pfs_update_owner" ON public.project_funding_sources;
CREATE POLICY "pfs_update_owner"
    ON public.project_funding_sources FOR UPDATE
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role = 'OWNER'
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role = 'OWNER'
        )
    );

DROP POLICY IF EXISTS "pfs_delete_owner" ON public.project_funding_sources;
CREATE POLICY "pfs_delete_owner"
    ON public.project_funding_sources FOR DELETE
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role = 'OWNER'
        )
    );

COMMENT ON POLICY "pfs_select_member" ON public.project_funding_sources IS
'All project members can view assigned funding sources.';

-- ============================================================================
-- TABLE: public.transactions
-- Owner of the funding source can view/manage transactions.
-- ============================================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_owner" ON public.transactions;
CREATE POLICY "transactions_select_owner"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (
        funding_source_id IN (
            SELECT id FROM public.funding_sources
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "transactions_insert_owner" ON public.transactions;
CREATE POLICY "transactions_insert_owner"
    ON public.transactions FOR INSERT
    TO authenticated
    WITH CHECK (
        funding_source_id IN (
            SELECT id FROM public.funding_sources
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "transactions_update_owner" ON public.transactions;
CREATE POLICY "transactions_update_owner"
    ON public.transactions FOR UPDATE
    TO authenticated
    USING (
        funding_source_id IN (
            SELECT id FROM public.funding_sources
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        funding_source_id IN (
            SELECT id FROM public.funding_sources
            WHERE user_id = auth.uid()
        )
    );

COMMENT ON POLICY "transactions_select_owner" ON public.transactions IS
'Users can only view transactions from their own funding sources.';

-- ============================================================================
-- TABLE: public.exchange_rates
-- Read-only for all authenticated users (no PII, shared reference data).
-- ============================================================================

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exchange_rates_select_authenticated" ON public.exchange_rates;
CREATE POLICY "exchange_rates_select_authenticated"
    ON public.exchange_rates FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "exchange_rates_select_authenticated" ON public.exchange_rates IS
'All authenticated users can read exchange rates. No PII involved.';

-- ============================================================================
-- TABLE: public.audit_log
-- Users can only see their own audit entries (append-only — no UPDATE/DELETE).
-- ============================================================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_own" ON public.audit_log;
CREATE POLICY "audit_log_select_own"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "audit_log_insert_service" ON public.audit_log;
CREATE POLICY "audit_log_insert_service"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);
-- Note: Backend uses service role key to insert audit logs (bypasses RLS).
-- This policy allows authenticated users as a fallback; service role always bypasses.

COMMENT ON POLICY "audit_log_select_own" ON public.audit_log IS
'Users can only view their own audit log entries.';

COMMENT ON POLICY "audit_log_insert_service" ON public.audit_log IS
'Insert is handled by the backend service role. No UPDATE or DELETE policies — audit log is append-only.';
