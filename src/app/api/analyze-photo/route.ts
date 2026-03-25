import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "@/lib/track-usage";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

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
    const { imageUrl } = body as { imageUrl: string };

    if (!imageUrl) {
      return NextResponse.json({ error: "Geen afbeeldingsURL opgegeven" }, { status: 400 });
    }

    // Fetch image bytes and convert to JPEG (handles HEIC/HEIF from iPhone)
    const imageRes = await fetch(imageUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    const jpegBuffer = await sharp(Buffer.from(arrayBuffer))
      .jpeg({ quality: 85 })
      .toBuffer();
    const base64Image = jpegBuffer.toString("base64");

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
                media_type: "image/jpeg",
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
    console.error("[analyze-photo] Error:", err);
    return NextResponse.json(
      {
        error:
          "De foto kon niet worden geanalyseerd. Probeer een scherpere foto of beschrijf de klus in tekst.",
      },
      { status: 500 }
    );
  }
}
