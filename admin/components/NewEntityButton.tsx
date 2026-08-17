"use client";

/** Creates a minimal draft row, then jumps straight into its editor —
 *  so every editor always has a real row id for media slots to target. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function NewEntityButton({
  table,
  defaults,
  editorPath,
  label,
  slugPrefix,
}: {
  table: string;
  defaults: Record<string, unknown>;
  editorPath: string; // e.g. "/library/exercises"
  label: string;
  /** Tables with a unique `slug` pass a prefix and get `<prefix>-<now>` stamped
   *  HERE, at click time. Building it in the page instead made the timestamp
   *  part of the render (impure), and — worse — froze it: two creations from one
   *  rendered page would carry the same slug and the second insert would fail. */
  slugPrefix?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="btn btn-gold"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const row = slugPrefix ? { ...defaults, slug: `${slugPrefix}-${Date.now()}` } : defaults;
        const { data, error } = await supabaseBrowser().from(table).insert(row).select("id").single();
        setBusy(false);
        if (error) {
          alert(error.message);
          return;
        }
        router.push(`${editorPath}/${data.id}`);
      }}
    >
      {busy ? "Creating…" : label}
    </button>
  );
}
