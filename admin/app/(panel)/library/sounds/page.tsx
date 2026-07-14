/** Library → Sounds: one library feeds meditation, sleep, and jap. */
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { NewEntityButton } from "@/components/NewEntityButton";

export default async function SoundsPage() {
  const supabase = await supabaseServer();
  const { data: sounds, error } = await supabase
    .from("sounds")
    .select("id, name_en, name_hi, kind, status, audio_media_id, deity:deities(name_en)")
    .order("name_en");

  if (error) return <p style={{ color: "var(--danger)" }}>{error.message}</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Sounds</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Chants, ambient, sleep, jap loops — used across meditation, sleep and jap.
          </p>
        </div>
        <NewEntityButton
          table="sounds"
          defaults={{ name_en: "New sound", name_hi: "नई ध्वनि", kind: "ambient", status: "draft", audio_media_id: null }}
          editorPath="/library/sounds"
          label="+ New sound"
        />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              <th className="p-3">Name</th>
              <th className="p-3">Kind</th>
              <th className="p-3">Deity</th>
              <th className="p-3">Audio</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(sounds ?? []).map((s) => (
              <tr key={s.id} className="border-t hover:bg-white/5" style={{ borderColor: "var(--line)" }}>
                <td className="p-3">
                  <Link href={`/library/sounds/${s.id}`} className="font-semibold hover:underline">
                    {s.name_en}
                  </Link>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>{s.name_hi}</span>
                </td>
                <td className="p-3 text-xs">{s.kind}</td>
                <td className="p-3 text-xs">{(s.deity as { name_en?: string } | null)?.name_en ?? "—"}</td>
                <td className="p-3 text-xs">
                  {s.audio_media_id ? (
                    <span style={{ color: "var(--ok)" }}>✓</span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>placeholder</span>
                  )}
                </td>
                <td className="p-3 text-xs">
                  <span style={{ color: s.status === "published" ? "var(--ok)" : "var(--muted)" }}>{s.status}</span>
                </td>
              </tr>
            ))}
            {(sounds ?? []).length === 0 ? (
              <tr>
                <td className="p-6 text-center text-sm" colSpan={5} style={{ color: "var(--muted)" }}>
                  No sounds yet — create the first one.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
