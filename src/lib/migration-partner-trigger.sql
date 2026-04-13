-- Migration: Auto-activeer pro trial voor Design Partner aanmeldingen
-- Run dit in de Supabase SQL Editor

-- Trigger functie op profiles INSERT:
-- Kijkt of het email in partner_signups staat → zet pro tier + 30d trial
CREATE OR REPLACE FUNCTION public.handle_new_profile_partner_check()
RETURNS trigger AS $$
DECLARE
  partner_email text;
  partner_exists boolean;
BEGIN
  -- Haal email op uit auth.users
  SELECT email INTO partner_email FROM auth.users WHERE id = NEW.id;

  -- Check partner_signups
  SELECT EXISTS (
    SELECT 1 FROM public.partner_signups WHERE lower(email) = lower(partner_email)
  ) INTO partner_exists;

  IF partner_exists THEN
    NEW.subscription_tier := 'pro';
    NEW.trial_until := (CURRENT_DATE + INTERVAL '30 days')::text;

    -- Koppel user_id aan aanmelding
    UPDATE public.partner_signups
    SET user_id = NEW.id
    WHERE lower(email) = lower(partner_email);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger op profiles (BEFORE INSERT zodat we NEW kunnen aanpassen)
DROP TRIGGER IF EXISTS on_profile_created_partner_check ON public.profiles;
CREATE TRIGGER on_profile_created_partner_check
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_partner_check();
