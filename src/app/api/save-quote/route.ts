import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateQuoteNumber } from "@/lib/quote-number";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { client_name, status, json_data, existing_project_id } = body;

    // Get user's quote number prefix
    const { data: profile } = await supabase
      .from("profiles")
      .select("quote_number_prefix")
      .eq("id", user.id)
      .single();

    const prefix = profile?.quote_number_prefix || "";

    if (existing_project_id) {
      // Update existing quote
      await supabase
        .from("quotes")
        .update({
          client_name,
          status: status || "draft",
          json_data,
        })
        .eq("id", existing_project_id)
        .eq("user_id", user.id);

      // Assign quote number if not yet assigned
      const { data: existing } = await supabase
        .from("quotes")
        .select("quote_number")
        .eq("id", existing_project_id)
        .single();

      if (!existing?.quote_number && json_data?.result) {
        const quoteNumber = await generateQuoteNumber(supabase, user.id, prefix);
        await supabase
          .from("quotes")
          .update({ quote_number: quoteNumber })
          .eq("id", existing_project_id);
      }

      return NextResponse.json({ id: existing_project_id });
    } else {
      // Generate quote number only if there's a result (not a draft without content)
      const quoteNumber = json_data?.result
        ? await generateQuoteNumber(supabase, user.id, prefix)
        : null;

      const { data, error } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          client_name,
          status: status || "draft",
          json_data,
          quote_number: quoteNumber,
        })
        .select("id")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ id: data.id });
    }
  } catch (error: unknown) {
    console.error("Save quote error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
