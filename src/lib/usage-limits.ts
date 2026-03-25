import { createClient } from "@supabase/supabase-js";

export type SubscriptionTier = "free" | "pro" | "business";

export interface TierLimits {
  label: string;
  quotesPerMonth: number; // max AI-generated quotes per calendar month
  maxTokensPerMonth: number; // safety net: max total tokens per month
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    label: "Free",
    quotesPerMonth: 10,
    maxTokensPerMonth: 200_000,
  },
  pro: {
    label: "Pro",
    quotesPerMonth: 50,
    maxTokensPerMonth: 1_500_000,
  },
  business: {
    label: "Business",
    quotesPerMonth: -1, // unlimited
    maxTokensPerMonth: -1,
  },
};

export interface UsageStatus {
  tier: SubscriptionTier;
  limits: TierLimits;
  quotesUsed: number;
  tokensUsed: number;
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a user is within their usage quota for the current month.
 * Uses the service role client to bypass RLS for accurate counting.
 */
export async function checkUsageQuota(userId: string): Promise<UsageStatus> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user's tier from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  const tier: SubscriptionTier = profile?.subscription_tier ?? "free";
  const limits = TIER_LIMITS[tier];

  // Unlimited tier — skip counting
  if (limits.quotesPerMonth === -1) {
    return { tier, limits, quotesUsed: 0, tokensUsed: 0, allowed: true };
  }

  // Count usage this calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count: quotesUsed } = await supabase
    .from("token_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", "generate-quote")
    .gte("created_at", monthStart);

  const { data: tokenSum } = await supabase
    .from("token_usage")
    .select("total_tokens")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  const tokensUsed = (tokenSum ?? []).reduce(
    (sum: number, row: { total_tokens: number }) => sum + row.total_tokens,
    0
  );

  const used = quotesUsed ?? 0;

  if (used >= limits.quotesPerMonth) {
    return {
      tier,
      limits,
      quotesUsed: used,
      tokensUsed,
      allowed: false,
      reason: `Je hebt je maandlimiet van ${limits.quotesPerMonth} offertes bereikt. Upgrade naar ${tier === "free" ? "Pro" : "Business"} voor meer.`,
    };
  }

  if (limits.maxTokensPerMonth > 0 && tokensUsed >= limits.maxTokensPerMonth) {
    return {
      tier,
      limits,
      quotesUsed: used,
      tokensUsed,
      allowed: false,
      reason: `Je token-limiet voor deze maand is bereikt. Upgrade voor meer capaciteit.`,
    };
  }

  return { tier, limits, quotesUsed: used, tokensUsed, allowed: true };
}
