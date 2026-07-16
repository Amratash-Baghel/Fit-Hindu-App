/** Library → Mantra editor: fields + the chant-audio placeholder. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MantraForm } from "@/components/MantraForm";
import { MediaSlot } from "@/components/MediaSlot";
import { StatusToggle } from "@/components/StatusToggle";

export default async function MantraEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const [{ data: mantra }, { data: deities }] = await Promise.all([
    supabase
      .from("mantras")
      .select(`*, chant:media!mantras_chant_audio_media_id_fkey ( playback_url )`)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("deities").select("id, name_en").order("sort"),
  ]);

  if (!mantra) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/library/mantras" className="text-xs hover:underline" style={{ color: "var(--muted)" }}>
            ← Mantras
          </Link>
          <h1 className="text-xl font-bold">{mantra.text_devanagari}</h1>
        </div>
        <StatusToggle table="mantras" id={mantra.id} status={mantra.status} />
      </div>

      <MediaSlot
        label="Chant audio (optional)"
        kind="audio"
        targetTable="mantras"
        targetColumn="chant_audio_media_id"
        targetId={mantra.id}
        currentUrl={mantra.chant?.playback_url ?? null}
        title={mantra.transliteration ?? mantra.text_devanagari}
      />

      <MantraForm mantra={mantra} deities={deities ?? []} />
    </div>
  );
}
