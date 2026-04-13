import { createClient } from "@supabase/supabase-js";

export type SubscriptionTier = "free" | "pro" | "business";

export interface TierLimits {
  label: string;
  quotesPerMonth: number; // max AI-generated quotes per calendar month (-1 = unlimited)
  maxTokensPerMonth: number; // safety net: max total tokens per month
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    label: "Free",
    quotesPerMonth: -1, // free tier uses free_quotes_used + referral_credits instead
    maxTokensPerMonth: -1,
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
  totalLimit: number;
  referralCode: string | null;
  isTrial: boolean;
  trialUntil: string | null;
}

const FREE_BASE_LIMIT = 3;
const FREE_MAX_REFERRAL_CREDITS = 6;

/**
 * Check if a user is within their usage quota.
 * - Free tier: lifetime limit of 3 + min(referral_credits, 6) quotes
 * - Pro tier: monthly limit of 50 quotes
 * - Business tier: unlimited
 */
export async function checkUsageQuota(userId: string): Promise<UsageStatus> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, free_quotes_used, referral_credits, referral_code, trial_until")
    .eq("id", userId)
    .single();

  const tier: SubscriptionTier = profile?.subscription_tier ?? "free";
  const limits = TIER_LIMITS[tier];
  const referralCode: string | null = profile?.referral_code ?? null;
  const trialUntil: string | null = profile?.trial_until ?? null;
  const isInTrial = trialUntil !== null && new Date(trialUntil) > new Date();

  // Trial users — unlimited access until trial_until date
  if (isInTrial) {
    return {
      tier,
      limits: TIER_LIMITS["business"],
      quotesUsed: 0,
      tokensUsed: 0,
      allowed: true,
      totalLimit: -1,
      referralCode,
      isTrial: true,
      trialUntil,
    };
  }

  // Business tier — unlimited
  if (tier === "business") {
    return {
      tier,
      limits,
      quotesUsed: 0,
      tokensUsed: 0,
      allowed: true,
      totalLimit: -1,
      referralCode,
      isTrial: false,
      trialUntil: null,
    };
  }

  // Pro tier — monthly quota
  if (tier === "pro") {
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
        reason: `Je hebt je maandlimiet van ${limits.quotesPerMonth} offertes bereikt. Upgrade naar Business voor meer.`,
        totalLimit: limits.quotesPerMonth,
        referralCode,
        isTrial: false,
        trialUntil: null,
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
        totalLimit: limits.quotesPerMonth,
        referralCode,
        isTrial: false,
        trialUntil: null,
      };
    }

    return {
      tier,
      limits,
      quotesUsed: used,
      tokensUsed,
      allowed: true,
      totalLimit: limits.quotesPerMonth,
      referralCode,
      isTrial: false,
      trialUntil: null,
    };
  }

  // Free tier — lifetime quota based on free_quotes_used + referral_credits
  const freeQuotesUsed: number = profile?.free_quotes_used ?? 0;
  const referralCredits: number = Math.min(
    profile?.referral_credits ?? 0,
    FREE_MAX_REFERRAL_CREDITS
  );
  const totalLimit = FREE_BASE_LIMIT + referralCredits;

  if (freeQuotesUsed >= totalLimit) {
    return {
      tier,
      limits,
      quotesUsed: freeQuotesUsed,
      tokensUsed: 0,
      allowed: false,
      reason: `Je ${FREE_BASE_LIMIT} gratis offertes zijn op. Nodig een collega uit via je referral link of upgrade naar Pro.`,
      totalLimit,
      referralCode,
      isTrial: false,
      trialUntil: null,
    };
  }

  return {
    tier,
    limits,
    quotesUsed: freeQuotesUsed,
    tokensUsed: 0,
    allowed: true,
    totalLimit,
    referralCode,
    isTrial: false,
    trialUntil: null,
  };
}
