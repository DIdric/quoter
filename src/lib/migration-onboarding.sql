-- Migration: Onboarding + email tracking columns
-- Run in Supabase SQL Editor (project: uobaibqwoarcvdmvqubm)
--
-- NOTE: whatsapp_opt_in, email_opt_in, whatsapp_number, referral_code,
-- referral_credits, referral_count, free_quotes_used, lead_score
-- were added in the referral migration. Only new columns below.

-- 1. New columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_opened          BOOLEAN NOT NULL DEFAULT false;

-- 2. Trigger: increment free_quotes_used on every quote INSERT (free tier only)
CREATE OR REPLACE FUNCTION increment_quote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET free_quotes_used = free_quotes_used + 1
  WHERE id = NEW.user_id
  AND subscription_tier = 'free';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_quote_created ON public.quotes;
CREATE TRIGGER on_quote_created
  AFTER INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION increment_quote_count();

-- 3. Trigger: fire n8n webhook when onboarding_completed flips to true
--    IMPORTANT: replace JOUW_N8N_WEBHOOK_URL with the actual n8n webhook URL
--    Requires pg_net extension: Supabase Dashboard → Extensions → pg_net
CREATE OR REPLACE FUNCTION notify_onboarding_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.onboarding_completed = true
  AND (OLD.onboarding_completed = false OR OLD.onboarding_completed IS NULL) THEN
    PERFORM net.http_post(
      url  := 'https://didric.app.n8n.cloud/webhook/onboarding-complete',
      body := jsonb_build_object(
        'user_id',          NEW.id,
        'business_name',    NEW.business_name,
        'email',            NEW.email,
        'whatsapp_number',  NEW.whatsapp_number,
        'whatsapp_opt_in',  NEW.whatsapp_opt_in,
        'email_opt_in',     NEW.email_opt_in,
        'lead_score',       NEW.lead_score
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_onboarding_complete ON public.profiles;
CREATE TRIGGER on_onboarding_complete
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION notify_onboarding_complete();
