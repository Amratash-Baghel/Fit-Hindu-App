"use client";

/** Meal field editor — includes the items[] sub-editor (jsonb array of
 *  {text_hi, text_en, veg}) and diet_types[] chip toggles. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MEAL_TIMES, DIET_TYPES } from "@/lib/enums";
import type { Meal, MealItem, DietType } from "@/lib/db";

function toggle<T extends string>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function MealForm({ meal }: { meal: Meal }) {
  const router = useRouter();
  const [f, setF] = useState({
    name_en: meal.name_en,
    name_hi: meal.name_hi,
    meal_time: meal.meal_time,
    kcal: meal.kcal,
    diet_types: meal.diet_types ?? [],
    items: (meal.items ?? []) as MealItem[],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().from("meals").update(f).eq("id", meal.id);
    setBusy(false);
    setMsg(error ? error.message : "Saved ✓");
    if (!error) router.refresh();
  }

  function setItem(i: number, patch: Partial<MealItem>) {
    setF({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  }
  function addItem() {
    setF({ ...f, items: [...f.items, { text_hi: "", text_en: "", veg: true }] });
  }
  function removeItem(i: number) {
    setF({ ...f, items: f.items.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="lbl">Name (English)</label>
          <input className="field" value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} />
        </div>
        <div>
          <label className="lbl">Name (Hindi)</label>
          <input className="field" value={f.name_hi} onChange={(e) => setF({ ...f, name_hi: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="lbl">Meal time</label>
          <select
            className="field"
            value={f.meal_time}
            onChange={(e) => setF({ ...f, meal_time: e.target.value as Meal["meal_time"] })}
          >
            {MEAL_TIMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl">Kcal (optional)</label>
          <input
            type="number"
            className="field"
            value={f.kcal ?? ""}
            onChange={(e) => setF({ ...f, kcal: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="lbl">Diet types</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {DIET_TYPES.map((d) => {
            const on = f.diet_types.includes(d);
            return (
              <button
                key={d}
                type="button"
                className="btn text-xs"
                style={{
                  border: "1px solid",
                  borderColor: on ? "var(--saffron)" : "var(--line)",
                  color: on ? "var(--saffron)" : "var(--muted)",
                  background: on ? "rgba(240,118,30,.12)" : "transparent",
                }}
                onClick={() => setF({ ...f, diet_types: toggle<DietType>(f.diet_types, d) })}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="lbl">Items</label>
          <button type="button" className="btn btn-ghost text-xs" onClick={addItem}>
            + Add item
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {f.items.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--muted)" }}>No items yet — add the dishes on this plate.</p>
          ) : null}
          {f.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="field flex-1"
                placeholder="Item (English)"
                value={it.text_en}
                onChange={(e) => setItem(i, { text_en: e.target.value })}
              />
              <input
                className="field flex-1"
                placeholder="Item (Hindi)"
                value={it.text_hi}
                onChange={(e) => setItem(i, { text_hi: e.target.value })}
              />
              <button
                type="button"
                className="btn text-xs"
                style={{
                  border: "1px solid",
                  borderColor: it.veg ? "var(--ok)" : "var(--line)",
                  color: it.veg ? "var(--ok)" : "var(--muted)",
                }}
                onClick={() => setItem(i, { veg: !it.veg })}
                title="Toggle veg / non-veg"
              >
                {it.veg ? "veg" : "non-veg"}
              </button>
              <button
                type="button"
                className="btn text-xs"
                style={{ border: "1px solid", borderColor: "var(--line)", color: "var(--danger)" }}
                onClick={() => removeItem(i)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-gold" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        {msg ? (
          <span className="text-sm" style={{ color: msg.endsWith("✓") ? "var(--ok)" : "var(--danger)" }}>{msg}</span>
        ) : null}
      </div>
    </div>
  );
}
