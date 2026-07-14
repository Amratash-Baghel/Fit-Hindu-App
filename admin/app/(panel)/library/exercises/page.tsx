/** Library → Exercises: the fitness lead's primary workspace. */
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { NewEntityButton } from "@/components/NewEntityButton";

export default async function ExercisesPage() {
  const supabase = await supabaseServer();
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name_en, name_hi, body_areas, modes, level, status, video_media_id")
    .order("name_en");

  if (error) return <p style={{ color: "var(--danger)" }}>{error.message}</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Exercises</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Library objects — reused by every workout that references them.
          </p>
        </div>
        <NewEntityButton
          table="exercises"
          defaults={{
            slug: `exercise-${Date.now()}`,
            name_en: "New exercise",
            name_hi: "नया व्यायाम",
            body_areas: [],
            modes: ["home"],
            level: "beginner",
            status: "draft",
          }}
          editorPath="/library/exercises"
          label="+ New exercise"
        />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              <th className="p-3">Name</th>
              <th className="p-3">Areas</th>
              <th className="p-3">Modes</th>
              <th className="p-3">Level</th>
              <th className="p-3">Video</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(exercises ?? []).map((ex) => (
              <tr key={ex.id} className="border-t hover:bg-white/5" style={{ borderColor: "var(--line)" }}>
                <td className="p-3">
                  <Link href={`/library/exercises/${ex.id}`} className="font-semibold hover:underline">
                    {ex.name_en}
                  </Link>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>{ex.name_hi}</span>
                </td>
                <td className="p-3 text-xs">{(ex.body_areas ?? []).join(", ") || "—"}</td>
                <td className="p-3 text-xs">{(ex.modes ?? []).join(", ")}</td>
                <td className="p-3 text-xs">{ex.level}</td>
                <td className="p-3 text-xs">
                  {ex.video_media_id ? (
                    <span style={{ color: "var(--ok)" }}>✓</span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>placeholder</span>
                  )}
                </td>
                <td className="p-3 text-xs">
                  <span style={{ color: ex.status === "published" ? "var(--ok)" : "var(--muted)" }}>{ex.status}</span>
                </td>
              </tr>
            ))}
            {(exercises ?? []).length === 0 ? (
              <tr>
                <td className="p-6 text-center text-sm" colSpan={6} style={{ color: "var(--muted)" }}>
                  No exercises yet — create the first one.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
