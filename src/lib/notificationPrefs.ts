/**
 * Notification preferences — the React binding for the `notification_prefs`
 * row. Spec: docs/specs/feature-sprint.md slice 7.
 *
 * SERVER-SIDE, unlike the haptics/sound toggles in src/lib/settings.ts, and the
 * difference is not stylistic. Those two are per-device ("this phone buzzes")
 * and the only reader is the app itself. These are read by a cron job running
 * in Postgres at 19:00 with the phone in a pocket: a preference in AsyncStorage
 * is a preference the sender cannot honour. They also have to survive a
 * reinstall, or "stop reminding me" is undone by the next app update.
 *
 * Every signed-in user HAS a row — handle_new_user() creates it and 0014
 * backfilled the rest — so this never has to invent defaults. That matters:
 * a client-side default of "on" applied to a user who had turned everything
 * off is exactly how an app earns an uninstall.
 *
 * Guests get `prefs: null`. There is no row to read and nothing to send to; the
 * settings screen renders the sign-in invitation instead of dead toggles.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { NotificationPrefs } from "../types/db";

/** The columns a user can actually change. `user_id` and `updated_at` are ours. */
export type PrefsPatch = Partial<
  Pick<NotificationPrefs, "enabled" | "daily_reminder" | "reminder_time" | "streak_at_risk" | "plan_ready">
>;

export interface UseNotificationPrefs {
  /** null = guest, or the first read hasn't landed yet. */
  prefs: NotificationPrefs | null;
  loading: boolean;
  /** True when the last write failed and the UI has been rolled back. */
  failed: boolean;
  update: (patch: PrefsPatch) => void;
}

export function useNotificationPrefs(): UseNotificationPrefs {
  const { session, loading: authLoading } = useAuth();
  const uid = session?.user.id ?? null;

  // Tagged with the uid it belongs to, the same pattern useStreak() uses: a row
  // fetched for a previous account must never render against a new one.
  const [fetched, setFetched] = useState<{ uid: string; data: NotificationPrefs } | null>(null);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (authLoading || !uid) return;
    let live = true;

    void supabase
      .from("notification_prefs")
      .select("*")
      .eq("user_id", uid)
      // maybeSingle, not single: a row created by a trigger we did not run is
      // still a row we should not assume. No row simply means no toggles.
      .maybeSingle()
      .then(({ data }) => {
        if (live && data) setFetched({ uid, data: data as NotificationPrefs });
      });

    return () => {
      live = false;
    };
  }, [uid, authLoading]);

  const update = useCallback(
    (patch: PrefsPatch) => {
      const current = fetched;
      if (!uid || !current || current.uid !== uid) return;

      // Optimistic: a toggle that waits for a round-trip before moving feels
      // broken on a 2G connection, which is the connection we design for.
      const next = { ...current.data, ...patch, updated_at: new Date().toISOString() };
      setFetched({ uid, data: next });
      setFailed(false);

      void (async () => {
        const { error } = await supabase
          .from("notification_prefs")
          .update({ ...patch, updated_at: next.updated_at })
          .eq("user_id", uid);
        if (!alive.current) return;
        if (error) {
          // Roll back to what the server still believes. Leaving the switch in
          // the position the user chose would be a lie about what the cron will
          // do tonight — and a silent one.
          setFetched(current);
          setFailed(true);
        }
      })();
    },
    [uid, fetched],
  );

  const ready = uid != null && fetched?.uid === uid;
  return {
    prefs: ready ? fetched.data : null,
    loading: authLoading ? true : uid != null && !ready,
    failed,
    update,
  };
}

/**
 * "HH:MM:SS" (Postgres `time`) → "HH:MM" for display, and back.
 *
 * Kept here rather than in the screen because both directions must agree, and
 * because the column is a `time` — sending "19:00" back is valid, but sending
 * a Date is not, and a component reaching for `toLocaleTimeString()` would
 * quietly render the DEVICE's timezone for a value that is always IST.
 */
export const toDisplayTime = (t: string): string => t.slice(0, 5);
export const toDbTime = (hhmm: string): string => `${hhmm}:00`;
