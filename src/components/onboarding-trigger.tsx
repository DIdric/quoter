"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getProfileCompletion } from "@/lib/profile-complete";
import type { Profile } from "@/lib/types";

const DISMISSED_KEY = "onboarding_wizard_dismissed";

export function OnboardingTrigger() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // Don't auto-show if user explicitly dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!data) return;
          setProfile(data);
          const { isComplete } = getProfileCompletion(data);
          // Auto-show only if business_name is empty (brand new user)
          if (!isComplete && !data.business_name) {
            setShowWizard(true);
          }
        });
    });
  }, []);

  function handleClose() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShowWizard(false);
  }

  function handleComplete() {
    sessionStorage.removeItem(DISMISSED_KEY);
    setShowWizard(false);
    // Reload to refresh sidebar badge and dashboard
    window.location.reload();
  }

  if (!showWizard || !profile) return null;

  return (
    <OnboardingWizard
      initialProfile={profile}
      onClose={handleClose}
      onComplete={handleComplete}
    />
  );
}
