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
}: {
  table: string;
  defaults: Record<string, unknown>;
  editorPath: string; // e.g. "/library/exercises"
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="btn btn-gold"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { data, error } = await supabaseBrowser().from(table).insert(defaults).select("id").single();
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
