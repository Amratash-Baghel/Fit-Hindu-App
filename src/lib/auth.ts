/**
 * Session bootstrap — anonymous auth (v1 stopgap, owner call 2026-07-16).
 *
 * Every install gets a real Supabase user via signInAnonymously() at startup:
 * no login screen, but auth.uid() exists, so every RLS-gated feature that was
 * waiting on "auth ships" lights up — diet plan requests, activity logging,
 * My Workouts. The session persists in AsyncStorage (see supabase.ts), so an
 * install keeps its identity across launches.
 *
 * Upgrade path: when real sign-in ships, link the anonymous user via
 * supabase.auth.updateUser (email/phone) — data carries over, nothing here
 * changes. Requires "Allow anonymous sign-ins" ON in Supabase Auth settings;
 * if it's off, this quietly no-ops and the app behaves like before (signed
 * out), so it can never break startup.
 */
import { supabase } from "./supabase";

let bootPromise: Promise<void> | null = null;

export function ensureSession(): Promise<void> {
  // Single-flight: layout remounts must not race a second sign-in.
  if (!bootPromise) {
    bootPromise = (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) return;
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          // Disabled on the server or offline — the app still works signed out.
          console.warn("[auth] anonymous sign-in unavailable:", error.message);
        }
      } catch {
        // never block startup on auth
      }
    })();
  }
  return bootPromise;
}
