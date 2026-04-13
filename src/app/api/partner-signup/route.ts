import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_DESIGN_PARTNERS = 20;
const TRIAL_DAYS = 30;
const N8N_WEBHOOK = "https://didric.app.n8n.cloud/webhook/partner-signup";

export async function GET() {
  // Public endpoint: returns available slots so the landing page can adapt
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count } = await supabase
    .from("partner_signups")
    .select("*", { count: "exact", head: true });

  const taken = count ?? 0;
  return NextResponse.json({ taken, available: MAX_DESIGN_PARTNERS - taken });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, company, email, phone, info } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Naam en e-mailadres zijn verplicht." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check slot count
  const { count } = await supabase
    .from("partner_signups")
    .select("*", { count: "exact", head: true });

  const taken = count ?? 0;

  if (taken >= MAX_DESIGN_PARTNERS) {
    return NextResponse.json({ slotsAvailable: false }, { status: 200 });
  }

  // Check for duplicate email
  const { data: existing } = await supabase
    .from("partner_signups")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    // Treat as success (idempotent) so user doesn't get an error
    return NextResponse.json({ success: true, slotsAvailable: true });
  }

  // Save signup
  const { error: insertError } = await supabase.from("partner_signups").insert({
    name: name.trim(),
    company: company?.trim() || null,
    email: email.toLowerCase().trim(),
    phone: phone?.trim() || null,
    info: info?.trim() || null,
  });

  if (insertError) {
    console.error("partner_signups insert error:", insertError);
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }

  // Create Supabase invite (sends magic link / invite email)
  const trialUntil = new Date();
  trialUntil.setDate(trialUntil.getDate() + TRIAL_DAYS);

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    {
      data: {
        business_name: company?.trim() || name.trim(),
        is_design_partner: true,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://quoter.nu"}/auth/callback?next=/onboarding`,
    }
  );

  if (inviteError) {
    console.error("invite error:", inviteError);
    // Don't fail the request — signup is saved, invite can be resent
  }

  // Set trial on profile (profile is created by Supabase trigger on auth.users insert)
  if (inviteData?.user?.id) {
    // Update partner_signups with user_id
    await supabase
      .from("partner_signups")
      .update({ user_id: inviteData.user.id })
      .eq("email", email.toLowerCase().trim());

    // Set pro tier + trial (upsert in case trigger already fired)
    await supabase.from("profiles").upsert({
      id: inviteData.user.id,
      subscription_tier: "pro",
      trial_until: trialUntil.toISOString().split("T")[0],
      business_name: company?.trim() || name.trim(),
    });
  }

  // Notify Didric via n8n
  const newCount = taken + 1;
  fetch(N8N_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, company, email, phone, info, partner_count: newCount }),
  }).catch(() => {}); // fire-and-forget

  return NextResponse.json({ success: true, slotsAvailable: true, taken: newCount });
}
