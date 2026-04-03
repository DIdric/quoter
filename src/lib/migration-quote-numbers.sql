-- Migration: Add automatic quote numbering
-- Run this in the Supabase SQL Editor

-- Add quote_number_prefix to profiles (e.g. "OFF-")
alter table public.profiles
  add column if not exists quote_number_prefix text default '';

-- Add quote_number to quotes (e.g. "2026-001" or "OFF-2026-001")
alter table public.quotes
  add column if not exists quote_number text;

-- Index for fast lookup of latest quote number per user per year
create index if not exists idx_quotes_user_quote_number
  on public.quotes(user_id, quote_number);
