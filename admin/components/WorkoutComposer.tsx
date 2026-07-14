"use client";

/**
 * Workout composer: meta fields + the ordered exercise list (add from
 * library, ↑/↓ reorder, remove, per-slot overrides). One Save persists
 * everything — the item list is rewritten with clean positions 1..n
 * (simple + predictable for an internal tool; drag-drop is later polish).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LEVELS, WORKOUT_MODES } from "@/lib/enums";
import type { Level, WorkoutMode, WorkoutTemplate } from "@/lib/db";

interface LibraryExercise {
  id: string;
  name_en: string;
  name_hi: string;
  level: Level;
  body_areas?: string[];
  modes?: string[];
}

interface Item {
  exercise_id: string;
  name_en: string;
  name_hi: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
}

interface DbItem {
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  exercise: { id: string; name_en: string; name_hi: string } | null;
}

export function WorkoutComposer({
  template,
  items: dbItems,
  library,
}: {
  template: WorkoutTemplate;
  items: DbItem[];
  library: LibraryExercise[];
}) {
  const router = useRouter();
  const [meta, setMeta] = useState({
    name_en: template.name_en,
    name_hi: template.name_hi,
    mode: template.mode,
    level: template.level,
    est_minutes: template.est_minutes,
  });
  const [items, setItems] = useState<Item[]>(
    dbItems.map((i) => ({
      exercise_id: i.exercise_id,
      name_en: i.exercise?.name_en ?? "?",
      name_hi: i.exercise?.name_hi ?? "",
      sets: i.sets,
      reps: i.reps,
      duration_seconds: i.duration_seconds,
      rest_seconds: i.rest_seconds,
    })),
  );
  const [addId, setAddId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
  }

  function addExercise() {
    const ex = library.find((l) => l.id === addId);
    if (!ex) return;
    setItems([
      ...items,
      { exercise_id: ex.id, name_en: ex.name_en, name_hi: ex.name_hi, sets: null, reps: null, duration_seconds: null, rest_seconds: null },
    ]);
    setAddId("");
  }

  async function saveAll() {
    setBusy(true);
    setMsg(null);
    const supabase = supabaseBrowser();

    const { error: metaErr } = await supabase.from("workout_templates").update(meta).eq("id", template.id);
    if (metaErr) {
      setBusy(false);
      setMsg(metaErr.message);
      return;
    }

    // rewrite items with clean positions 1..n
    const { error: delErr } = await supabase.from("workout_template_exercises").delete().eq("template_id", template.id);
    if (delErr) {
      setBusy(false);
      setMsg(delErr.message);
      return;
    }
    if (items.length > 0) {
      const rows = items.map((it, i) => ({
        template_id: template.id,
        position: i + 1,
        exercise_id: it.exercise_id,
        sets: it.sets,
        reps: it.reps,
        duration_seconds: it.duration_seconds,
        rest_seconds: it.rest_seconds,
      }));
      const { error: insErr } = await supabase.from("workout_template_exercises").insert(rows);
      if (insErr) {
        setBusy(false);
        setMsg(insErr.message);
        return;
      }
    }

    setBusy(false);
    setMsg("Saved ✓");
    router.refresh();
  }

  const num = (v: number | null) => (v === null ? "" : v);

  return (
    <div className="space-y-6">
      {/* meta */}
      <div className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="lbl">Name (English)</label>
            <input className="field" value={meta.name_en} onChange={(e) => setMeta({ ...meta, name_en: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Name (Hindi)</label>
            <input className="field" value={meta.name_hi} onChange={(e) => setMeta({ ...meta, name_hi: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="lbl">Mode</label>
            <select className="field" value={meta.mode} onChange={(e) => setMeta({ ...meta, mode: e.target.value as WorkoutMode })}>
              {WORKOUT_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="lbl">Level</label>
            <select className="field" value={meta.level} onChange={(e) => setMeta({ ...meta, level: e.target.value as Level })}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="lbl">Est. minutes</label>
            <input
              type="number"
              className="field"
              value={num(meta.est_minutes)}
              onChange={(e) => setMeta({ ...meta, est_minutes: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* ordered items */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
            Exercises, in order
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            blank override = use the exercise&apos;s defaults
          </span>
        </div>

        {items.length === 0 ? (
          <p className="py-4 text-center text-sm" style={{ color: "var(--muted)" }}>
            Empty — add exercises from the library below.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li
                key={`${it.exercise_id}-${idx}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-2"
                style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
              >
                <span className="w-6 text-center text-xs" style={{ color: "var(--muted)" }}>{idx + 1}</span>
                <div className="min-w-32 flex-1">
                  <div className="text-sm font-semibold">{it.name_en}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{it.name_hi}</div>
                </div>
                {(
                  [
                    ["sets", "sets"],
                    ["reps", "reps"],
                    ["duration_seconds", "hold s"],
                    ["rest_seconds", "rest s"],
                  ] as const
                ).map(([key, ph]) => (
                  <input
                    key={key}
                    type="number"
                    placeholder={ph}
                    className="field w-20"
                    value={num(it[key])}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, [key]: e.target.value === "" ? null : Number(e.target.value) };
                      setItems(next);
                    }}
                  />
                ))}
                <div className="flex gap-1">
                  <button type="button" className="btn btn-ghost px-2 py-1" onClick={() => move(idx, -1)} title="Move up">↑</button>
                  <button type="button" className="btn btn-ghost px-2 py-1" onClick={() => move(idx, 1)} title="Move down">↓</button>
                  <button
                    type="button"
                    className="btn btn-ghost px-2 py-1"
                    style={{ color: "var(--danger)" }}
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2">
          <select className="field max-w-xs" value={addId} onChange={(e) => setAddId(e.target.value)}>
            <option value="">+ Add exercise from library…</option>
            {library.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name_en} ({l.level})
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost" disabled={!addId} onClick={addExercise}>
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-gold" disabled={busy} onClick={saveAll}>
          {busy ? "Saving…" : "Save workout"}
        </button>
        {msg ? (
          <span className="text-sm" style={{ color: msg.endsWith("✓") ? "var(--ok)" : "var(--danger)" }}>{msg}</span>
        ) : null}
      </div>
    </div>
  );
}
