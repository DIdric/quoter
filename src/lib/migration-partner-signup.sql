-- Migration: Design Partner signup tracking
-- Run this in the Supabase SQL Editor

-- Table to track Design Partner signups (max 20 slots)
CREATE TABLE IF NOT EXISTS public.partner_signups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  info text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Only admins (service role) can read/write
ALTER TABLE public.partner_signups ENABLE ROW LEVEL SECURITY;

-- No public access — only service role key can insert/select
-- (used exclusively from the API route with service role key)

-- Index for fast count checks
CREATE INDEX IF NOT EXISTS partner_signups_created_at_idx ON public.partner_signups(created_at);
