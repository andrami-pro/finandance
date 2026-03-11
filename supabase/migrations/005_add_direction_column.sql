-- Add direction column to transactions table.
-- Values: 'IN' (inflow/credit) or 'OUT' (outflow/debit).
-- Nullable for backward compatibility with pre-existing rows.

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS direction VARCHAR(3);

COMMENT ON COLUMN public.transactions.direction
    IS 'Transaction direction: IN (inflow/credit) or OUT (outflow/debit)';
