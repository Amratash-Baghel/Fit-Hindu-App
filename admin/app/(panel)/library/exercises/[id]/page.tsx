/** Library → Exercise editor: fields + the two media placeholders. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ExerciseForm } from "@/components/ExerciseForm";
import { MediaSlot } from "@/components/MediaSlot";
import { StatusToggle } from "@/components/StatusToggle";

export default async function ExerciseEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: ex } = await supabase
    .from("exercises")
    .select(
      `*,
       video:media!exercises_video_media_id_fkey ( playback_url ),
       thumb:media!exercises_thumb_media_id_fkey ( playback_url )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!ex) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/library/exercises" className="text-xs hover:underline" style={{ color: "var(--muted)" }}>
            ← Exercises
          </Link>
          <h1 className="text-xl font-bold">{ex.name_en}</h1>
        </div>
        <StatusToggle table="exercises" id={ex.id} status={ex.status} />
      </div>

      <MediaSlot
        label="Avatar demo video"
        kind="video"
        targetTable="exercises"
        targetColumn="video_media_id"
        targetId={ex.id}
        currentUrl={ex.video?.playback_url ?? null}
        title={ex.name_en}
      />
      <MediaSlot
        label="Thumbnail"
        kind="image"
        targetTable="exercises"
        targetColumn="thumb_media_id"
        targetId={ex.id}
        currentUrl={ex.thumb?.playback_url ?? null}
        title={`${ex.name_en} thumb`}
      />

      <ExerciseForm exercise={ex} />
    </div>
  );
}
