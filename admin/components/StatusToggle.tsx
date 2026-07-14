"use client";

/** Draft ⇄ Published toggle. Published is all the app can see (RLS). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function StatusToggle({
  table,
  id,
  status,
}: {
  table: string;
  id: string;
  status: "draft" | "published" | "archived";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === "published" ? "draft" : "published";

  return (
    <button
      type="button"
      disabled={busy}
      className={status === "published" ? "btn btn-ghost" : "btn btn-gold"}
      onClick={async () => {
        setBusy(true);
        const { error } = await supabaseBrowser().from(table).update({ status: next }).eq("id", id);
        setBusy(false);
        if (!error) router.refresh();
        else alert(error.message);
      }}
      title={status === "published" ? "Unpublish (hide from the app)" : "Publish (make visible in the app)"}
    >
      {busy ? "…" : status === "published" ? "Unpublish" : "Publish"}
    </button>
  );
}
