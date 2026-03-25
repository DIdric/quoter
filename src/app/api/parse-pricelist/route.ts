import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseDicoXml } from "@/lib/parse-dico-xml";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen bestand" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();

    if (!filename.endsWith(".xml")) {
      return NextResponse.json(
        { error: "Alleen .xml bestanden worden ondersteund via deze route" },
        { status: 400 }
      );
    }

    const text = await file.text();

    // Basic sanity check — must look like XML
    if (!text.trim().startsWith("<")) {
      return NextResponse.json(
        { error: "Bestand lijkt geen geldig XML te zijn" },
        { status: 400 }
      );
    }

    const result = parseDicoXml(text);

    if (result.products.length === 0) {
      return NextResponse.json(
        {
          error:
            "Geen artikelen gevonden in het XML-bestand. Controleer of het een DICO-exportbestand is (SALES_V005).",
          debug: { total_found: result.total_found, skipped: result.skipped },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      products: result.products,
      supplier_name: result.supplier_name,
      supplier_gln: result.supplier_gln,
      total_found: result.total_found,
      imported: result.products.length,
      skipped: result.skipped,
    });
  } catch (error: unknown) {
    console.error("Parse pricelist error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
