-- Migration: Add REVOLUT to provider_name_enum
-- Date: 2026-03-02
-- Purpose: Support Revolut as a new integration provider via GoCardless Bank Account Data API

ALTER TYPE provider_name_enum ADD VALUE IF NOT EXISTS 'REVOLUT';
