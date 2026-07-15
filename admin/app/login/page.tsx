"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { supabaseConfigured, MISSING_ENV_MESSAGE } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = supabaseConfigured();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setError(MISSING_ENV_MESSAGE);
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form
        onSubmit={signIn}
        className="w-full max-w-sm space-y-4 rounded-2xl border p-8"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <div className="text-xs font-bold uppercase tracking-[3px]" style={{ color: "var(--gold)" }}>
            Fit Hindu
          </div>
          <h1 className="mt-1 text-xl font-bold">Content Panel</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Team sign-in. Ask the owner to add your account.
          </p>
        </div>

        <div>
          <label className="lbl" htmlFor="email">Email</label>
          <input id="email" type="email" required className="field" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="lbl" htmlFor="password">Password</label>
          <input id="password" type="password" required className="field" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>

        {error ? (
          <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
        ) : null}

        <button type="submit" disabled={busy} className="btn btn-gold w-full justify-center">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
