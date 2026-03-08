import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { CONSTRUCTION_MODULES } from "@/lib/construction-modules";

const SYSTEM_PROMPT = `Je bent een ervaren calculator/werkvoorbereider voor een Nederlands aannemersbedrijf. Je genereert gedetailleerde, professionele offertes op basis van projectbeschrijvingen.

Je output is ALTIJD valide JSON met exact deze structuur:
{
  "quote_title": "Titel van de offerte",
  "summary": "Korte samenvatting van het project (1-2 zinnen)",
  "lines": [
    {
      "category": "Categorie",
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
- Als er bouwmodules zijn geselecteerd, gebruik de modulenamen als categorieën. Genereer 3-8 regels per module.
- Wees beknopt in beschrijvingen
- Geef alleen de JSON terug, geen andere tekst`;

/**
 * Attempts to repair truncated JSON by closing open brackets/braces.
 */
function repairTruncatedJson(json: string): string {
  let str = json.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  str = str.replace(/,\s*$/, "");

  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of str) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") openBraces++;
    if (ch === "}") openBraces--;
    if (ch === "[") openBrackets++;
    if (ch === "]") openBrackets--;
  }

  if (inString) str += '"';
  while (openBrackets > 0) { str += "]"; openBrackets--; }
  while (openBraces > 0) { str += "}"; openBraces--; }

  return str;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error: "AI-service niet geconfigureerd",
        message: "Configureer de ANTHROPIC_API_KEY omgevingsvariabele.",
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

  // Build compact modules section
  const selectedModuleIds: string[] = body.selectedModules || [];
  let modulesSection = "";
  if (selectedModuleIds.length > 0) {
    const moduleNames = selectedModuleIds
      .map((id: string) => {
        const mod = CONSTRUCTION_MODULES.find((m) => m.id === id);
        return mod ? mod.name : null;
      })
      .filter(Boolean);
    modulesSection = `\n\nGeselecteerde modules (gebruik als categorieën): ${moduleNames.join(", ")}`;
  }

  const userMessage = `Genereer een offerte:

Bedrijf: ${businessName}
Uurtarief: €${hourlyRate}/uur
Winstmarge: ${marginPct}%
Klant: ${body.client_name}
Project: ${body.project_title}
Locatie: ${body.project_location || "Niet opgegeven"}
Omschrijving: ${body.project_description || "Geen"}
${modulesSection}

Materialen:
${materialsList}

Opdracht:
${body.ai_input}`;

  // Use streaming for faster perceived response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        let fullText = "";

        const streamResponse = client.messages.stream({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 8192,
          messages: [{ role: "user", content: userMessage }],
          system: SYSTEM_PROMPT,
        });

        // Send progress events as SSE
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "progress", stage: "Offerte wordt opgesteld..." })}\n\n`)
        );

        let linesFound = false;

        streamResponse.on("text", (text) => {
          fullText += text;

          // Send progress updates at key milestones
          if (!linesFound && fullText.includes('"lines"')) {
            linesFound = true;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "progress", stage: "Regels berekenen..." })}\n\n`)
            );
          }
        });

        const finalMessage = await streamResponse.finalMessage();

        // Process result
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Ongeldig AI-antwoord" })}\n\n`)
          );
          controller.close();
          return;
        }

        let jsonStr = jsonMatch[0];
        if (finalMessage.stop_reason === "max_tokens") {
          jsonStr = repairTruncatedJson(jsonStr);
        }

        const quoteData = JSON.parse(jsonStr);

        // Merge module definitions from our own data (not AI-generated)
        if (selectedModuleIds.length > 0) {
          quoteData.modules = selectedModuleIds
            .map((id: string) => {
              const mod = CONSTRUCTION_MODULES.find((m) => m.id === id);
              if (!mod) return null;
              return {
                name: mod.name,
                intro: mod.intro,
                items: mod.items,
              };
            })
            .filter(Boolean);
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "result", data: quoteData })}\n\n`)
        );
        controller.close();
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Onbekende fout";
        const isJsonError = errMsg.includes("JSON") || errMsg.includes("position");
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: isJsonError
                ? "AI-antwoord kon niet verwerkt worden. Probeer opnieuw."
                : "Fout bij het genereren van de offerte",
              message: errMsg,
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
