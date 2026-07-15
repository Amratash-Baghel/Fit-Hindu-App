/**
 * Env presence check.
 *
 * NEXT_PUBLIC_* vars are inlined at BUILD time — adding them in the Vercel
 * dashboard does nothing until you REDEPLOY. When they're absent,
 * createServerClient/createBrowserClient throw; in middleware that surfaces
 * as an opaque MIDDLEWARE_INVOCATION_FAILED 500. So every entry point checks
 * this first and renders a readable message instead of crashing.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export const MISSING_ENV_MESSAGE =
  "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, " +
  "then REDEPLOY (they are baked in at build time).";
