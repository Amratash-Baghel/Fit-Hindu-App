/** Library → Sound editor: fields + the audio placeholder. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SoundForm } from "@/components/SoundForm";
import { MediaSlot } from "@/components/MediaSlot";
import { StatusToggle } from "@/components/StatusToggle";

export default async function SoundEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const [{ data: sound }, { data: deities }] = await Promise.all([
    supabase
      .from("sounds")
      .select(`*, audio:media!sounds_audio_media_id_fkey ( playback_url )`)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("deities").select("id, name_en").order("sort"),
  ]);

  if (!sound) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/library/sounds" className="text-xs hover:underline" style={{ color: "var(--muted)" }}>
            ← Sounds
          </Link>
          <h1 className="text-xl font-bold">{sound.name_en}</h1>
        </div>
        <StatusToggle table="sounds" id={sound.id} status={sound.status} />
      </div>

      <MediaSlot
        label="Audio file"
        kind="audio"
        targetTable="sounds"
        targetColumn="audio_media_id"
        targetId={sound.id}
        currentUrl={sound.audio?.playback_url ?? null}
        title={sound.name_en}
      />

      <SoundForm sound={sound} deities={deities ?? []} />
    </div>
  );
}
