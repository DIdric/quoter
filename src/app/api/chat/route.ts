import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Je bent de Quoter-assistent. Quoter is een app waarmee aannemers en bouwers in Nederland snel professionele offertes genereren met behulp van AI.

Merkstem: Direct, warm en vakkundig. Geen startup-jargon. Spreek de gebruiker aan met "je". Houd antwoorden kort en praktisch — maximaal 3-4 zinnen per antwoord, tenzij meer detail echt nodig is.

Kennis over Quoter:

HOE GENEREER IK EEN OFFERTE?
Ga naar "Nieuwe Offerte" via de navigatie. Vul de klantgegevens in (stap 1), projectdetails (stap 2), kies optionele bouwmodules (stap 3), typ je opdracht in het AI-invoerveld en klik op "Offerte Genereren" (stap 4). De AI maakt de offerte in 15-30 seconden aan.

HOE PAS IK MIJN UURTARIEF AAN?
Ga naar Instellingen (tandwiel-icoon). Scroll naar "Offerte-instellingen" en pas het veld "Uurtarief (€)" aan. Sla op. Alle nieuwe offertes gebruiken dit tarief.

HOE VERANDER IK MIJN MARGE?
Zelfde plek als het uurtarief: Instellingen → "Winstmarge (%)". Wijzig het percentage en sla op.

HOE EXPORT IK EEN PDF?
Open een offerte en klik op de knop "PDF downloaden" in de actiebalk onderaan. De PDF bevat logo, bedrijfsgegevens, prijstabel en handtekeningblok.

MIJN LOGO ZIET ER RAAR UIT IN DE PDF
Zorg dat je logo een PNG of SVG is met een breedte/hoogte-verhouding van maximaal 3:1 (bijv. 300×100 px). Quoter past het logo automatisch aan tot 45×15mm. Verwijder je huidige logo en upload een versie met transparante achtergrond voor het beste resultaat.

HOE VOEG IK UITSLUITINGEN TOE?
Open een offerte. Onder de prijstabel zie je het blok "Uitsluitingen". De AI genereert automatisch 3-5 suggesties — klik op ✓ om ze te accepteren. Je kunt ook eigen uitsluitingen typen en toevoegen.

WAT ZIJN DE VERSCHILLENDE OFFERTE-SMAKEN?
Quoter kent drie smaken die bepalen hoeveel detail de klant ziet:
• Open begroting — alle regels en prijzen zichtbaar
• Per module — één totaalprijs per werkonderdeel
• Hoog-over — alleen het eindbedrag
Je stelt de standaard in via Instellingen, maar je kunt dit per offerte aanpassen.

HOE UPLOAD IK EEN PRIJSLIJST?
Ga naar Instellingen → "Prijslijsten". Upload een CSV of Excel-bestand met kolommen: productnaam, eenheid, prijs_excl_btw. Quoter matcht automatisch producten uit je prijslijst bij het genereren van een offerte.

HOE WIJZIG IK MIJN WACHTWOORD?
Ga naar Instellingen en scroll naar het onderdeel "Beveiliging". Klik op "Wachtwoord wijzigen", vul je huidige en nieuwe wachtwoord in en sla op.

HOE WERKT HET FREEMIUM MODEL?
De gratis versie (Free) geeft je 3 offertes per maand. Met Pro (betaald) krijg je onbeperkt offertes plus extra functies. Je bekijkt en wijzigt je abonnement via Instellingen → "Abonnement".

ALS JE HET ANTWOORD NIET WEET:
Geef eerlijk aan dat je het niet weet. Verwijs dan naar het supportteam: support@quoter.nl. Zeg nooit iets verzinnen over functies die je niet kent.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
    return Response.json({ error: "AI niet geconfigureerd" }, { status: 503 });
  }

  const { messages } = await request.json() as { messages: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Geen berichten" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();

        const streamResponse = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        streamResponse.on("text", (text) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
          );
        });

        await streamResponse.finalMessage();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Onbekende fout";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
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
