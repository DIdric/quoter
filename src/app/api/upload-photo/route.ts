// Supabase bucket 'offerte-uploads' must be created manually with:
// - Public: false
// - RLS policy: users can only read/write their own files (user_id folder)

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Geen bestand geselecteerd" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen JPEG, PNG of HEIC bestanden zijn toegestaan" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Bestand is te groot. Maximaal 10MB toegestaan" },
        { status: 400 }
      );
    }

    // Use service role client to bypass storage RLS during upload
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const filename = file.name;
    const storagePath = `${user.id}/temp/${Date.now()}-${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("offerte-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[upload-photo] Upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload mislukt: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Generate a signed URL (60 minutes expiry) so the AI can read it
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("offerte-uploads")
      .createSignedUrl(storagePath, 60 * 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[upload-photo] Signed URL error:", signedUrlError);
      return NextResponse.json(
        { error: "Kon geen toegangslink genereren" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrlData.signedUrl, path: storagePath });
  } catch (err) {
    console.error("[upload-photo] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
