-- Add user notes column to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS notes TEXT;
