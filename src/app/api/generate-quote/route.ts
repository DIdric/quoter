import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ??
  "https://your-n8n-instance.com/webhook/generate-quote";

export async function POST(request: Request) {
  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile for rates
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get user materials
  const { data: materials } = await supabase
    .from("materials")
    .select("*")
    .eq("user_id", user.id);

  const body = await request.json();

  // Send data to n8n webhook
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        profile: {
          business_name: profile?.business_name,
          hourly_rate: profile?.hourly_rate,
          margin_percentage: profile?.margin_percentage,
        },
        materials: materials ?? [],
        user_id: user.id,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Fout bij het genereren van de offerte" },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error: "Kan geen verbinding maken met de AI-service",
        message:
          "Configureer de N8N_WEBHOOK_URL omgevingsvariabele om de offerte-generatie te activeren.",
      },
      { status: 503 }
    );
  }
}
