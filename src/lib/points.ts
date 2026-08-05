/**
 * Fit Points — reads the server-computed points_summary() RPC (migration 0020).
 *
 * Points are computed SERVER-SIDE from activity_log and the check-in table,
 * never on the client: the rules, caps and milestone ladder (docs/specs/
 * points-rewards.md) live in exactly one place — the SQL and the admin-tunable
 * points_rules / streak_milestones tables. This hook only displays what the
 * server returns; changing a rule never needs an app release.
 *
 * Guests have no session and bank nothing (activity.ts no-ops without a user),
 * so the hook returns null for them — the Home card reads null as the "start
 * your sankalp" invitation, exactly as it does for the streak, so the two never
 * disagree about who is signed in.
 */
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { PointsSummary } from "../types/db";

/** A signed-in user with no history: points_summary() still returns one row of
 *  zeroes, so this is only a fallback for an unexpected RPC error. */
const EMPTY: PointsSummary = {
  total_points: 0,
  today_points: 0,
  activity_points: 0,
  milestone_points: 0,
  current_streak: 0,
  longest_streak: 0,
  next_milestone_day: null,
  next_milestone_bonus: null,
};

export interface UsePoints {
  /** null = guest, or the signed-in read hasn't landed yet → show the
   *  invitation, not a zero. */
  points: PointsSummary | null;
  loading: boolean;
  /** Re-read — call on screen focus after an activity may have logged. */
  refresh: () => void;
}

export function usePoints(): UsePoints {
  const { session, loading: authLoading } = useAuth();
  // The fetched row is tagged with the uid it belongs to, so a stale row from a
  // previous account never shows against a new one, and a refresh keeps the old
  // row visible (no flicker) until the new read lands.
  const [fetched, setFetched] = useState<{ uid: string; data: PointsSummary } | null>(null);
  const [tick, setTick] = useState(0);
  const uid = session?.user.id ?? null;

  useEffect(() => {
    if (authLoading || !uid) return;
    let alive = true;

    // points_summary() is stable and NOT security definer, so activity_log's
    // RLS applies to the caller: passing our own uid returns our rows, and
    // there is no path to read anyone else's. It always returns exactly one row.
    void supabase
      .rpc("points_summary", { uid })
      .single()
      .then(({ data, error }) => {
        if (!alive) return;
        setFetched({ uid, data: error ? EMPTY : ((data as PointsSummary | null) ?? EMPTY) });
      });

    return () => {
      alive = false;
    };
  }, [uid, authLoading, tick]);

  const ready = uid != null && fetched?.uid === uid;
  return {
    points: ready ? fetched.data : null,
    loading: authLoading ? true : uid != null && !ready,
    refresh: useCallback(() => setTick((t) => t + 1), []),
  };
}

/**
 * Record the app-open bonus for today. Fire-and-forget: the (user_id, ist_date)
 * primary key is the correctness guarantee — a second call the same IST day is
 * an `on conflict do nothing`, so calling this on every foreground is safe and
 * cheap. No-op for guests (nothing to attribute the bonus to), and a check-in
 * never earns a streak day (it is not an activity_log row).
 */
export async function checkIn(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // guest — no bonus to bank

    await supabase
      .from("daily_checkins")
      .upsert({ user_id: user.id }, { onConflict: "user_id,ist_date", ignoreDuplicates: true });
  } catch {
    // A missed check-in is a missing 5 points, never an error worth surfacing.
  }
}

/** Bank the app-open bonus now and on every return to the foreground — the same
 *  AppState pattern the offline queue uses (session.ts watchForFlush). checkIn()
 *  is a no-op for guests and idempotent per IST day, so firing it often is safe.
 *  Returns an unsubscribe for the effect cleanup. */
export function watchCheckIn(): () => void {
  void checkIn(); // cold start: AppState is already "active", no change event fires
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") void checkIn();
  });
  return () => sub.remove();
}
