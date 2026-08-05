/**
 * Crash-recovery for sleep runs.
 *
 * `app/(tabs)/sleep.tsx` writes a `sleep_sound` row only from a JS stop path
 * (user stop, timer complete, tab blur, the global stop pill). Sleep audio is
 * allowed to keep playing in the background, so if Android kills the app process
 * while backgrounded — the lock-the-phone-and-sleep case, common on low-end
 * devices — no stop path runs and a qualifying run is lost. This module
 * persists the run so the NEXT launch can log it (`reconcileSleepRun`, wired
 * into `app/_layout.tsx` beside the session reconcile).
 *
 * Honesty over recovery. We can only claim listening time we can PROVE, and JS
 * does not run while backgrounded. So a heartbeat (`lastAliveMs`, bumped while
 * the screen ticks) is the CEILING on `actual_min` at reconcile — never
 * wall-clock-since-start, which would count the whole night the app sat killed
 * as listening and mint points. What this recovers is a run whose JS lived long
 * enough to KNOW it qualified but died before the write landed. The pure
 * lock-immediately-and-sleep case still can't be measured from JS at all — that
 * needs a native audio-session tracker, out of v1 scope.
 *
 * Idempotent: the mirror stores the `client_event_id` the live stop path also
 * uses, so if the run WAS logged live, this reconcile's upsert collides on
 * 0012's unique `(user_id, client_event_id)` and is a no-op.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logActivity } from "./activity";

const KEY = "fithindu.sleep.run";
/** Same floor as the sleep_sound points rule (migration 0020). */
const QUALIFY_MIN = 5;

interface SleepRun {
  /** Stable across the live-log and reconcile paths → the two dedup to one row. */
  clientEventId: string;
  soundId: string;
  /** Chosen auto-stop, minutes; 0 = off. Caps the recovered actual_min. */
  timerMinutes: number;
  startedAtMs: number;
  /** Last moment the screen's tick confirmed the run alive. */
  lastAliveMs: number;
}

/** Open the run mirror at play-start. The caller owns the `clientEventId` so the
 *  live stop path can log under the SAME id without awaiting this write. */
export async function beginSleepRun(
  clientEventId: string,
  soundId: string,
  timerMinutes: number,
): Promise<void> {
  const now = Date.now();
  const run: SleepRun = { clientEventId, soundId, timerMinutes, startedAtMs: now, lastAliveMs: now };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    /* best-effort — a missed mirror only forfeits crash recovery, not the live log */
  }
}

/** Heartbeat: mark the current run alive as of now. Called from the screen's
 *  tick while playing (throttled by the caller). No-op if no run is open. */
export async function markSleepAlive(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const run = JSON.parse(raw) as SleepRun;
    run.lastAliveMs = Date.now();
    await AsyncStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    /* best-effort */
  }
}

/** Drop the mirror. Called from every live stop path — the run ended in-app, so
 *  there is nothing left to recover (qualified or not). */
export async function clearSleepRun(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

/**
 * Reconcile at launch. If a mirror survived a crash and PROVABLY heard
 * >= 5 min (`lastAliveMs - startedAtMs`, capped at the timer), log it under its
 * stored `client_event_id` and clear. Anything shorter is cleared without
 * logging. A guest has no session, so `logActivity` no-ops and we still clear —
 * a guest run was never going to be recorded anyway.
 */
export async function reconcileSleepRun(): Promise<void> {
  let run: SleepRun;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    run = JSON.parse(raw) as SleepRun;
  } catch {
    return;
  }

  let aliveMin = Math.floor((run.lastAliveMs - run.startedAtMs) / 60000);
  if (run.timerMinutes > 0) aliveMin = Math.min(aliveMin, run.timerMinutes);

  if (aliveMin >= QUALIFY_MIN) {
    await logActivity(
      "sleep_sound",
      { minutes: run.timerMinutes, actual_min: aliveMin, timer_completed: false, recovered: true },
      run.soundId,
      run.clientEventId,
    );
  }
  await clearSleepRun();
}
