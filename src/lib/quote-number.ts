import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generates the next quote number for a user.
 * Format: {prefix}{YYYY}-{NNN}
 * Example: "2026-001", "OFF-2026-001"
 */
export async function generateQuoteNumber(
  supabase: SupabaseClient,
  userId: string,
  prefix: string = ""
): Promise<string> {
  const year = new Date().getFullYear();
  const yearStr = String(year);

  // Find the highest quote number for this user in the current year
  // We look for patterns like "2026-" or "OFF-2026-" in the quote_number
  const { data: quotes } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("user_id", userId)
    .not("quote_number", "is", null)
    .like("quote_number", `%${yearStr}-%`)
    .order("quote_number", { ascending: false })
    .limit(10);

  let maxSeq = 0;

  if (quotes && quotes.length > 0) {
    for (const q of quotes) {
      const num = q.quote_number as string;
      // Extract the sequence number after "YYYY-"
      const match = num.match(new RegExp(`${yearStr}-(\\d+)$`));
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, "0");
  return `${prefix}${yearStr}-${nextSeq}`;
}
