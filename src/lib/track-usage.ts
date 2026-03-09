import { createClient } from "@supabase/supabase-js";

// Cost per token (Claude Sonnet 4.5 pricing)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5-20250929": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
};

const DEFAULT_PRICING = { input: 3 / 1_000_000, output: 15 / 1_000_000 };

export async function trackTokenUsage(params: {
  userId: string;
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const pricing = PRICING[params.model] || DEFAULT_PRICING;
  const costEstimate =
    params.inputTokens * pricing.input + params.outputTokens * pricing.output;

  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("token_usage").insert({
    user_id: params.userId,
    endpoint: params.endpoint,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    total_tokens: params.inputTokens + params.outputTokens,
    cost_estimate: costEstimate,
  });
}
