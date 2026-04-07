import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { CONSTRUCTION_MODULES } from "@/lib/construction-modules";
import { trackTokenUsage } from "@/lib/track-usage";
import { checkUsageQuota } from "@/lib/usage-limits";

const SYSTEM_PROMPT = `Je bent een ervaren calculator/werkvoorbereider voor een Nederlands aannemersbedrijf. Je genereert gedetailleerde, professionele offertes op basis van projectbeschrijvingen.

## TONE CALIBRATION — Small Builder Voice
You are writing on behalf of a skilled local tradesperson, not a corporation. The voice is:
- Direct and confident, not formal
- First name basis with the client where possible
- Local and specific — always reference the location and specific job details
- Never use: "vrijblijvende offerte", "passende aanbieding", "met vriendelijke groet" — these are trust-killers

## INTRO FORMULA (for the summary field — max 3 sentences)
1. One sentence: confirm the job is happening (Dopamine) — e.g. "Goed nieuws: we gaan [job] doen bij [location]."
2. One sentence: what exactly will be done, where, how long (Serotonin)
3. One sentence: what the client does not need to worry about (Oxytocin)

## CLOSING FORMULA (for the new closing field — max 3 sentences)
1. One sentence: restate the value, not the price (Oxytocin)
2. One sentence: local credibility signal if location is known (Oxytocin)
3. One sentence: specific CTA with time anchor (Dopamine) — e.g. "Akkoord? Stuur een berichtje — dan plannen we uitvoering deze week nog."
Never use "vrijblijvende offerte", "passende aanbieding", or "met vriendelijke groet".

## VARIANT SELECTION RULE
Select the price presentation format automatically as the recommended default based on total quote value:
- Total < €750: Set display_mode to "hoogover" (total only)
- Total €750–€2.500: Set display_mode to "module" (subtotals per work category)
- Total > €2.500: Set display_mode to "open" (full line-item breakdown)
The builder can override this in the editor. Include "display_mode" in your JSON output.

## CLOSING RULE — NON-NEGOTIABLE
The quote ends after the CTA sentence in the closing field.
Never add: "Wij vertrouwen erop u hiermee een passende aanbieding te hebben gedaan.", "Met vriendelijke groet", or any equivalent formal closing after the CTA.
The CTA is the last sentence. Full stop.

Je output is ALTIJD valide JSON met exact deze structuur:
{
  "quote_title": "Titel van de offerte",
  "summary": "string — 3 zinnen volgens INTRO FORMULA",
  "closing": "string — 3 zinnen volgens CLOSING FORMULA",
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
  "notes": "Eventuele opmerkingen of aannames",
  "uitsluitingen": ["Voorbeeld: schilderwerk is niet inbegrepen", "Voorbeeld: oplevering conform NEN 2767"],
  "display_mode": "hoogover" | "module" | "open"
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
- Elke regel MOET een specifieke, niet-lege description hebben. Bijvoorbeeld: "Waterleiding 15mm aanleggen", "Cementdekvloer 8cm storten", "Wandtegel 20x30cm mat wit", "Kozijn demonteren incl. afvoer". Nooit een lege string.
- Genereer 3-5 relevante uitsluitingen voor dit projecttype. Gebruik vakjargon. Wees specifiek en concreet, niet generiek.
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

  // Check usage quota
  const quota = await checkUsageQuota(user.id);
  if (!quota.allowed) {
    return Response.json(
      {
        error: "QUOTA_EXCEEDED",
        message: quota.reason,
        quota: {
          tier: quota.tier,
          quotesUsed: quota.quotesUsed,
          quotesLimit: quota.totalLimit,
          referralCode: quota.referralCode,
        },
      },
      { status: 403 }
    );
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
    .select("hourly_rate, margin_percentage, business_name, estimation_style, tone_style")
    .eq("id", user.id)
    .single();

  const { data: materials } = await supabase
    .from("materials")
    .select("*")
    .eq("user_id", user.id);

  // Also fetch default materials for reference pricing
  const { data: defaultMaterials } = await supabase
    .from("default_materials")
    .select("name, unit, cost_price");

  const body = await request.json();

  const hourlyRate = profile?.hourly_rate ?? 45;
  const marginPct = profile?.margin_percentage ?? 15;
  const businessName = profile?.business_name ?? "Mijn Bedrijf";
  const estimationStyle: string = profile?.estimation_style ?? "realistisch";
  const toneStyle: string = profile?.tone_style ?? "persoonlijk";

  const language: string = body.language || "nl";
  const languageNames: Record<string, string> = {
    nl: "Nederlands",
    en: "English",
    de: "Deutsch",
    pl: "Polski",
  };
  const translationInstruction =
    language !== "nl"
      ? `\nTaal: Schrijf ALLE tekst (titels, beschrijvingen, samenvatting, opmerkingen, werkbeschrijvingen, uitsluitingen) in het ${languageNames[language] ?? language}. Houd eenheden (m², m, m3, stuk, uur, kg, liter, doos, zak), getallen, productnamen en bedragen onvertaald.\n`
      : "";

  const userMaterialsList =
    materials && materials.length > 0
      ? materials
          .map(
            (m: { name: string; unit: string; cost_price: number }) =>
              `- ${m.name}: €${m.cost_price} per ${m.unit}`
          )
          .join("\n")
      : "";

  const defaultMaterialsList =
    defaultMaterials && defaultMaterials.length > 0
      ? defaultMaterials
          .map(
            (m: { name: string; unit: string; cost_price: number }) =>
              `- ${m.name}: €${m.cost_price} per ${m.unit}`
          )
          .join("\n")
      : "";

  const materialsList = userMaterialsList
    ? `Eigen materialen (prioriteit):\n${userMaterialsList}${defaultMaterialsList ? `\n\nReferentieprijzen:\n${defaultMaterialsList}` : ""}`
    : defaultMaterialsList
      ? `Referentieprijzen:\n${defaultMaterialsList}`
      : "Geen materialen beschikbaar. Schat marktconforme materiaalprijzen.";

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
${body.ai_input}${translationInstruction}`;

  // Use streaming for faster perceived response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        let fullText = "";

        const labourEstimationSection = `\n\n## LABOUR ESTIMATION STYLE\n${estimationStyle === "scherp"
          ? "Estimate labour hours on the LOW end — tight, efficient, no slack. Assume an experienced crew with no surprises."
          : estimationStyle === "ruim"
          ? "Estimate labour hours on the HIGH end — include buffer time for unexpected issues, access difficulties, and cleanup. Better to overestimate than underestimate."
          : "Estimate labour hours realistically — market-standard for a skilled tradesperson. Not too tight, not too generous."
        }`;

        const toneSection = toneStyle === "professioneel"
          ? `\n\n## TONE — PROFESSIONAL\nWrite in a polite, slightly formal tone. Use the client's full name or "u". Keep the DOSE structure but phrase it professionally. Avoid slang or overly casual language. Still be specific and concrete — no corporate vagueness.`
          : `\n\n## TONE — PERSONAL\nWrite in a direct, warm, first-name basis tone. Address the client by first name where possible. Be local and specific. Confident but human. This is the default Small Builder Voice.`;

        const streamResponse = client.messages.stream({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 8192,
          messages: [{ role: "user", content: userMessage }],
          system: SYSTEM_PROMPT + labourEstimationSection + toneSection,
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

        // Track token usage (await to ensure it completes before stream closes)
        await trackTokenUsage({
          userId: user.id,
          endpoint: "generate-quote",
          model: "claude-sonnet-4-5-20250929",
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        }).catch((e) => console.error("[generate-quote] Token tracking failed:", e));

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

        // Recalculate line totals and enforce hourly rate from profile
        if (Array.isArray(quoteData.lines)) {
          quoteData.lines = quoteData.lines.map((line: { quantity: number; unit_price: number; total: number; type: string }) => {
            // Enforce the user's hourly rate on all labor lines
            const unitPrice = line.type === "arbeid" ? hourlyRate : line.unit_price;
            return {
              ...line,
              unit_price: unitPrice,
              total: Math.round(line.quantity * unitPrice * 100) / 100,
            };
          });
          const subtotalMaterials = quoteData.lines
            .filter((l: { type: string }) => l.type === "materiaal")
            .reduce((sum: number, l: { total: number }) => sum + l.total, 0);
          const subtotalLabor = quoteData.lines
            .filter((l: { type: string }) => l.type === "arbeid")
            .reduce((sum: number, l: { total: number }) => sum + l.total, 0);
          const base = subtotalMaterials + subtotalLabor;
          const marginAmount = Math.round(base * (marginPct / 100) * 100) / 100;
          const totalExclBtw = Math.round((base + marginAmount) * 100) / 100;
          const btwAmount = Math.round(totalExclBtw * 0.21 * 100) / 100;
          const totalInclBtw = Math.round((totalExclBtw + btwAmount) * 100) / 100;

          quoteData.subtotal_materials = subtotalMaterials;
          quoteData.subtotal_labor = subtotalLabor;
          quoteData.margin_amount = marginAmount;
          quoteData.total_excl_btw = totalExclBtw;
          quoteData.btw_amount = btwAmount;
          quoteData.total_incl_btw = totalInclBtw;
        }

        // Store language
        quoteData.language = language;

        // Store AI uitsluitingen as suggestions; user starts with empty accepted list
        if (Array.isArray(quoteData.uitsluitingen)) {
          quoteData.uitsluitingen_suggestions = quoteData.uitsluitingen;
        } else {
          quoteData.uitsluitingen_suggestions = [];
        }
        quoteData.uitsluitingen = [];

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

        // Validate: each selected module should have at least one corresponding line
        if (Array.isArray(quoteData.modules) && quoteData.modules.length > 0 && Array.isArray(quoteData.lines)) {
          const lineCategories = new Set(
            quoteData.lines.map((l: { category: string }) => l.category.toLowerCase().trim())
          );
          const missingModules: string[] = quoteData.modules
            .filter((mod: { name: string }) => !lineCategories.has(mod.name.toLowerCase().trim()))
            .map((mod: { name: string }) => mod.name);
          if (missingModules.length > 0) {
            quoteData.validation_warnings = missingModules.map(
              (name: string) => `"${name}" staat in de werkbeschrijving maar heeft geen corresponderende regel in de prijstabel`
            );
          }
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
