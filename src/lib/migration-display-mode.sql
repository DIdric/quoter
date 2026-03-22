-- Migration: Add default_display_mode to profiles
-- Run this in the Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_display_mode text NOT NULL DEFAULT 'open'
  CHECK (default_display_mode IN ('open', 'module', 'hoogover'));
