/**
 * POST /api/upload — multipart: file + kind (video|audio|image) + title.
 * Optional target (table, id, column) to set the object's media FK in the
 * same action ("upload into the placeholder").
 *
 * Auth: the caller must be a signed-in ADMIN (rpc is_admin over the session
 * cookie). Bunny keys are read here, server-side only. The media row is
 * inserted with the admin's own session — RLS enforced end to end.
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { bunnyConfigured, uploadVideoToStream, uploadFileToStorage } from "@/lib/bunny";

// Only columns the panel actually manages can be set — never trust a raw
// table/column string from the client beyond this list.
const ALLOWED_TARGETS: Record<string, string[]> = {
  exercises: ["video_media_id", "thumb_media_id"],
  sounds: ["audio_media_id"],
  deities: ["icon_media_id"],
  mantras: ["chant_audio_media_id"],
};

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "not an admin" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const kind = String(form.get("kind") ?? "");
  const title = String(form.get("title") ?? "untitled");
  if (!file || !["video", "audio", "image"].includes(kind)) {
    return NextResponse.json({ error: "file and kind (video|audio|image) required" }, { status: 400 });
  }

  const configured = bunnyConfigured();
  const needsStream = kind === "video";
  if ((needsStream && !configured.stream) || (!needsStream && !configured.storage)) {
    return NextResponse.json(
      { error: "Bunny is not configured on the server yet — use the paste-URL option instead." },
      { status: 501 },
    );
  }

  try {
    const buf = await file.arrayBuffer();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploaded = needsStream
      ? await uploadVideoToStream(buf, title)
      : await uploadFileToStorage(buf, `${kind}s/${Date.now()}-${safeName}`);

    const { data: media, error: mediaErr } = await supabase
      .from("media")
      .insert({
        kind,
        provider: "bunny",
        external_id: uploaded.externalId,
        playback_url: uploaded.playbackUrl,
        duration_seconds: null,
      })
      .select()
      .single();
    if (mediaErr) throw mediaErr;

    // optional: set the FK on the target row in the same action
    const table = String(form.get("targetTable") ?? "");
    const column = String(form.get("targetColumn") ?? "");
    const id = String(form.get("targetId") ?? "");
    if (table && column && id) {
      if (!ALLOWED_TARGETS[table]?.includes(column)) {
        return NextResponse.json({ error: `target ${table}.${column} not allowed` }, { status: 400 });
      }
      const { error: fkErr } = await supabase.from(table).update({ [column]: media.id }).eq("id", id);
      if (fkErr) throw fkErr;
    }

    return NextResponse.json({ media });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
