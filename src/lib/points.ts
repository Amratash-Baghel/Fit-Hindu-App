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
 * The per-activity reward moment (owner ask 2026-08-10): when a workout /
 * meditation / jap / sleep run finishes, show how many Fit Points THAT activity
 * earned. Points stay computed server-side — this never scores anything on the
 * client. It just diffs the total: read today's total BEFORE the activity is
 * counted, read again after, and the difference is that activity's honest earn.
 *
 * Why a diff and not a lookup of "this activity's points": the rules are
 * per-DAY, not per-row (daily caps, jap's +2-per-round-beyond-2nd). The 2nd
 * workout of a day genuinely earns 0 (cap 25 already banked); the diff shows
 * that truthfully as +0 → the reward's "already claimed today" state, never a
 * fake +25. Caps and qualifiers therefore need no duplication here.
 */
export interface ActivityEarn {
  /** Points THIS activity added to today's total (>= 0), or null when it can't
   *  be measured — a guest, offline, or a failed read. 0 means the day's cap for
   *  this activity was already reached. */
  earned: number | null;
  /** All-time total after the activity, for the reward's running total line.
   *  null when unread. */
  total: number | null;
}

/** Full Fit-Points summary right now, or null (guest / offline / RPC error).
 *  Same RLS contract as usePoints — points_summary is not security definer, so
 *  passing our own uid returns our rows and nobody else's.
 *
 *  Uses getSession() (a LOCAL read) not getUser() (a network round-trip to the
 *  auth server): the reward path fires this twice per activity, and on the 2G
 *  target the extra hops are pure latency that also widen the window in which a
 *  not-yet-flushed write reads as "+0". The uid from the persisted session is
 *  all points_summary needs. */
export async function readPointsNow(): Promise<PointsSummary | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null; // guest — nothing banked, so no number to show
    const { data, error } = await supabase.rpc("points_summary", { uid: session.user.id }).single();
    if (error || !data) return null;
    return data as PointsSummary;
  } catch {
    return null;
  }
}

/** Today's Fit-Points total right now — the "before" snapshot to capture just
 *  before an activity is logged. null for a guest / failed read (the reward then
 *  simply shows no +number). */
export async function pointsTodayNow(): Promise<number | null> {
  const s = await readPointsNow();
  return s ? s.today_points : null;
}

/** Given the today-total captured BEFORE the activity was logged (and the write
 *  now durably landed), read the summary again and return the per-activity earn
 *  plus the new all-time total. */
export async function earnSince(before: number | null): Promise<ActivityEarn> {
  const after = await readPointsNow();
  if (!after) return { earned: null, total: null };
  const earned = before == null ? null : Math.max(0, after.today_points - before);
  return { earned, total: after.total_points };
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
