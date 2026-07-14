/** Compose → Workout editor: meta + the ordered exercise list. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { WorkoutComposer } from "@/components/WorkoutComposer";
import { StatusToggle } from "@/components/StatusToggle";

export default async function WorkoutEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: template }, { data: items }, { data: library }] = await Promise.all([
    supabase.from("workout_templates").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("workout_template_exercises")
      .select("*, exercise:exercises(id, name_en, name_hi, level, default_sets, default_reps, default_duration_seconds, default_rest_seconds)")
      .eq("template_id", id)
      .order("position"),
    supabase.from("exercises").select("id, name_en, name_hi, level, body_areas, modes").order("name_en"),
  ]);

  if (!template) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/compose/workouts" className="text-xs hover:underline" style={{ color: "var(--muted)" }}>
            ← Workouts
          </Link>
          <h1 className="text-xl font-bold">{template.name_en}</h1>
        </div>
        <StatusToggle table="workout_templates" id={template.id} status={template.status} />
      </div>

      <WorkoutComposer template={template} items={items ?? []} library={library ?? []} />
    </div>
  );
}
