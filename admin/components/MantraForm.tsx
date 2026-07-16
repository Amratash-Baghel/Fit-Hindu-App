"use client";

/** Mantra field editor — chant audio itself is handled by MediaSlot above it.
 *  deity_id is required (NOT NULL), so the select has no "none" option. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Mantra } from "@/lib/db";

export function MantraForm({
  mantra,
  deities,
}: {
  mantra: Mantra;
  deities: { id: string; name_en: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState({
    deity_id: mantra.deity_id,
    text_devanagari: mantra.text_devanagari,
    transliteration: mantra.transliteration,
    meaning_hi: mantra.meaning_hi,
    meaning_en: mantra.meaning_en,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().from("mantras").update(f).eq("id", mantra.id);
    setBusy(false);
    setMsg(error ? error.message : "Saved ✓");
    if (!error) router.refresh();
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="lbl">Deity</label>
          <select
            className="field"
            value={f.deity_id}
            onChange={(e) => setF({ ...f, deity_id: e.target.value })}
          >
            {deities.map((d) => (
              <option key={d.id} value={d.id}>{d.name_en}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl">Transliteration</label>
          <input
            className="field"
            value={f.transliteration ?? ""}
            onChange={(e) => setF({ ...f, transliteration: e.target.value || null })}
          />
        </div>
      </div>

      <div>
        <label className="lbl">Mantra (Devanagari)</label>
        <textarea
          className="field"
          rows={2}
          value={f.text_devanagari}
          onChange={(e) => setF({ ...f, text_devanagari: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="lbl">Meaning (Hindi)</label>
          <textarea
            className="field"
            rows={3}
            value={f.meaning_hi ?? ""}
            onChange={(e) => setF({ ...f, meaning_hi: e.target.value || null })}
          />
        </div>
        <div>
          <label className="lbl">Meaning (English)</label>
          <textarea
            className="field"
            rows={3}
            value={f.meaning_en ?? ""}
            onChange={(e) => setF({ ...f, meaning_en: e.target.value || null })}
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
