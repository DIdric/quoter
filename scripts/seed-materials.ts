/**
 * Seed default materials from CSV into Supabase.
 *
 * Usage: npx tsx scripts/seed-materials.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
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
  const csvPath = resolve(__dirname, "../data/hornbach-materialen.csv");
  const csv = readFileSync(csvPath, "utf-8");
  const lines = csv.split("\n").filter((l) => l.trim());
  const dataLines = lines.slice(1); // Skip header

  const materials = dataLines.map((line) => {
    const [name, category, unit, priceStr] = line.split(";").map((s) => s.trim());
    const cost_price = parseFloat(priceStr);
    if (!name || isNaN(cost_price)) return null;
    return {
      name,
      category: category || "Overig",
      unit: unit || "stuk",
      cost_price,
      source: "Hornbach",
    };
  }).filter(Boolean);

  console.log(`Importing ${materials.length} materials...`);

  // Clear existing default materials first
  const { error: deleteError } = await supabase
    .from("default_materials")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

  if (deleteError) {
    console.error("Failed to clear existing materials:", deleteError.message);
  }

  // Insert in batches of 50
  for (let i = 0; i < materials.length; i += 50) {
    const batch = materials.slice(i, i + 50);
    const { error } = await supabase.from("default_materials").insert(batch);
    if (error) {
      console.error(`Failed to insert batch ${i / 50 + 1}:`, error.message);
    } else {
      console.log(`Inserted batch ${i / 50 + 1} (${batch.length} items)`);
    }
  }

  console.log("Done!");
}

main();
