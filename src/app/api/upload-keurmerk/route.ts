import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createServiceClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Geen bestand geselecteerd" },
        { status: 400 }
      );
    }

    const ALLOWED_TYPES: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ error: "Alleen JPG, PNG, WebP of SVG toegestaan" }, { status: 415 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Bestand mag maximaal 2MB zijn" }, { status: 413 });
    }

    const admin = getServiceClient();

    // Ensure logos bucket exists (shared with company logos)
    const { data: bucket } = await admin.storage.getBucket("logos");
    if (!bucket) {
      await admin.storage.createBucket("logos", { public: true });
    }

    // Store under user's keurmerken subfolder with a unique filename
    const fileExt = ALLOWED_TYPES[file.type];
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const filePath = `${user.id}/keurmerken/${uniqueId}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await admin.storage
      .from("logos")
      .upload(filePath, buffer, {
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json(
        { error: `Upload mislukt: ${error.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("logos").getPublicUrl(filePath);
    const logoUrl = `${publicUrl}?t=${Date.now()}`;

    return NextResponse.json({ logoUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
