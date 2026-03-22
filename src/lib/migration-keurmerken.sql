-- Migration: Add keurmerken to profiles
-- Run this in the Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS keurmerken jsonb NOT NULL DEFAULT '[]'::jsonb;
