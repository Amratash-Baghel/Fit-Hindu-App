"use client";

/** Sound field editor — audio itself is handled by MediaSlot above it. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SOUND_KINDS } from "@/lib/enums";
import type { Sound } from "@/lib/db";

export function SoundForm({
  sound,
  deities,
}: {
  sound: Sound;
  deities: { id: string; name_en: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState({
    name_en: sound.name_en,
    name_hi: sound.name_hi,
    kind: sound.kind,
    deity_id: sound.deity_id,
    duration_seconds: sound.duration_seconds,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().from("sounds").update(f).eq("id", sound.id);
    setBusy(false);
    setMsg(error ? error.message : "Saved ✓");
    if (!error) router.refresh();
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="lbl">Kind</label>
          <select className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Sound["kind"] })}>
            {SOUND_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl">Deity (optional)</label>
          <select
            className="field"
            value={f.deity_id ?? ""}
            onChange={(e) => setF({ ...f, deity_id: e.target.value || null })}
          >
            <option value="">— none —</option>
            {deities.map((d) => (
              <option key={d.id} value={d.id}>{d.name_en}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl">Duration (sec)</label>
          <input
            type="number"
            className="field"
            value={f.duration_seconds ?? ""}
            onChange={(e) => setF({ ...f, duration_seconds: e.target.value === "" ? null : Number(e.target.value) })}
          />
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
