-- Migration: Add category column to projects table
-- Purpose: Support project categories (travel, home, auto, family, emergency)
-- shown in the project creation wizard.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS category VARCHAR(50);

COMMENT ON COLUMN public.projects.category
  IS 'Optional project category: travel, home, auto, family, emergency.';
