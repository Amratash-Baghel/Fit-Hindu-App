/**
 * Workout session tracking — the local-first write path.
 * Spec: docs/specs/feature-sprint.md slice 6. Tables from migration 0011.
 *
 * What this replaces: the player used to hold every set in a `useRef` and write
 * ONE activity_log row at the very end. Kill the app at set 9 of 10 and the
 * whole session was gone. Here every set lands as it happens.
 *
 * The order of operations is the whole design:
 *
 *   1. write to the LOCAL mirror (AsyncStorage) and await it
 *   2. append the operation to the durable queue
 *   3. try to flush the queue to Supabase
 *
 * Steps 1-2 cannot fail in a way that loses a set; step 3 is allowed to fail
 * forever. That ordering is what makes this work on the target device — a
 * mid-range Android on an intermittent 2G connection — where the network is the
 * least reliable component in the system.
 *
 * Dedup is the database's job, not ours. `workout_sessions.id` is
 * client-generated and `exercise_logs`' primary key is
 * (session_id, item_position, set_no), so every replay is an
 * `on conflict do nothing`. A flaky connection that retries the same write ten
 * times produces one row. This is why the queue can be dumb: it never has to
 * reason about what already landed.
 *
 * No connectivity listener: @react-native-community/netinfo is not a dependency
 * and adding one needs owner approval. Instead the queue flushes on every write,
 * on app launch, and whenever the app returns to the foreground (AppState is
 * built into React Native). In practice that covers "sync when connectivity
 * returns" — the user has to touch the app for it to matter.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { supabase } from "./supabase";
import { logActivity } from "./activity";
import type { SessionSource } from "./content";

const SESSION_KEY = "fithindu.session.current";
const QUEUE_KEY = "fithindu.session.queue";

/** The DB `session_source` enum. `SessionSource.kind` uses different words for
 *  the same three things, so the mapping lives here rather than at call sites. */
type DbSource = "template" | "custom" | "exercise";

const SOURCE_MAP: Record<SessionSource["kind"], DbSource> = {
  template: "template",
  user_workout: "custom",
  single: "exercise",
};

export interface LoggedSet {
  item_position: number; // 0-based index within the session
  set_no: number; // 1-based
  exercise_id: string;
  reps?: number;
  duration_seconds?: number;
  weight_kg?: number;
  skipped: boolean;
}

/** The local mirror of the session in progress. Survives an app kill. */
export interface LocalSession {
  id: string;
  source: DbSource;
  source_ref_id: string | null;
  program_id: string | null;
  plan_id: string | null;
  /** Epoch ms — compared against `Date.now()` only, never displayed. */
  started_at_ms: number;
  /** IST calendar date the session began, so a reconcile can tell whether it is
   *  still the same day (see `reconcile`). */
  ist_date: string;
  sets: LoggedSet[];
  finished: boolean;
}

/**
 * Queued writes, drained in order. Order matters exactly once:
 * `exercise_logs` has an FK to `workout_sessions`, so a session's insert must
 * land before its sets. Draining sequentially and stopping at the first failure
 * preserves that without the queue needing to model dependencies.
 */
type QueuedOp =
  | { kind: "session"; row: Record<string, unknown> }
  | { kind: "sets"; session_id: string; rows: Record<string, unknown>[] }
  | { kind: "finish"; session_id: string; status: "completed" | "abandoned"; completed_at: string };

// ---------- ids ----------

/**
 * RFC-4122 v4, without a dependency.
 *
 * Neither `crypto.randomUUID` nor `crypto.getRandomValues` exists in this
 * runtime (Hermes has no WebCrypto, Expo's winter polyfills do not add it, and
 * expo-crypto is not installed), so the `Math.random` path is the one that
 * actually runs today. That is acceptable *here specifically*: these are row
 * identifiers used for idempotent replay, never secrets, never anything an
 * attacker gains by predicting — and the uniqueness that matters is per user
 * per session, not global. The stronger sources are preferred if a future SDK
 * provides them.
 */
function uuidv4(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => void } }).crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();

  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);

  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(b[i].toString(16).padStart(2, "0"));
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Today's date in IST — the same boundary the server uses (`ist_today()`). */
function istToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

// ---------- local mirror ----------

async function readLocal(): Promise<LocalSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalSession) : null;
  } catch {
    return null;
  }
}

async function writeLocal(s: LocalSession | null): Promise<void> {
  try {
    if (s) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage is full or unavailable. The in-memory session still works and the
    // queue may still flush; only crash-resilience is lost. Never block a set.
  }
}

// ---------- durable queue ----------

async function readQueue(): Promise<QueuedOp[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: QueuedOp[]): Promise<void> {
  try {
    if (q.length) await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    else await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    /* see writeLocal */
  }
}

async function enqueue(op: QueuedOp): Promise<void> {
  const q = await readQueue();
  q.push(op);
  await writeQueue(q);
}

/** Serialises flushes: two overlapping drains would double-send and could
 *  reorder a session insert behind its own sets. */
let flushing = false;

/**
 * Drain the queue in order, stopping at the first failure so ordering holds.
 * Returns true if the queue is now empty.
 *
 * Every operation is idempotent server-side, so a flush interrupted halfway —
 * or one that already succeeded but whose response was lost — costs nothing on
 * the next attempt.
 */
export async function flushQueue(): Promise<boolean> {
  if (flushing) return false;
  flushing = true;
  try {
    let q = await readQueue();
    if (!q.length) return true;

    // No session, no owner to attribute writes to. Keep the queue for a later
    // sign-in rather than dropping training data on the floor.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    while (q.length) {
      const op = q[0];
      const ok = await send(op, user.id);
      if (!ok) {
        await writeQueue(q); // persist whatever is left; retry next time
        return false;
      }
      q = q.slice(1);
      await writeQueue(q);
    }
    return true;
  } catch {
    return false;
  } finally {
    flushing = false;
  }
}

/** One queued operation → one Supabase write. True means "durably landed". */
async function send(op: QueuedOp, userId: string): Promise<boolean> {
  try {
    if (op.kind === "session") {
      const { error } = await supabase
        .from("workout_sessions")
        // ignoreDuplicates → `on conflict do nothing`: a retried insert of a
        // session that already landed must not clobber its status back to
        // 'active' after it was completed.
        .upsert({ ...op.row, user_id: userId }, { onConflict: "id", ignoreDuplicates: true });
      return !error;
    }
    if (op.kind === "sets") {
      const { error } = await supabase
        .from("exercise_logs")
        .upsert(op.rows, {
          onConflict: "session_id,item_position,set_no",
          ignoreDuplicates: true,
        });
      return !error;
    }
    const { error } = await supabase
      .from("workout_sessions")
      .update({ status: op.status, completed_at: op.completed_at })
      .eq("id", op.session_id)
      .eq("user_id", userId);
    return !error;
  } catch {
    return false; // offline, DNS failure, timeout — all the same to the queue
  }
}

// ---------- lifecycle ----------

/** The active plan, for program scoping. Best-effort: offline returns nulls,
 *  and `program_id` is nullable by design (migration 0011). */
async function activePlan(): Promise<{ program_id: string | null; plan_id: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { program_id: null, plan_id: null };
    const { data } = await supabase
      .from("user_plans")
      .select("id, program_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    return { program_id: data?.program_id ?? null, plan_id: data?.id ?? null };
  } catch {
    return { program_id: null, plan_id: null };
  }
}

/**
 * Begin a session. Returns the local record; the caller keeps its `id`.
 *
 * Returns null for a guest: with no user there is nothing to attribute the
 * session to, and unlike a set-level write there is no point queueing a session
 * whose owner may never exist. Guests still get the full player, they just bank
 * nothing — the same rule `activity.ts` already follows, and the same gap the
 * deferred guest-merge slice will close for both at once.
 */
export async function startSession(src: SessionSource): Promise<LocalSession | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { program_id, plan_id } = await activePlan();
  const local: LocalSession = {
    id: uuidv4(),
    source: SOURCE_MAP[src.kind],
    source_ref_id: src.refId,
    program_id,
    plan_id,
    started_at_ms: Date.now(),
    ist_date: istToday(),
    sets: [],
    finished: false,
  };

  await writeLocal(local);
  await enqueue({
    kind: "session",
    row: {
      id: local.id,
      program_id,
      plan_id,
      source: local.source,
      source_ref_id: local.source_ref_id,
      status: "active",
      // ist_date and started_at are server-defaulted; letting the server stamp
      // them keeps the day boundary on the server clock, per the IST rule.
    },
  });
  void flushQueue();
  return local;
}

/**
 * Record one set. Local first, network second — a kill between the two loses
 * nothing, which is the entire point of this module.
 *
 * Silently no-ops when there is no local session (guest, or a player opened
 * before sign-in): the caller should not have to branch on it.
 */
export async function logSet(sessionId: string, entry: LoggedSet): Promise<void> {
  const local = await readLocal();
  if (!local || local.id !== sessionId) return;

  // Replace-or-append, keyed the same way the database is, so a repeated call
  // for the same set can never grow the mirror unboundedly.
  const i = local.sets.findIndex(
    (s) => s.item_position === entry.item_position && s.set_no === entry.set_no,
  );
  if (i >= 0) local.sets[i] = entry;
  else local.sets.push(entry);
  await writeLocal(local);

  await enqueue({
    kind: "sets",
    session_id: sessionId,
    rows: [{ session_id: sessionId, ...entry }],
  });
  void flushQueue();
}

/**
 * Close the session out.
 *
 * `activity_log` is written here and only here for a live finish — it is the
 * row the streak reads, and it is deliberately separate from the session tables
 * (the streak counts every activity type, not just workouts).
 */
export async function finishSession(
  sessionId: string,
  status: "completed" | "abandoned" = "completed",
): Promise<void> {
  const local = await readLocal();
  if (!local || local.id !== sessionId || local.finished) return;

  local.finished = true;
  await writeLocal(local);

  await enqueue({
    kind: "finish",
    session_id: sessionId,
    status,
    completed_at: new Date().toISOString(),
  });

  if (status === "completed") {
    const minutes = Math.max(1, Math.round((Date.now() - local.started_at_ms) / 60000));
    await logActivity(
      "workout",
      { session_id: sessionId, source: local.source, minutes, sets: local.sets.length },
      local.source_ref_id ?? undefined,
    );
  }

  await flushQueue();
  await writeLocal(null); // the mirror's job is done; the queue owns delivery now
}

/**
 * Called once at app launch. Flushes anything the last run could not deliver
 * and closes out a session the user never finished.
 *
 * How an unfinished session is closed, and why:
 *  - with at least one logged set → `completed`, because the training genuinely
 *    happened. Marking it `abandoned` would erase real work from every progress
 *    number, which is the data loss this slice exists to stop.
 *  - with no sets → `abandoned`. Nothing happened; counting it would let
 *    opening and force-quitting the player inflate the session count.
 *
 * The `activity_log` row is written only when the session began TODAY in IST.
 * Writing it on a later day would credit the wrong day, and the streak rules
 * (docs/decisions.md 2026-07-28) forbid retroactive completion. So a session
 * killed overnight keeps its sets and its minutes but does not resurrect a
 * broken streak — the sets are history, the streak is a promise about days.
 */
export async function reconcile(): Promise<void> {
  const local = await readLocal();

  if (local && !local.finished) {
    const trained = local.sets.length > 0;
    await enqueue({
      kind: "finish",
      session_id: local.id,
      status: trained ? "completed" : "abandoned",
      completed_at: new Date().toISOString(),
    });
    if (trained && local.ist_date === istToday()) {
      const minutes = Math.max(1, Math.round((Date.now() - local.started_at_ms) / 60000));
      await logActivity(
        "workout",
        { session_id: local.id, source: local.source, minutes, sets: local.sets.length, recovered: true },
        local.source_ref_id ?? undefined,
      );
    }
    await writeLocal(null);
  }

  await flushQueue();
}

/** Retry delivery whenever the app comes back to the foreground — the stand-in
 *  for a connectivity listener (see the module header). */
export function watchForFlush(): () => void {
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") void flushQueue();
  });
  return () => sub.remove();
}
