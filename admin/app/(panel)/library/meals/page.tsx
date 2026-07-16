/** Library → Meals: the diet atom (a named dish/plate feeding diet templates). */
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { NewEntityButton } from "@/components/NewEntityButton";

export default async function MealsPage() {
  const supabase = await supabaseServer();
  const { data: meals, error } = await supabase
    .from("meals")
    .select("id, name_en, name_hi, meal_time, kcal, diet_types, status")
    .order("name_en");

  if (error) return <p style={{ color: "var(--danger)" }}>{error.message}</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Meals</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Dishes/plates with their items — assembled into diet templates.
          </p>
        </div>
        <NewEntityButton
          table="meals"
          defaults={{ name_en: "New meal", name_hi: "नया भोजन", meal_time: "breakfast", items: [], diet_types: [], status: "draft" }}
          editorPath="/library/meals"
          label="+ New meal"
        />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              <th className="p-3">Name</th>
              <th className="p-3">Meal time</th>
              <th className="p-3">Kcal</th>
              <th className="p-3">Diet types</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(meals ?? []).map((m) => (
              <tr key={m.id} className="border-t hover:bg-white/5" style={{ borderColor: "var(--line)" }}>
                <td className="p-3">
                  <Link href={`/library/meals/${m.id}`} className="font-semibold hover:underline">
                    {m.name_en}
                  </Link>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>{m.name_hi}</span>
                </td>
                <td className="p-3 text-xs">{m.meal_time}</td>
                <td className="p-3 text-xs">{m.kcal ?? "—"}</td>
                <td className="p-3 text-xs">{(m.diet_types ?? []).join(", ") || "—"}</td>
                <td className="p-3 text-xs">
                  <span style={{ color: m.status === "published" ? "var(--ok)" : "var(--muted)" }}>{m.status}</span>
                </td>
              </tr>
            ))}
            {(meals ?? []).length === 0 ? (
              <tr>
                <td className="p-6 text-center text-sm" colSpan={5} style={{ color: "var(--muted)" }}>
                  No meals yet — create the first one.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
