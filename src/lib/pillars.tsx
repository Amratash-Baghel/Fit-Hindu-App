/**
 * BMS pillars — the Body / Mind / Soul structure of the redesign
 * (docs/specs/redesign-bms.md). Every module belongs to one pillar; the home
 * rings show how much of each pillar's daily practice is done today.
 *
 * The mapping is deliberately data-light: "done" means an activity of that
 * type was logged today (IST) in `daily_activity` (migration 0012's view —
 * one row per user per day, `types` = distinct activity types). One read for
 * all three rings.
 *
 * Today's pillars are shared through `PillarsProvider` so Home's rings, the
 * tab-bar done-dots and the Purna moment all read ONE refreshing source (one
 * network read, one truth) — completing an activity and returning to Home
 * lights the ring AND its tab-dot together. The context value is memoized and
 * an unchanged fetch result keeps its previous reference, so a focus refresh
 * that finds nothing new costs zero consumer re-renders (low-end Android rule).
 *
 * `devotional` is counted in NO ring: worship is never a task to tick off
 * (compliance fence-line — core worship stays outside gamification).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { istDayKey, DAY_MS } from "./daypart";
import type { ActivityType } from "../types/db";
import type { PillarKey } from "../ui/tokens";

export const PILLAR_TYPES: Record<PillarKey, ActivityType[]> = {
  body: ["workout", "meal"],
  mind: ["meditation"],
  soul: ["jap", "sleep_sound"],
};

/** Canonical pillar order (the morning/daytime ring stack). Evening surfaces
 *  reverse it — Soul leads after sunset — via `ringOrder(soulFirst)`, so the
 *  order truth lives here, never as screen-local literals. */
export const PILLAR_ORDER = ["body", "mind", "soul"] as const satisfies readonly PillarKey[];

/** The ring-stack order for the current daypart (see daypart.ts `soulFirst`). */
export function ringOrder(soulFirst: boolean): readonly PillarKey[] {
  return soulFirst ? [...PILLAR_ORDER].reverse() : PILLAR_ORDER;
}

export interface PillarProgress {
  done: number;
  total: number;
}

export type PillarsToday = Record<PillarKey, PillarProgress>;

const EMPTY: PillarsToday = {
  body: { done: 0, total: PILLAR_TYPES.body.length },
  mind: { done: 0, total: PILLAR_TYPES.mind.length },
  soul: { done: 0, total: PILLAR_TYPES.soul.length },
};

/** Fold a day's distinct activity types into the three pillar counts. Exported
 *  so My Path can reuse it over a week of `daily_activity` rows. */
export function foldPillars(types: ActivityType[]): PillarsToday {
  const set = new Set(types);
  const count = (keys: ActivityType[]) => keys.filter((k) => set.has(k)).length;
  return {
    body: { done: count(PILLAR_TYPES.body), total: PILLAR_TYPES.body.length },
    mind: { done: count(PILLAR_TYPES.mind), total: PILLAR_TYPES.mind.length },
    soul: { done: count(PILLAR_TYPES.soul), total: PILLAR_TYPES.soul.length },
  };
}

/** A pillar is "complete" when every one of its types was logged today. */
export function pillarComplete(p: PillarProgress): boolean {
  return p.total > 0 && p.done >= p.total;
}

/** How many of the three pillars are fully complete today (0–3). */
export function pillarsCompleteCount(pillars: PillarsToday): number {
  return PILLAR_ORDER.filter((k) => pillarComplete(pillars[k])).length;
}

const sameTypes = (a: ActivityType[], b: ActivityType[]) =>
  a.length === b.length && a.every((t) => b.includes(t));

const NO_TYPES: readonly ActivityType[] = [];

interface PillarsCtxValue {
  pillars: PillarsToday;
  /** today's raw distinct activity types — the task strip's done-states read
   *  these directly, from the same fetch that feeds the rings */
  todayTypes: readonly ActivityType[];
  loading: boolean;
  refresh: () => void;
}

const PillarsCtx = createContext<PillarsCtxValue | null>(null);

/**
 * Holds today's pillar counts for the whole tab group. Refreshes on mount, on
 * every return to the foreground (a new IST day may have begun, or an activity
 * finished while backgrounded), and imperatively via `refresh()` — Home calls
 * it on focus so a just-finished module lights its ring and tab-dot at once.
 *
 * Guests derive zeros without a read (no session → nothing to fetch), exactly
 * as the old standalone `usePillars` did.
 */
export function PillarsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const [today, setToday] = useState<{ pillars: PillarsToday; types: ActivityType[] }>({
    pillars: EMPTY,
    types: [],
  });
  const [loading, setLoading] = useState(!!uid);

  // Guests are DERIVED as zeros on the way out (below), never written into
  // state — so refresh() never setState()s synchronously, and the mount effect
  // that calls it stays free of cascading renders. An unchanged result returns
  // the PREVIOUS state reference, so React bails out of re-rendering consumers.
  const refresh = useCallback((): (() => void) | void => {
    if (!uid) return;
    let alive = true;
    supabase
      .from("daily_activity")
      .select("types")
      .eq("user_id", uid)
      .eq("ist_date", istDayKey())
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        const types = error || !data ? [] : ((data.types ?? []) as ActivityType[]);
        setToday((prev) =>
          sameTypes(prev.types, types) ? prev : { pillars: foldPillars(types), types },
        );
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  useEffect(() => refresh(), [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Guests (no uid) get EMPTY + loading:false derived here, mirroring the old
  // standalone usePillars — one fewer state write, and never the previous
  // user's rings after a sign-out. Memoized so a provider re-render with
  // unchanged parts hands consumers the same reference (no cascade).
  const value = useMemo<PillarsCtxValue>(
    () =>
      uid
        ? { pillars: today.pillars, todayTypes: today.types, loading, refresh }
        : { pillars: EMPTY, todayTypes: NO_TYPES, loading: false, refresh },
    [uid, today, loading, refresh],
  );

  return <PillarsCtx.Provider value={value}>{children}</PillarsCtx.Provider>;
}

/**
 * Today's ring values from the shared provider. A tree without the provider
 * (should not happen inside the tab group) degrades to zeros rather than
 * throwing — the same neutral state a guest sees.
 */
export function usePillars(): PillarsCtxValue {
  const ctx = useContext(PillarsCtx);
  if (ctx) return ctx;
  return { pillars: EMPTY, todayTypes: NO_TYPES, loading: false, refresh: () => {} };
}

/**
 * The last seven IST days folded to per-pillar active-day counts — the Home
 * "week, reflected" mirror (redesign, "reflect — never ask"). One small read
 * of rows the server already keeps; a pillar counts a day when ANY of its
 * activity types was logged. `null` until the read lands; guests stay `null`
 * (nothing was practised, so nothing is mirrored — never a wall of zeros).
 */
export interface WeekPillars {
  days: Record<PillarKey, number>;
  /** how many of the 7 days had any activity at all */
  activeDays: number;
}

export function useWeekPillars(): { week: WeekPillars | null; refresh: () => void } {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const [fetched, setFetched] = useState<{ uid: string; week: WeekPillars } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const since = istDayKey(new Date(Date.now() - 6 * DAY_MS));
    supabase
      .from("daily_activity")
      .select("ist_date, types")
      .eq("user_id", uid)
      .gte("ist_date", since)
      .then(({ data, error }) => {
        if (!alive || error) return;
        const rows = (data ?? []) as { ist_date: string; types: ActivityType[] }[];
        const days = Object.fromEntries(
          PILLAR_ORDER.map((k) => [
            k,
            rows.filter((r) => PILLAR_TYPES[k].some((t) => (r.types ?? []).includes(t))).length,
          ]),
        ) as Record<PillarKey, number>;
        setFetched({ uid, week: { days, activeDays: rows.length } });
      });
    return () => {
      alive = false;
    };
  }, [uid, tick]);

  return {
    week: uid && fetched?.uid === uid ? fetched.week : null,
    refresh: useCallback(() => setTick((t) => t + 1), []),
  };
}
