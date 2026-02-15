import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Je bent een ervaren calculator/werkvoorbereider voor een Nederlands aannemersbedrijf. Je genereert gedetailleerde, professionele offertes op basis van projectbeschrijvingen.

Je output is ALTIJD valide JSON met exact deze structuur:
{
  "quote_title": "Titel van de offerte",
  "summary": "Korte samenvatting van het project (1-2 zinnen)",
  "lines": [
    {
      "category": "Categorie (bijv. Sloopwerk, Tegelwerk, Sanitair, Elektra, Loodgieterswerk, Timmerwerk, Schilderwerk, Afwerking)",
      "description": "Beschrijving van de werkzaamheid of het materiaal",
      "type": "arbeid | materiaal",
      "quantity": 1,
      "unit": "stuk | m | m2 | m3 | uur | kg | liter | doos | zak",
      "unit_price": 45.00,
      "total": 45.00
    }
  ],
  "subtotal_materials": 0,
  "subtotal_labor": 0,
  "margin_amount": 0,
  "total_excl_btw": 0,
  "btw_amount": 0,
  "total_incl_btw": 0,
  "estimated_days": 0,
  "notes": "Eventuele opmerkingen of aannames"
}

Regels:
- Gebruik het uurtarief en de marge uit het profiel van de gebruiker
- Als er materialen beschikbaar zijn in de materialenlijst, gebruik dan die prijzen
- Schat realistische hoeveelheden op basis van de projectbeschrijving
- Bereken arbeid in uren met het opgegeven uurtarief
- Pas de winstmarge toe op het subtotaal (materialen + arbeid)
- BTW is 21% over het totaal inclusief marge
- Geef realistische schattingen - liever iets ruimer dan te krap
- Groepeer werkzaamheden logisch per categorie
- Geef alleen de JSON terug, geen andere tekst`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "AI-service niet geconfigureerd",
        message:
          "Configureer de ANTHROPIC_API_KEY omgevingsvariabele om de offerte-generatie te activeren.",
      },
      { status: 503 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: materials } = await supabase
    .from("materials")
    .select("*")
    .eq("user_id", user.id);

  const body = await request.json();

  const hourlyRate = profile?.hourly_rate ?? 45;
  const marginPct = profile?.margin_percentage ?? 15;
  const businessName = profile?.business_name ?? "Mijn Bedrijf";

  const materialsList =
    materials && materials.length > 0
      ? materials
          .map(
            (m: { name: string; unit: string; cost_price: number }) =>
              `- ${m.name}: €${m.cost_price} per ${m.unit}`
          )
          .join("\n")
      : "Geen materialen in de bibliotheek. Schat marktconforme materiaalprijzen.";

  const userMessage = `Genereer een offerte met de volgende gegevens:

Bedrijf: ${businessName}
Uurtarief: €${hourlyRate}/uur
Winstmarge: ${marginPct}%

Klant: ${body.client_name}
Project: ${body.project_title}
Locatie: ${body.project_location || "Niet opgegeven"}
Projectomschrijving: ${body.project_description || "Geen aanvullende omschrijving"}

Beschikbare materialen met prijzen:
${materialsList}

Opdracht van de aannemer:
${body.ai_input}`;

  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [{ role: "user", content: userMessage }],
      system: SYSTEM_PROMPT,
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Geen antwoord ontvangen van AI" },
        { status: 502 }
      );
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Ongeldig AI-antwoord", raw: textBlock.text },
        { status: 502 }
      );
    }

    const quoteData = JSON.parse(jsonMatch[0]);
    return NextResponse.json(quoteData);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json(
      {
        error: "Fout bij het genereren van de offerte",
        message,
      },
      { status: 502 }
    );
  }
}
