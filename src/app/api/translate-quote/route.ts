import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const LANGUAGE_NAMES: Record<string, string> = {
  nl: "Dutch",
  en: "English",
  de: "German",
  pl: "Polish",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI niet geconfigureerd" }, { status: 503 });
  }

  const { quote_id, target_language } = await request.json();

  if (!quote_id || !target_language) {
    return NextResponse.json({ error: "Ongeldige parameters" }, { status: 400 });
  }

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quote_id)
    .eq("user_id", user.id)
    .single();

  if (!quote) {
    return NextResponse.json({ error: "Offerte niet gevonden" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonData = (quote.json_data as Record<string, any>) ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (jsonData.result as Record<string, any>) ?? {};

  if (!result.lines) {
    return NextResponse.json({ error: "Geen offerte-inhoud om te vertalen" }, { status: 400 });
  }

  const langName = LANGUAGE_NAMES[target_language] ?? target_language;

  // Build a compact object of all texts to translate
  const textsToTranslate = {
    quote_title: result.quote_title ?? "",
    summary: result.summary ?? "",
    notes: result.notes ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lines_descriptions: (result.lines as any[]).map((l: { description: string }) => l.description),
    modules: (result.modules ?? []).map((m: { name: string; intro: string; items: string[] }) => ({
      name: m.name,
      intro: m.intro,
      items: m.items,
    })),
    uitsluitingen: result.uitsluitingen ?? [],
    uitsluitingen_suggestions: result.uitsluitingen_suggestions ?? [],
  };

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Translate the following JSON to ${langName}. Rules:
- Keep product names, units (m², m, m3, stuk, uur, kg, liter, doos, zak), numbers and amounts untranslated
- Return ONLY valid JSON with the exact same structure and keys
- Do not add any explanation

${JSON.stringify(textsToTranslate)}`,
      },
    ],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Vertaling mislukt" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let translated: Record<string, any>;
  try {
    translated = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "Vertaling kon niet worden verwerkt" }, { status: 500 });
  }

  // Merge translated texts back into result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translatedLines = (result.lines as any[]).map((line: any, i: number) => ({
    ...line,
    description: translated.lines_descriptions?.[i] ?? line.description,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translatedModules = (result.modules ?? []).map((mod: any, i: number) => ({
    ...mod,
    name: translated.modules?.[i]?.name ?? mod.name,
    intro: translated.modules?.[i]?.intro ?? mod.intro,
    items: translated.modules?.[i]?.items ?? mod.items,
  }));

  const newResult = {
    ...result,
    quote_title: translated.quote_title ?? result.quote_title,
    summary: translated.summary ?? result.summary,
    notes: translated.notes ?? result.notes,
    lines: translatedLines,
    modules: translatedModules,
    uitsluitingen: translated.uitsluitingen ?? result.uitsluitingen ?? [],
    uitsluitingen_suggestions: translated.uitsluitingen_suggestions ?? result.uitsluitingen_suggestions ?? [],
    language: target_language,
  };

  // Create new quote (original stays intact)
  const { data: newQuote, error } = await supabase
    .from("quotes")
    .insert({
      user_id: user.id,
      client_name: quote.client_name,
      status: "draft",
      json_data: {
        ...jsonData,
        result: newResult,
        language: target_language,
      },
    })
    .select("id")
    .single();

  if (error || !newQuote) {
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ id: newQuote.id });
}
