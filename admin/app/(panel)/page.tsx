/** Panel home — content counts + where to go. */
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function PanelHome() {
  const supabase = await supabaseServer();

  const [ex, snd, wt] = await Promise.all([
    supabase.from("exercises").select("id, status", { count: "exact", head: false }),
    supabase.from("sounds").select("id, status", { count: "exact", head: false }),
    supabase.from("workout_templates").select("id, status", { count: "exact", head: false }),
  ]);

  const stats = [
    { label: "Exercises", href: "/library/exercises", rows: ex.data ?? [] },
    { label: "Sounds", href: "/library/sounds", rows: snd.data ?? [] },
    { label: "Workouts", href: "/compose/workouts", rows: wt.data ?? [] },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold">Content</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Library holds the atoms; Compose assembles them. Draft content is
        invisible in the app until published.
      </p>

      <div className="mt-6 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const published = s.rows.filter((r: { status: string }) => r.status === "published").length;
          return (
            <Link key={s.href} href={s.href} className="card p-5 hover:border-[var(--saffron)]">
              <div className="text-3xl font-bold" style={{ color: "var(--gold)" }}>
                {s.rows.length}
              </div>
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {published} published · {s.rows.length - published} draft
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
