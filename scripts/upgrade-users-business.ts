/**
 * Upgrade test users to the business subscription tier.
 *
 * Usage:
 *   Upgrade all users:      npx tsx scripts/upgrade-users-business.ts
 *   Upgrade specific users: npx tsx scripts/upgrade-users-business.ts user@example.com other@example.com
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Note: This directly updates the database and bypasses Stripe.
 * Only use this for test/sandbox users.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const emailFilter = process.argv.slice(2);

  // Fetch users from auth.users via admin API
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Failed to fetch users:", authError.message);
    process.exit(1);
  }

  let users = authData.users;

  if (emailFilter.length > 0) {
    users = users.filter((u) => emailFilter.includes(u.email ?? ""));
    if (users.length === 0) {
      console.error("No users found matching:", emailFilter.join(", "));
      process.exit(1);
    }
  }

  console.log(`\nUpgrading ${users.length} user(s) to business tier:\n`);

  for (const user of users) {
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("subscription_tier, business_name")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      console.log(`  ✗ ${user.email} — profiel niet gevonden (${fetchError.message})`);
      continue;
    }

    if (profile.subscription_tier === "business") {
      console.log(`  ~ ${user.email} — al op business tier, overgeslagen`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ subscription_tier: "business" })
      .eq("id", user.id);

    if (updateError) {
      console.log(`  ✗ ${user.email} — update mislukt: ${updateError.message}`);
    } else {
      const name = profile.business_name ? ` (${profile.business_name})` : "";
      console.log(`  ✓ ${user.email}${name} — geüpgraded van ${profile.subscription_tier} naar business`);
    }
  }

  console.log("\nKlaar!");
}

main();
