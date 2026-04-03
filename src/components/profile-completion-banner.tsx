"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfileCompletion } from "@/lib/profile-complete";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { AlertCircle, ChevronRight, X } from "lucide-react";
import type { Profile } from "@/lib/types";

const BANNER_DISMISSED_KEY = "profile_banner_dismissed";

export function ProfileCompletionBanner() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [percentage, setPercentage] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden

  useEffect(() => {
    if (sessionStorage.getItem(BANNER_DISMISSED_KEY)) return;

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
          const { isComplete, percentage: pct } = getProfileCompletion(data);
          if (!isComplete) {
            setPercentage(pct);
            setDismissed(false);
          }
        });
    });
  }, []);

  function handleDismiss() {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, "1");
    setDismissed(true);
  }

  function handleComplete() {
    setShowWizard(false);
    setDismissed(true);
    window.location.reload();
  }

  if (dismissed || !profile) return null;

  return (
    <>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-orange-800">
            Je bedrijfsprofiel is nog niet compleet ({percentage}%)
          </p>
          <div className="mt-1.5 w-full bg-orange-200 rounded-full h-1.5">
            <div
              className="h-1.5 bg-orange-500 rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-900 whitespace-nowrap shrink-0 transition"
        >
          Aanvullen
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-orange-400 hover:text-orange-600 transition shrink-0"
          aria-label="Sluiten"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showWizard && (
        <OnboardingWizard
          initialProfile={profile}
          onClose={() => setShowWizard(false)}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
