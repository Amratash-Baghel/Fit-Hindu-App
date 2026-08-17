/** Compose → Workouts: ordered compositions of library exercises. */
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { NewEntityButton } from "@/components/NewEntityButton";

interface Row {
  id: string;
  name_en: string;
  name_hi: string;
  mode: string;
  level: string;
  status: string;
  sort?: number;
  items: { position: number }[] | null;
}

export default async function WorkoutsPage() {
  const supabase = await supabaseServer();

  // Sort order (migration 0021) mirrors the app's: lowest sort first, ties
  // alphabetical. If 0021 hasn't been run yet the column is missing (42703),
  // so the list falls back to plain name_en rather than showing an error page.
  const sorted = await supabase
    .from("workout_templates")
    .select("id, name_en, name_hi, mode, level, est_minutes, status, sort, items:workout_template_exercises(position)")
    .order("sort")
    .order("name_en");

  const hasSort = !sorted.error;
  const plain = sorted.error?.code === "42703"
    ? await supabase
        .from("workout_templates")
        .select("id, name_en, name_hi, mode, level, est_minutes, status, items:workout_template_exercises(position)")
        .order("name_en")
    : null;

  const error = plain ? plain.error : sorted.error;
  const templates = ((plain ?? sorted).data ?? []) as unknown as Row[];

  if (error) return <p style={{ color: "var(--danger)" }}>{error.message}</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Workouts</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Compositions — they reference library exercises, never copy them.
            Ordered by sort; the lowest published one of a mode is the app&apos;s “Today&apos;s workout”.
          </p>
        </div>
        <NewEntityButton
          table="workout_templates"
          defaults={{ name_en: "New workout", name_hi: "नया वर्कआउट", mode: "home", level: "beginner", status: "draft" }}
          editorPath="/compose/workouts"
          label="+ New workout"
        />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              <th className="p-3">Sort</th>
              <th className="p-3">Name</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Level</th>
              <th className="p-3">Exercises</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(templates ?? []).map((t) => (
              <tr key={t.id} className="border-t hover:bg-white/5" style={{ borderColor: "var(--line)" }}>
                <td className="p-3 text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                  {hasSort ? (t.sort ?? "—") : "—"}
                </td>
                <td className="p-3">
                  <Link href={`/compose/workouts/${t.id}`} className="font-semibold hover:underline">
                    {t.name_en}
                  </Link>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>{t.name_hi}</span>
                </td>
                <td className="p-3 text-xs">{t.mode}</td>
                <td className="p-3 text-xs">{t.level}</td>
                <td className="p-3 text-xs">{(t.items ?? []).length}</td>
                <td className="p-3 text-xs">
                  <span style={{ color: t.status === "published" ? "var(--ok)" : "var(--muted)" }}>{t.status}</span>
                </td>
              </tr>
            ))}
            {(templates ?? []).length === 0 ? (
              <tr>
                <td className="p-6 text-center text-sm" colSpan={6} style={{ color: "var(--muted)" }}>
                  No workouts yet — create the first one.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
