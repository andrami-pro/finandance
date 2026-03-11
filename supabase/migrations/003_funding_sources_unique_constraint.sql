-- ============================================================================
-- MIGRATION 003: Add unique constraint on funding_sources
-- Required for upsert ON CONFLICT (integration_id, external_source_id)
-- ============================================================================

ALTER TABLE public.funding_sources
    ADD CONSTRAINT uq_funding_sources_integration_external
    UNIQUE (integration_id, external_source_id);
