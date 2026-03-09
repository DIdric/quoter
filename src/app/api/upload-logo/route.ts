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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureBucketExists(admin: ReturnType<typeof getServiceClient>) {
  const { data } = await admin.storage.getBucket("logos");
  if (!data) {
    await admin.storage.createBucket("logos", { public: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Geen bestand geselecteerd" }, { status: 400 });
    }

    const admin = getServiceClient();

    // Auto-create bucket if it doesn't exist
    await ensureBucketExists(admin);

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${user.id}/logo.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await admin.storage
      .from("logos")
      .upload(filePath, buffer, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("Logo upload error:", error);
      return NextResponse.json({ error: `Upload mislukt: ${error.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from("logos").getPublicUrl(filePath);
    const logoUrl = `${publicUrl}?t=${Date.now()}`;

    // Update profile
    await admin
      .from("profiles")
      .update({ logo_url: logoUrl })
      .eq("id", user.id);

    return NextResponse.json({ logoUrl });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const admin = getServiceClient();

    // List and delete all logos for user
    const { data: files } = await admin.storage.from("logos").list(user.id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await admin.storage.from("logos").remove(paths);
    }

    await admin
      .from("profiles")
      .update({ logo_url: null })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
