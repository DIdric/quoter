import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "@/lib/track-usage";
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, mimeType } = body as { imageUrl: string; mimeType?: string };

    if (!imageUrl) {
      return NextResponse.json({ error: "Geen afbeeldingsURL opgegeven" }, { status: 400 });
    }

    // Reject HEIC/HEIF upfront with helpful message
    if (mimeType === "image/heic" || mimeType === "image/heif") {
      return NextResponse.json(
        {
          error:
            "HEIC-formaat wordt niet ondersteund. Zet je iPhone op JPEG via: Instellingen > Camera > Formaten > Meest compatibel",
        },
        { status: 415 }
      );
    }

    // Fetch image and convert to base64
    const imageRes = await fetch(imageUrl);
    const contentType = imageRes.headers.get("content-type") ?? mimeType ?? "image/jpeg";
    const cleanType = contentType.split(";")[0].trim();
    const supportedType = SUPPORTED_TYPES[cleanType] ?? "image/jpeg";

    const arrayBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: supportedType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `Je bent een Nederlandse bouwcalculator. Analyseer deze foto en beschrijf de werkzaamheden die nodig zijn in maximaal 150 woorden. Gebruik vakjargon. Wees specifiek over materialen en afmetingen als die zichtbaar zijn. Begin direct met de werkzaamheden, geen inleiding.`,
            },
          ],
        },
      ],
    });

    // Track token usage
    await trackTokenUsage({
      userId: user.id,
      endpoint: "analyze-photo",
      model: "claude-sonnet-4-5-20250929",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }).catch((e) => console.error("[analyze-photo] Token tracking failed:", e));

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ description: responseText });
  } catch (err) {
    console.error("[analyze-photo] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        error:
          "De foto kon niet worden geanalyseerd. Probeer een scherpere foto of beschrijf de klus in tekst.",
      },
      { status: 500 }
    );
  }
}
