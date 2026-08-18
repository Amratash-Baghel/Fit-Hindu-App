/**
 * Durable retry queue for `activity_log` writes that are NOT part of a
 * workout session — meditation, jap, sleep, diet's "kept today" tap.
 *
 * Why this exists: `logActivity()` (activity.ts) is a single insert with no
 * retry — offline or a transient error and the row is gone, silently, because
 * the caller only sees a boolean. `session.ts` solved exactly this for
 * workouts with a local-mirror-then-durable-queue design; this module gives
 * the other four completions the same guarantee without touching that file
 * again — it is the one this app now depends on most for training data, and
 * a second edit to it tonight, unverifiable on a real device, is a worse risk
 * than a small amount of duplicated queue machinery.
 *
 * Deliberate difference from session.ts's queue: `user_id` is stamped into
 * the row at ENQUEUE time and never rewritten at flush time. session.ts's
 * `send()` stamps `user_id` from whichever session is active WHEN THE FLUSH
 * RUNS — on a shared device (this audience's norm, per auth.tsx) a sign-out
 * before a flush followed by a different sign-in would silently attribute
 * the first user's data to the second, because RLS only checks the row is
 * self-consistent, not that it matches who originally wrote it. Stamping at
 * enqueue time closes that door here: a flush that runs under the wrong
 * account fails RLS outright (user_id != auth.uid()) instead of succeeding
 * against the wrong owner. (That gap in session.ts is real and is flagged in
 * docs/decisions.md rather than patched blind tonight.)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { supabase } from "./supabase";

const QUEUE_KEY = "fithindu.activity.queue";
const MAX_ATTEMPTS = 8;

interface QueuedActivity {
  row: Record<string, unknown>; // includes user_id, client_event_id — see enqueueActivity
  tries?: number;
}

let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function readQueue(): Promise<QueuedActivity[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedActivity[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: QueuedActivity[]): Promise<void> {
  try {
    if (q.length) await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    else await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // Storage unavailable: this attempt's durability is lost, but nothing
    // crashes — the caller already tried a live write before reaching here.
  }
}

/**
 * Queue one activity_log row for later delivery. `row` must already carry
 * `user_id` and `client_event_id` — see `logActivityDurable` in activity.ts,
 * the only caller. Re-reads the queue inside the lock (never writes back a
 * stale snapshot) so a queue-drain running concurrently with a fresh enqueue
 * can't erase it — the exact race fixed in session.ts's flushQueue today.
 */
export function enqueueActivity(row: Record<string, unknown>): Promise<void> {
  return serial(async () => {
    const q = await readQueue();
    q.push({ row });
    await writeQueue(q);
  });
}

let flushing = false;

/**
 * Drain the queue, oldest first. Each row is self-contained (no ordering
 * dependency between rows, unlike session.ts's session→sets chain), so a
 * failure just stops the drain where it is rather than needing to preserve
 * position — the next flush trigger (foreground, launch, sign-in) resumes it.
 */
export async function flushActivityQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      // Re-read every iteration: a row logged while this loop awaits a network
      // call must still be here when the loop gets back around to it. `flushing`
      // guards against a second drain running concurrently, and enqueueActivity
      // only ever appends to the tail, so index 0 here is always the same
      // logical entry the send below is about — no identity tracking needed.
      const q = await readQueue();
      if (!q.length) return;

      // Same guard session.ts's flushQueue makes before it sends anything: an
      // unauthenticated attempt would fail RLS (user_id != auth.uid()), and
      // without this check that failure counts against the row's MAX_ATTEMPTS
      // exactly like a real delivery failure would. app/_layout.tsx fires this
      // flush in its own effect, independent of auth.tsx's async session
      // restore, so a cold launch can reach here before a real session exists —
      // bailing here (not touching `tries`) means those attempts are free, and
      // the budget is only spent on retries that had a real chance to land.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("activity_log")
        .upsert(q[0].row, { onConflict: "user_id,client_event_id", ignoreDuplicates: true });

      if (error) {
        // RLS rejection (wrong/no account signed in right now) and a genuine
        // network failure look the same from here — both mean "try again
        // later", never "drop it": the one case that must not repeat is
        // silently discarding real training/practice data.
        await serial(async () => {
          const cur = await readQueue();
          if (!cur.length) return;
          const tries = (cur[0].tries ?? 0) + 1;
          const next = tries >= MAX_ATTEMPTS ? cur.slice(1) : [{ ...cur[0], tries }, ...cur.slice(1)];
          await writeQueue(next);
        });
        return; // stop draining on the first failure; resume on the next trigger
      }

      await serial(async () => {
        const cur = await readQueue();
        await writeQueue(cur.slice(1));
      });
    }
  } finally {
    flushing = false;
  }
}

/** Same AppState pattern as session.ts's watchForFlush — the app's stand-in
 *  for a connectivity listener (no netinfo dependency; see that file). */
export function watchActivityFlush(): () => void {
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") void flushActivityQueue();
  });
  return () => sub.remove();
}
