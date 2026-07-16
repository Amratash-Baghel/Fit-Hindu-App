/**
 * POST /api/upload/finalize — called by the browser after a direct-to-Bunny
 * TUS video upload succeeds. Writes the `media` row and links the target
 * row's FK; does not talk to Bunny (the video already exists there).
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { insertMediaAndLinkTarget } from "@/lib/media";

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "not an admin" }, { status: 403 });

  const body = (await request.json()) as {
    kind?: string;
    externalId?: string;
    playbackUrl?: string;
    targetTable?: string;
    targetColumn?: string;
    targetId?: string;
  };
  if (body.kind !== "video" || !body.externalId || !body.playbackUrl) {
    return NextResponse.json({ error: "kind ('video'), externalId and playbackUrl required" }, { status: 400 });
  }

  try {
    const media = await insertMediaAndLinkTarget(supabase, {
      kind: "video",
      externalId: body.externalId,
      playbackUrl: body.playbackUrl,
      targetTable: body.targetTable,
      targetColumn: body.targetColumn,
      targetId: body.targetId,
    });
    return NextResponse.json({ media });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "finalize failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
