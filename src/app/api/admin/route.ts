import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const service = getServiceClient();

  if (action === "dashboard") {
    // Get all stats using service role (bypasses RLS)
    const { count: totalUsers } = await service
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: totalQuotes } = await service
      .from("quotes")
      .select("*", { count: "exact", head: true });

    const { count: totalMaterials } = await service
      .from("default_materials")
      .select("*", { count: "exact", head: true });

    // Token usage stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: usageData } = await service
      .from("token_usage")
      .select("input_tokens, output_tokens, cost_estimate, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const totalTokens = (usageData ?? []).reduce(
      (sum, r) => sum + r.input_tokens + r.output_tokens,
      0
    );
    const totalCost = (usageData ?? []).reduce(
      (sum, r) => sum + Number(r.cost_estimate),
      0
    );
    const totalRequests = usageData?.length ?? 0;

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      totalQuotes: totalQuotes ?? 0,
      totalDefaultMaterials: totalMaterials ?? 0,
      last30Days: {
        totalTokens,
        totalCost: Math.round(totalCost * 100) / 100,
        totalRequests,
      },
    });
  }

  if (action === "users") {
    // Get all users with their stats
    const { data: profiles } = await service
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Get quote counts per user
    const { data: quoteCounts } = await service
      .from("quotes")
      .select("user_id");

    // Get token usage per user
    const { data: tokenData } = await service
      .from("token_usage")
      .select("user_id, total_tokens, cost_estimate");

    const quoteCountMap = new Map<string, number>();
    (quoteCounts ?? []).forEach((q) => {
      quoteCountMap.set(q.user_id, (quoteCountMap.get(q.user_id) ?? 0) + 1);
    });

    const tokenMap = new Map<string, { tokens: number; cost: number }>();
    (tokenData ?? []).forEach((t) => {
      const existing = tokenMap.get(t.user_id) ?? { tokens: 0, cost: 0 };
      tokenMap.set(t.user_id, {
        tokens: existing.tokens + t.total_tokens,
        cost: existing.cost + Number(t.cost_estimate),
      });
    });

    const users = (profiles ?? []).map((p) => ({
      ...p,
      quote_count: quoteCountMap.get(p.id) ?? 0,
      total_tokens: tokenMap.get(p.id)?.tokens ?? 0,
      total_cost: Math.round((tokenMap.get(p.id)?.cost ?? 0) * 100) / 100,
    }));

    return NextResponse.json({ users });
  }

  if (action === "usage") {
    const days = parseInt(searchParams.get("days") ?? "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await service
      .from("token_usage")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    // Aggregate by day
    const byDay = new Map<string, { tokens: number; cost: number; requests: number }>();
    (data ?? []).forEach((row) => {
      const day = row.created_at.substring(0, 10);
      const existing = byDay.get(day) ?? { tokens: 0, cost: 0, requests: 0 };
      byDay.set(day, {
        tokens: existing.tokens + row.total_tokens,
        cost: existing.cost + Number(row.cost_estimate),
        requests: existing.requests + 1,
      });
    });

    // Aggregate by user
    const byUser = new Map<string, { tokens: number; cost: number; requests: number }>();
    (data ?? []).forEach((row) => {
      const existing = byUser.get(row.user_id) ?? { tokens: 0, cost: 0, requests: 0 };
      byUser.set(row.user_id, {
        tokens: existing.tokens + row.total_tokens,
        cost: existing.cost + Number(row.cost_estimate),
        requests: existing.requests + 1,
      });
    });

    // Get user names
    const userIds = [...byUser.keys()];
    const { data: profiles } = await service
      .from("profiles")
      .select("id, business_name")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.business_name ?? "Onbekend"])
    );

    return NextResponse.json({
      raw: data ?? [],
      byDay: Object.fromEntries(byDay),
      byUser: Object.fromEntries(
        [...byUser.entries()].map(([userId, stats]) => [
          userId,
          { ...stats, name: profileMap.get(userId) ?? "Onbekend" },
        ])
      ),
    });
  }

  if (action === "default-materials") {
    const { data } = await service
      .from("default_materials")
      .select("*")
      .order("category")
      .order("name");

    return NextResponse.json({ materials: data ?? [] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const service = getServiceClient();

  if (body.action === "upsert-material") {
    const { id, name, category, unit, cost_price, source, source_url, article_number } =
      body;

    if (id) {
      const { error } = await service
        .from("default_materials")
        .update({
          name,
          category,
          unit,
          cost_price,
          source,
          source_url,
          article_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await service.from("default_materials").insert({
        name,
        category,
        unit,
        cost_price,
        source,
        source_url,
        article_number,
      });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === "delete-material") {
    const { error } = await service
      .from("default_materials")
      .delete()
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "import-materials-csv") {
    const lines = (body.csv as string).split("\n").filter((l: string) => l.trim());
    const dataLines = lines.slice(1); // Skip header
    const delimiter = dataLines[0]?.includes(";") ? ";" : ",";

    const materials = dataLines
      .map((line: string) => {
        const parts = line.split(delimiter).map((s: string) => s.trim());
        if (parts.length < 4) return null;
        const [name, category, unit, ...priceParts] = parts;
        const priceStr = priceParts.join("").replace(",", ".");
        const price = parseFloat(priceStr);
        if (!name || isNaN(price)) return null;
        return {
          name,
          category: category || "Overig",
          unit: unit || "stuk",
          cost_price: price,
          source: body.source || "Hornbach",
          source_url: null,
          article_number: null,
        };
      })
      .filter(Boolean);

    if (materials.length > 0) {
      const { error } = await service.from("default_materials").insert(materials);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: materials.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
