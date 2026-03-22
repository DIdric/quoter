-- Migration: Add onboarding_completed to profiles
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Existing users have already used the app — mark them as completed
UPDATE profiles SET onboarding_completed = true WHERE onboarding_completed = false;
