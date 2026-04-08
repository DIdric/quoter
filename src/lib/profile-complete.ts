import type { Profile } from "@/lib/types";

export interface ProfileCompletion {
  isComplete: boolean;
  percentage: number;
  stepsComplete: boolean[];
}

// Fields required per step
const STEP_FIELDS: (keyof Profile)[][] = [
  ["business_name"],
  ["business_address", "business_postal_code", "business_city", "business_phone", "business_email"],
  ["kvk_number"],
  ["hourly_rate", "margin_percentage"],
];

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  return true;
}

export function getProfileCompletion(profile: Partial<Profile>): ProfileCompletion {
  const stepsComplete = STEP_FIELDS.map((fields) =>
    fields.every((f) => isFilled(profile[f]))
  );

  const completedSteps = stepsComplete.filter(Boolean).length;
  const percentage = Math.round((completedSteps / STEP_FIELDS.length) * 100);

  return {
    isComplete: stepsComplete.every(Boolean),
    percentage,
    stepsComplete,
  };
}
