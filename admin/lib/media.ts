/**
 * Shared "write a media row + link it to the target row's FK in one action"
 * logic, used by both the proxied upload route (audio/image) and the
 * finalize route (video, after a direct-to-Bunny TUS upload completes).
 */
import { supabaseServer } from "@/lib/supabase/server";
import type { Media, MediaKind } from "@/lib/db";

// Only columns the panel actually manages can be set — never trust a raw
// table/column string from the client beyond this list.
const ALLOWED_TARGETS: Record<string, string[]> = {
  exercises: ["video_media_id", "thumb_media_id"],
  sounds: ["audio_media_id"],
  deities: ["icon_media_id"],
  mantras: ["chant_audio_media_id"],
};

export function isAllowedTarget(table: string, column: string): boolean {
  return !!ALLOWED_TARGETS[table]?.includes(column);
}

export async function insertMediaAndLinkTarget(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  params: {
    kind: MediaKind;
    externalId: string;
    playbackUrl: string;
    targetTable?: string;
    targetColumn?: string;
    targetId?: string;
  },
): Promise<Media> {
  const { kind, externalId, playbackUrl, targetTable, targetColumn, targetId } = params;

  const { data: media, error: mediaErr } = await supabase
    .from("media")
    .insert({
      kind,
      provider: "bunny",
      external_id: externalId,
      playback_url: playbackUrl,
      duration_seconds: null,
    })
    .select()
    .single();
  if (mediaErr) throw mediaErr;

  if (targetTable && targetColumn && targetId) {
    if (!isAllowedTarget(targetTable, targetColumn)) {
      throw new Error(`target ${targetTable}.${targetColumn} not allowed`);
    }
    const { error: fkErr } = await supabase.from(targetTable).update({ [targetColumn]: media.id }).eq("id", targetId);
    if (fkErr) throw fkErr;
  }

  return media as Media;
}
