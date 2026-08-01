/**
 * POST /api/upload/video-auth — { title } -> a short-lived, single-video
 * signed TUS upload session. The browser uses this to upload the video
 * binary DIRECTLY to Bunny Stream (bypassing this server / Vercel's 4.5MB
 * function body limit). The raw Bunny API key never leaves the server.
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { bunnyConfigured, createStreamVideo, signStreamUpload } from "@/lib/bunny";

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "not an admin" }, { status: 403 });

  if (!bunnyConfigured().stream) {
    return NextResponse.json(
      { error: "Bunny is not configured on the server yet — use the paste-URL option instead." },
      { status: 501 },
    );
  }

  const { title } = (await request.json()) as { title?: string };

  try {
    const { guid, cdnHost } = await createStreamVideo(title ?? "untitled");
    const { libraryId, signature, expire } = signStreamUpload(guid);
    return NextResponse.json({ libraryId, guid, signature, expire, cdnHost });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "video-auth failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
