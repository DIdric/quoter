import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { CONSTRUCTION_MODULES } from "@/lib/construction-modules";
import { trackTokenUsage } from "@/lib/track-usage";

const moduleIds = CONSTRUCTION_MODULES.map((m) => m.id);
const moduleList = CONSTRUCTION_MODULES.map(
  (m) => `- ${m.id}: ${m.name} (${m.description})`
).join("\n");

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ suggested: [] });
  }

  const body = await request.json();
  const description = [body.project_title, body.project_description]
    .filter(Boolean)
    .join(". ");

  if (!description.trim()) {
    return NextResponse.json({ suggested: [] });
  }

  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      system: `Je bent een bouwexpert. Gegeven een projectbeschrijving, geef je terug welke bouwmodules relevant zijn.

Beschikbare modules:
${moduleList}

Antwoord ALLEEN met een JSON array van module IDs, bijv: ["grondwerk","fundering"]
Geen uitleg, alleen de JSON array.`,
      messages: [
        {
          role: "user",
          content: `Welke modules zijn nodig voor dit project?\n\n${description}`,
        },
      ],
    });

    // Track token usage
    trackTokenUsage({
      userId: user.id,
      endpoint: "suggest-modules",
      model: "claude-sonnet-4-5-20250929",
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    }).catch(() => {});

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ suggested: [] });
    }

    const match = textBlock.text.match(/\[[\s\S]*?\]/);
    if (!match) {
      return NextResponse.json({ suggested: [] });
    }

    const parsed: string[] = JSON.parse(match[0]);
    const valid = parsed.filter((id) => moduleIds.includes(id));

    return NextResponse.json({ suggested: valid });
  } catch {
    return NextResponse.json({ suggested: [] });
  }
}
