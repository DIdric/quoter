import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { CONSTRUCTION_MODULES } from "@/lib/construction-modules";
import { trackTokenUsage } from "@/lib/track-usage";
import { checkUsageQuota } from "@/lib/usage-limits";

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
  "notes": "Eventuele opmerkingen of aannames",
  "uitsluitingen": ["Voorbeeld: schilderwerk is niet inbegrepen", "Voorbeeld: oplevering conform NEN 2767"]
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
- Genereer 3-5 relevante uitsluitingen voor dit projecttype. Gebruik vakjargon. Wees specifiek en concreet, niet generiek.
- Geef alleen de JSON terug, geen andere tekst

## HOEVEELHEIDSNORMEN (Nederlandse bouwpraktijk)

Gebruik deze vakkundige normen als basis voor hoeveelheidsschattingen. Pas aan op basis van complexiteit, hoogte en specifieke omstandigheden.

### Sloopwerk & demontage
- Wandtegels verwijderen: 1,5–2 uur/m²
- Vloertegels verwijderen: 1–1,5 uur/m²
- Chape/dekvloer breken: 0,5–1 uur/m²
- Systeemwand/-plafond demonteren: 0,3–0,5 uur/m²
- Keuken demonteren: 4–6 uur totaal
- Badkamer volledig strippen (≤10m²): 6–10 uur totaal
- Kozijn + deur verwijderen: 1–2 uur/stuk
- Radiatoren demonteren: 0,5–1 uur/stuk

### Tegelwerk
- Wandtegels plaatsen (standaard formaat ≤30×60): 0,8–1,2 uur/m²
- Wandtegels plaatsen (groot formaat >60×60): 0,5–0,8 uur/m²
- Vloertegels plaatsen (standaard): 0,6–1 uur/m²
- Vloertegels plaatsen (visgraat/diagonaal): 1–1,5 uur/m²
- Tegellijm wandtegels: 4–6 kg/m²; vloertegels: 6–8 kg/m²
- Voegmiddel: 0,5–1 kg/m² (afhankelijk van voegbreedte)
- Snijverlies tegels: 10–15% extra op oppervlak

### Stucwerk & afwerking
- Machine-stucen (glad): 0,12–0,18 uur/m²
- Handstucen (glad): 0,3–0,5 uur/m²
- Spuitplamuur/egaliseren: 0,1–0,15 uur/m²
- Gipsplaat (12,5mm) monteren op wand: 0,2–0,3 uur/m² (incl. schroeven, kopen: 1,05 m²/m²)
- Gipsplaat plafond: 0,3–0,4 uur/m²
- Stucpleister verbruik: 1,2–1,5 kg/m² per mm laagdikte

### Schilderwerk
- Muren/plafond schilderen 2 lagen: 0,15–0,25 uur/m²
- Kozijnen/deuren schilderen (2 lagen): 1–2 uur/strekkende meter
- Grondlaag aanbrengen: 0,1–0,15 uur/m²
- Verfverbruik: 0,1–0,15 liter/m² per laag

### Metselwerk
- Halfsteens metselwerk (100mm): 0,5–0,7 uur/m²; 55–60 stenen/m²
- Steens metselwerk (210mm): 0,8–1,2 uur/m²; 110–120 stenen/m²
- Metselmortel: 25–35 kg/m² (halfsteens)
- Lintelen plaatsen: 1–2 uur/stuk

### Vloeren
- Parket/laminaat leggen (incl. ondervloer): 0,2–0,3 uur/m²
- PVC-vloer leggen (click): 0,15–0,2 uur/m²
- Dekvloer storten (5cm, droge mortel): 0,3–0,4 uur/m²; 75 kg mortel/m²
- Vloerisolatie (EPS/PIR) leggen: 0,1–0,15 uur/m²

### Sanitair & loodgieterswerk
- CV-ketel vervangen (inclusief aansluiten): 8–12 uur
- Douche plaatsen (douchebak + wand + kraan): 6–10 uur
- Toilet plaatsen (hangtoilet incl. inbouwreservoir): 4–6 uur
- Wastafel + kraan aansluiten: 2–3 uur
- Bad plaatsen + aansluiten: 5–8 uur
- Radiator plaatsen + aansluiten: 2–3 uur/stuk
- Vloerverwarming leggen (mat): 0,2–0,3 uur/m²
- Koper/PEX leidingwerk trekken: 1–2 uur/m (afhankelijk van toegankelijkheid)

### Elektra
- Groep (16A) installeren (incl. kabel): 3–5 uur
- Stopcontact of schakelaar plaatsen: 0,5–1 uur/punt
- LED-armatuur plaatsen en aansluiten: 0,5–1 uur/stuk
- Inbouwspot plaatsen: 0,3–0,5 uur/stuk
- Kabelgoot aanbrengen: 0,2–0,3 uur/m

### Kozijnen, deuren & ramen
- Kozijn plaatsen (hout/kunststof, standaard): 3–5 uur/stuk
- Binnendeur plaatsen (incl. kozijn en hang- en sluitwerk): 3–4 uur/stuk
- Dakraam plaatsen: 4–6 uur/stuk
- Rolluik of zonwering monteren: 2–3 uur/stuk

### Isolatie
- Spouwmuurisolatie inblazen: 0,05–0,1 uur/m² (boorgaten + vullen)
- Dakisolatie (plat dak, PIR): 0,2–0,3 uur/m²
- Vloerisolatie kruipruimte (EPS): 0,15–0,2 uur/m²

### Dakwerk
- Dakpannen leggen (incl. latten): 0,4–0,6 uur/m²
- Dakbedekking plat dak (EPDM/bitumen): 0,4–0,6 uur/m²
- Dakgoot + afvoer plaatsen: 0,5–1 uur/m

### Typische projecttotalen (referentie voor estimated_days)
- Badkamer renovatie 5m²: 40–55 manuur → 5–7 werkdagen (1 man)
- Badkamer renovatie 8–10m²: 60–80 manuur → 7–10 werkdagen
- Keuken plaatsen (exclusief muren/vloer): 20–32 uur → 3–4 werkdagen
- Woning schilderen binnenzijde (100m² woonoppervlak): 60–80 uur
- Aanbouw 15m² (ruwbouw + afwerking): 200–280 manuur
- Dakkapel plaatsen (standaard): 60–100 manuur

### Richtlijn estimated_days
Bereken: (totaal arbeid uren) ÷ 8 uur/dag, afgerond naar boven. Bij 2 man op de klus: deel door 2.`;


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
        error: "Limiet bereikt",
        message: quota.reason,
        quota: {
          tier: quota.tier,
          quotesUsed: quota.quotesUsed,
          quotesLimit: quota.limits.quotesPerMonth,
        },
      },
      { status: 429 }
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
    .select("*")
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

  // Feedback loop: haal recente hoeveelheidscorrecties op (max 30, meest recent)
  const { data: rawCorrections } = await supabase
    .from("quote_corrections")
    .select("category, description, unit, ai_quantity, corrected_quantity")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  // Dedupliceer op description: bewaar alleen de meest recente per post
  const seenDescriptions = new Set<string>();
  const corrections = (rawCorrections ?? []).filter((c) => {
    const key = `${c.category}||${c.description}`;
    if (seenDescriptions.has(key)) return false;
    seenDescriptions.add(key);
    return true;
  });

  const body = await request.json();

  const hourlyRate = profile?.hourly_rate ?? 45;
  const marginPct = profile?.margin_percentage ?? 15;
  const businessName = profile?.business_name ?? "Mijn Bedrijf";

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

  const correctionsSection =
    corrections.length > 0
      ? `\n\nKalibratie op basis van eerdere correcties van deze aannemer (gebruik dit als ijkpunt voor vergelijkbare posten):\n${corrections
          .map(
            (c) =>
              `- ${c.category} / ${c.description}: gebruik ~${c.corrected_quantity} ${c.unit} (eerder gecorrigeerd van ${c.ai_quantity})`
          )
          .join("\n")}`
      : "";

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
${materialsList}${correctionsSection}

Opdracht:
${body.ai_input}${translationInstruction}`;

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
