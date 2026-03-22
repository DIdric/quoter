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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const source = (formData.get("source") as string) || "Onbekend";

  if (!file) {
    return NextResponse.json({ error: "Geen bestand" }, { status: 400 });
  }

  const csv = await file.text();
  const lines = csv.split("\n").filter((l) => l.trim());
  const dataLines = lines.slice(1); // Skip header
  const delimiter = dataLines[0]?.includes(";") ? ";" : ",";

  const materials = dataLines
    .map((line) => {
      const parts = line.split(delimiter).map((s) => s.trim());
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
        source,
        source_url: null,
        article_number: null,
      };
    })
    .filter(Boolean);

  if (materials.length === 0) {
    return NextResponse.json(
      { error: "Geen geldige regels gevonden. Verwacht formaat: naam;categorie;eenheid;prijs" },
      { status: 422 }
    );
  }

  const service = getServiceClient();
  const { error } = await service.from("default_materials").insert(materials);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, count: materials.length });
}
