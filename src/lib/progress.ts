/**
 * Progress reads — everything the Progress screen and the plan / body-area
 * bars display. Spec: docs/specs/feature-sprint.md slice 6.
 *
 * Every aggregate is computed in Postgres (migration 0013) and arrives as a
 * handful of rows. Nothing here pulls raw exercise_logs to the device: the
 * body-area breakdown alone would mean shipping a user's entire training
 * history over 2G so the phone could count it.
 *
 * Guests read nothing — they have no session, so the RPCs would return empty
 * anyway. The hook returns `null` for them and the screen shows the
 * invitation, exactly as `useStreak` already does for the sankalp card.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type {
  BodyAreaProgress,
  DailyActivity,
  PlanProgress,
  ProgressSummary,
} from "../types/db";

/** How many days the activity strip can show. The 7-day view is a slice of the
 *  same fetch, so switching between them costs no round-trip. */
export const ACTIVITY_WINDOW_DAYS = 30;

export interface ProgressData {
  summary: ProgressSummary;
  areas: BodyAreaProgress[];
  /** null when the user has no active plan — a real state, not an error. */
  plan: PlanProgress | null;
  /** Most recent first, at most ACTIVITY_WINDOW_DAYS entries. Only days with
   *  activity appear; the strip fills the gaps. */
  days: DailyActivity[];
}

const EMPTY_SUMMARY: ProgressSummary = {
  sessions_total: 0,
  sessions_week: 0,
  minutes_total: 0,
  minutes_week: 0,
  sets_total: 0,
  active_days: 0,
};

/**
 * One fetch for the whole screen: four reads issued together rather than
 * chained, so the screen costs one round-trip of latency, not four.
 *
 * A failure in any one read degrades that section only — the streak card and
 * the totals should not vanish because the body-area join was slow.
 */
export async function fetchProgress(uid: string): Promise<ProgressData> {
  const since = new Date();
  since.setDate(since.getDate() - ACTIVITY_WINDOW_DAYS);
  const sinceStr = since.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const [summaryRes, areasRes, planRes, daysRes] = await Promise.all([
    supabase.rpc("progress_summary", { uid }).single(),
    supabase.rpc("body_area_progress", { uid }),
    supabase.rpc("plan_progress", { uid }),
    supabase
      .from("daily_activity")
      .select("ist_date, types, entries")
      .eq("user_id", uid)
      .gte("ist_date", sinceStr)
      .order("ist_date", { ascending: false })
      .limit(ACTIVITY_WINDOW_DAYS),
  ]);

  const planRows = (planRes.data ?? []) as unknown as PlanProgress[];

  return {
    summary: summaryRes.error
      ? EMPTY_SUMMARY
      : ((summaryRes.data as ProgressSummary | null) ?? EMPTY_SUMMARY),
    areas: areasRes.error ? [] : ((areasRes.data ?? []) as unknown as BodyAreaProgress[]),
    // plan_progress returns zero rows when nothing is assigned.
    plan: planRes.error ? null : (planRows[0] ?? null),
    days: daysRes.error ? [] : ((daysRes.data ?? []) as unknown as DailyActivity[]),
  };
}

export interface UseProgress {
  /** null = guest, or the first read hasn't landed. */
  data: ProgressData | null;
  loading: boolean;
  refresh: () => void;
}

export function useProgress(): UseProgress {
  const { session, loading: authLoading } = useAuth();
  // Tagged with the uid it belongs to, so a stale read from a previous account
  // never renders against a new one, and a refresh keeps the old numbers on
  // screen (no flicker to zero) until the new ones arrive.
  const [fetched, setFetched] = useState<{ uid: string; data: ProgressData } | null>(null);
  const [tick, setTick] = useState(0);
  const uid = session?.user.id ?? null;

  useEffect(() => {
    if (authLoading || !uid) return;
    let alive = true;
    void fetchProgress(uid).then((data) => {
      if (alive) setFetched({ uid, data });
    });
    return () => {
      alive = false;
    };
  }, [uid, authLoading, tick]);

  const ready = uid != null && fetched?.uid === uid;
  return {
    data: ready ? fetched.data : null,
    loading: authLoading ? true : uid != null && !ready,
    refresh: useCallback(() => setTick((t) => t + 1), []),
  };
}

/**
 * The last `days` IST dates, most recent LAST, each flagged with whether
 * anything was logged. Built here rather than in SQL because the gaps matter:
 * `daily_activity` only has rows for days with activity, and a strip that
 * skipped the empty days would silently compress a fortnight of nothing into a
 * solid week of dots.
 */
export function activityStrip(
  rows: DailyActivity[],
  days: number,
): { date: string; active: boolean }[] {
  const active = new Set(rows.map((r) => r.ist_date));
  const out: { date: string; active: boolean }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    out.push({ date: key, active: active.has(key) });
  }
  return out;
}
