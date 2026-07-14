"use client";

/** Exercise field editor — everything except media (MediaSlot handles that). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BODY_AREAS, LEVELS, WORKOUT_MODES } from "@/lib/enums";
import type { BodyArea, Exercise, WorkoutMode } from "@/lib/db";

export function ExerciseForm({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [f, setF] = useState({
    name_en: exercise.name_en,
    name_hi: exercise.name_hi,
    slug: exercise.slug,
    instructions_en: exercise.instructions_en ?? "",
    instructions_hi: exercise.instructions_hi ?? "",
    safety_note_en: exercise.safety_note_en ?? "",
    safety_note_hi: exercise.safety_note_hi ?? "",
    body_areas: exercise.body_areas ?? [],
    modes: exercise.modes ?? [],
    level: exercise.level,
    default_sets: exercise.default_sets,
    default_reps: exercise.default_reps,
    default_duration_seconds: exercise.default_duration_seconds,
    default_rest_seconds: exercise.default_rest_seconds,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle<T extends string>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().from("exercises").update(f).eq("id", exercise.id);
    setBusy(false);
    setMsg(error ? error.message : "Saved ✓");
    if (!error) router.refresh();
  }

  const numField = (key: "default_sets" | "default_reps" | "default_duration_seconds" | "default_rest_seconds", label: string) => (
    <div>
      <label className="lbl">{label}</label>
      <input
        type="number"
        className="field"
        value={f[key] ?? ""}
        onChange={(e) => setF({ ...f, [key]: e.target.value === "" ? null : Number(e.target.value) })}
      />
    </div>
  );

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

      <div>
        <label className="lbl">Slug (unique, url-safe)</label>
        <input className="field" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
      </div>

      <div>
        <label className="lbl">Body areas</label>
        <div className="flex flex-wrap gap-2">
          {BODY_AREAS.map((a) => (
            <button
              key={a}
              type="button"
              className="btn text-xs"
              style={{
                border: "1px solid",
                borderColor: f.body_areas.includes(a) ? "var(--saffron)" : "var(--line)",
                color: f.body_areas.includes(a) ? "var(--saffron)" : "var(--muted)",
                background: f.body_areas.includes(a) ? "rgba(240,118,30,.12)" : "transparent",
              }}
              onClick={() => setF({ ...f, body_areas: toggle<BodyArea>(f.body_areas, a) })}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="lbl">Modes</label>
          <div className="flex gap-2">
            {WORKOUT_MODES.map((m) => (
              <button
                key={m}
                type="button"
                className="btn text-xs"
                style={{
                  border: "1px solid",
                  borderColor: f.modes.includes(m) ? "var(--saffron)" : "var(--line)",
                  color: f.modes.includes(m) ? "var(--saffron)" : "var(--muted)",
                  background: f.modes.includes(m) ? "rgba(240,118,30,.12)" : "transparent",
                }}
                onClick={() => setF({ ...f, modes: toggle<WorkoutMode>(f.modes, m) })}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="lbl">Level</label>
          <select className="field" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as Exercise["level"] })}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {numField("default_sets", "Sets")}
        {numField("default_reps", "Reps")}
        {numField("default_duration_seconds", "Hold (sec)")}
        {numField("default_rest_seconds", "Rest (sec)")}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="lbl">Instructions (English)</label>
          <textarea className="field" rows={3} value={f.instructions_en} onChange={(e) => setF({ ...f, instructions_en: e.target.value })} />
        </div>
        <div>
          <label className="lbl">Instructions (Hindi)</label>
          <textarea className="field" rows={3} value={f.instructions_hi} onChange={(e) => setF({ ...f, instructions_hi: e.target.value })} />
        </div>
        <div>
          <label className="lbl">Safety note (English)</label>
          <textarea className="field" rows={2} value={f.safety_note_en} onChange={(e) => setF({ ...f, safety_note_en: e.target.value })} />
        </div>
        <div>
          <label className="lbl">Safety note (Hindi)</label>
          <textarea className="field" rows={2} value={f.safety_note_hi} onChange={(e) => setF({ ...f, safety_note_hi: e.target.value })} />
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
