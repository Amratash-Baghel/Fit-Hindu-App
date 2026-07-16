/** Library → Meal editor: fields + the items sub-editor (no media slot). */
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MealForm } from "@/components/MealForm";
import { StatusToggle } from "@/components/StatusToggle";

export default async function MealEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: meal } = await supabase.from("meals").select("*").eq("id", id).maybeSingle();

  if (!meal) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/library/meals" className="text-xs hover:underline" style={{ color: "var(--muted)" }}>
            ← Meals
          </Link>
          <h1 className="text-xl font-bold">{meal.name_en}</h1>
        </div>
        <StatusToggle table="meals" id={meal.id} status={meal.status} />
      </div>

      <MealForm meal={meal} />
    </div>
  );
}
