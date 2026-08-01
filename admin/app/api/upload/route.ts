/**
 * POST /api/upload — multipart: file + kind (audio|image) + title.
 * Optional target (table, id, column) to set the object's media FK in the
 * same action ("upload into the placeholder").
 *
 * Video does NOT go through this route — it uploads directly to Bunny via
 * TUS (see /api/upload/video-auth + /api/upload/finalize) because Vercel
 * caps this route's request body at 4.5MB, which real demo videos exceed.
 * Audio/image stay here since they're small enough to proxy safely.
 *
 * Auth: the caller must be a signed-in ADMIN (rpc is_admin over the session
 * cookie). Bunny keys are read here, server-side only. The media row is
 * inserted with the admin's own session — RLS enforced end to end.
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { bunnyConfigured, uploadFileToStorage } from "@/lib/bunny";
import { insertMediaAndLinkTarget } from "@/lib/media";

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "not an admin" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const kind = String(form.get("kind") ?? "");
  if (!file || !["audio", "image"].includes(kind)) {
    return NextResponse.json({ error: "file and kind (audio|image) required" }, { status: 400 });
  }

  if (!bunnyConfigured().storage) {
    return NextResponse.json(
      { error: "Bunny is not configured on the server yet — use the paste-URL option instead." },
      { status: 501 },
    );
  }

  try {
    const buf = await file.arrayBuffer();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploaded = await uploadFileToStorage(buf, `${kind}s/${Date.now()}-${safeName}`);

    const media = await insertMediaAndLinkTarget(supabase, {
      kind: kind as "audio" | "image",
      externalId: uploaded.externalId,
      playbackUrl: uploaded.playbackUrl,
      targetTable: String(form.get("targetTable") ?? "") || undefined,
      targetColumn: String(form.get("targetColumn") ?? "") || undefined,
      targetId: String(form.get("targetId") ?? "") || undefined,
    });

    return NextResponse.json({ media });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
