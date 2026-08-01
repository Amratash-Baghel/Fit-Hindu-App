/** Library → Mantras: per-deity chant text + optional chant audio. */
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { NewEntityButton } from "@/components/NewEntityButton";

export default async function MantrasPage() {
  const supabase = await supabaseServer();
  const [{ data: mantras, error }, { data: deities }] = await Promise.all([
    supabase
      .from("mantras")
      .select("id, text_devanagari, transliteration, status, chant_audio_media_id, deity:deities(name_en)")
      .order("text_devanagari"),
    supabase.from("deities").select("id, name_en").order("sort"),
  ]);

  if (error) return <p style={{ color: "var(--danger)" }}>{error.message}</p>;

  // mantras.deity_id is NOT NULL — a new draft needs a valid deity to attach to.
  const defaultDeityId = deities?.[0]?.id ?? null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Mantras</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Per-deity chants — text, meaning, and an optional chant audio.
          </p>
        </div>
        {defaultDeityId ? (
          <NewEntityButton
            table="mantras"
            defaults={{
              deity_id: defaultDeityId,
              text_devanagari: "नया मंत्र",
              status: "draft",
              chant_audio_media_id: null,
            }}
            editorPath="/library/mantras"
            label="+ New mantra"
          />
        ) : (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Add a deity first (mantras attach to a deity).
          </span>
        )}
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              <th className="p-3">Mantra</th>
              <th className="p-3">Deity</th>
              <th className="p-3">Audio</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(mantras ?? []).map((m) => (
              <tr key={m.id} className="border-t hover:bg-white/5" style={{ borderColor: "var(--line)" }}>
                <td className="p-3">
                  <Link href={`/library/mantras/${m.id}`} className="font-semibold hover:underline">
                    {m.text_devanagari}
                  </Link>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>{m.transliteration ?? "—"}</span>
                </td>
                <td className="p-3 text-xs">{(m.deity as { name_en?: string } | null)?.name_en ?? "—"}</td>
                <td className="p-3 text-xs">
                  {m.chant_audio_media_id ? (
                    <span style={{ color: "var(--ok)" }}>✓</span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>placeholder</span>
                  )}
                </td>
                <td className="p-3 text-xs">
                  <span style={{ color: m.status === "published" ? "var(--ok)" : "var(--muted)" }}>{m.status}</span>
                </td>
              </tr>
            ))}
            {(mantras ?? []).length === 0 ? (
              <tr>
                <td className="p-6 text-center text-sm" colSpan={4} style={{ color: "var(--muted)" }}>
                  No mantras yet — create the first one.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
