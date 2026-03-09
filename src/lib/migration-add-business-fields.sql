-- Migration: Add business profile fields for professional quotes
-- Run this in the Supabase SQL Editor if you already have the profiles table

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_postal_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kvk_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS btw_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quote_validity_days integer default 30;
