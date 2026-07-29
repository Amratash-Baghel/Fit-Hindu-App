/**
 * Daily streak — reads the server-computed streak_state() RPC (migration 0012).
 *
 * The streak is computed SERVER-SIDE from activity_log, never on the client:
 * device clocks and timezones are untrustworthy, and the boundary + freeze
 * rules (docs/decisions.md 2026-07-28) live in exactly one place — the SQL.
 * This hook only displays what the server returns.
 *
 * Guests have no session and bank nothing yet (activity.ts no-ops without a
 * user — the "guests bank a local streak" decision is recorded but not built),
 * so the hook returns null for them. The Home card reads null as the "start
 * your sankalp" invitation, which doubles as the reason to sign in.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { StreakState } from "../types/db";

/** A signed-in user with no history: streak_state() still returns one row of
 *  zeros, so this is only a fallback for an unexpected RPC error. */
const EMPTY: StreakState = {
  current_streak: 0,
  longest_streak: 0,
  last_date: null,
  at_risk: false,
  freezes_used: 0,
};

export interface UseStreak {
  /** null = guest, or the signed-in read hasn't landed yet → show the
   *  invitation, not a zero streak. */
  streak: StreakState | null;
  loading: boolean;
  /** Re-read the streak — call on screen focus after an activity may have logged. */
  refresh: () => void;
}

export function useStreak(): UseStreak {
  const { session, loading: authLoading } = useAuth();
  // The fetched row is tagged with the uid it belongs to, so a stale row from a
  // previous account never shows against a new one, and a refresh keeps the old
  // row visible (no flicker) until the new read lands.
  const [fetched, setFetched] = useState<{ uid: string; data: StreakState } | null>(null);
  const [tick, setTick] = useState(0);
  const uid = session?.user.id ?? null;

  useEffect(() => {
    // Guests and the pre-restore window have nothing to read — deriving their
    // state below (rather than setting it here) keeps this effect free of a
    // synchronous setState, which would cascade renders.
    if (authLoading || !uid) return;
    let alive = true;

    // streak_state() is stable and NOT security definer, so activity_log's RLS
    // applies to the caller: passing our own uid returns our rows, and there is
    // no path to read anyone else's. It always returns exactly one row.
    void supabase
      .rpc("streak_state", { uid })
      .single()
      .then(({ data, error }) => {
        if (!alive) return;
        setFetched({ uid, data: error ? EMPTY : ((data as StreakState | null) ?? EMPTY) });
      });

    return () => {
      alive = false;
    };
  }, [uid, authLoading, tick]);

  const ready = uid != null && fetched?.uid === uid;
  return {
    streak: ready ? fetched.data : null,
    // Guests are never "loading"; a signed-in user is until their first read lands.
    loading: authLoading ? true : uid != null && !ready,
    refresh: useCallback(() => setTick((t) => t + 1), []),
  };
}
