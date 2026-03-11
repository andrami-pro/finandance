-- 008: Add chain column to integrations table
--
-- The Ledger provider needs to know which blockchain (BTC/ETH) to query.
-- Previously the chain was accepted by the API but never persisted,
-- causing the sync job to default to BTC for all Ledger integrations.

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS chain VARCHAR(10);

COMMENT ON COLUMN public.integrations.chain IS 'Blockchain network for Ledger integrations (BTC, ETH). NULL for non-Ledger providers.';

-- Backfill: existing Ledger integrations without chain default to BTC
UPDATE public.integrations
  SET chain = 'BTC'
  WHERE provider_name = 'LEDGER' AND chain IS NULL;
