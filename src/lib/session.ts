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
import { uuidv4 } from "./ids";
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
type QueuedOp = {
  /** Attempts so far. A permanently-failing op (an FK that can never resolve,
   *  a row the server will always reject) must not wedge every later write
   *  behind it forever — this queue is one shared FIFO, so one poisoned op
   *  would stall all future workouts. After MAX_ATTEMPTS it is dropped. */
  tries?: number;
} & (
  | { kind: "session"; row: Record<string, unknown> }
  | { kind: "sets"; session_id: string; rows: Record<string, unknown>[] }
  | { kind: "finish"; session_id: string; status: "completed" | "abandoned"; completed_at: string }
  // The streak's row. Queued like everything else rather than written directly:
  // finishing a workout offline must not be the one case where the most
  // important row in the app is dropped on the floor.
  | { kind: "activity"; row: Record<string, unknown> }
);

const MAX_ATTEMPTS = 8;

/**
 * Serialises every read-modify-write of the two AsyncStorage keys.
 *
 * `enqueue` and the mirror update are read → mutate → write. Two overlapping
 * calls both read the old value and the second write wins, silently dropping
 * the first — and overlapping calls are entirely normal here: `logSet` is fired
 * from a tap handler and storage is slow on the target device. Without this the
 * module's core promise ("a set cannot be lost before the network is even
 * involved") is false.
 */
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

// ---------- ids ----------

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

function enqueue(op: QueuedOp): Promise<void> {
  return serial(async () => {
    const q = await readQueue();
    q.push(op);
    await writeQueue(q);
  });
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
      // Coalesce the run of consecutive set-writes for one session into a
      // single upsert. The spec's mitigation for chatty writes on 2G is a
      // "batched queue flush"; draining an offline session set-by-set is one
      // round-trip per set, which is the thing that mitigation exists to
      // avoid. Only a contiguous run is merged, so ordering still holds.
      let take = 1;
      let op = q[0];
      if (op.kind === "sets") {
        const rows = [...op.rows];
        while (take < q.length) {
          const nxt = q[take];
          if (nxt.kind !== "sets" || nxt.session_id !== op.session_id) break;
          rows.push(...nxt.rows);
          take += 1;
        }
        op = { ...op, rows };
      }

      const ok = await send(op, user.id);
      if (!ok) {
        // Count the attempt against the head op only. Dropping it after a
        // bounded number of tries loses at most that one write, where keeping
        // it would lose every write that ever queues behind it.
        const head = { ...q[0], tries: (q[0].tries ?? 0) + 1 };
        q = head.tries >= MAX_ATTEMPTS ? q.slice(1) : [head, ...q.slice(1)];
        await serial(() => writeQueue(q));
        return false;
      }
      q = q.slice(take);
      await serial(() => writeQueue(q));
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
    if (op.kind === "activity") {
      // The replay contract 0012 was written for: the client_event_id was
      // stamped at enqueue time, so a retry after a lost response inserts
      // nothing rather than double-crediting a day in an append-only table.
      const { error } = await supabase
        .from("activity_log")
        .upsert({ ...op.row, user_id: userId }, {
          onConflict: "user_id,client_event_id",
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

  // Close out a session the user left open before this one takes the mirror.
  // Without this, the old session's row stays `active` forever — `reconcile`
  // reads the mirror, which is about to be overwritten, so nothing would ever
  // close it — and every progress aggregate filters status = 'completed', so
  // its sets would be training that is on the server and invisible. The resume
  // strip (docs/specs/workout.md v3) makes re-entry a one-tap path, which is
  // what turns this from a rare leak into a real one.
  const stale = await readLocal();
  if (stale && !stale.finished) await closeOutLocal(stale);

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
  // Read-modify-write of the mirror, serialised: two taps whose storage
  // round-trips overlap would otherwise each read the old set list and the
  // second write would drop the first's set.
  const ok = await serial(async () => {
    const local = await readLocal();
    if (!local || local.id !== sessionId) return false;

    // Replace-or-append, keyed the same way the database is, so a repeated call
    // for the same set can never grow the mirror unboundedly.
    const i = local.sets.findIndex(
      (s) => s.item_position === entry.item_position && s.set_no === entry.set_no,
    );
    if (i >= 0) local.sets[i] = entry;
    else local.sets.push(entry);
    await writeLocal(local);
    return true;
  });
  if (!ok) return;

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

  // Enqueue BEFORE marking the mirror finished. The other order has a fatal
  // window: a kill between the two leaves `finished: true` on disk with no
  // finish op queued, so reconcile's `!local.finished` guard skips it forever,
  // the row stays 'active', and every set that DID flush is excluded from all
  // progress aggregates (they filter status = 'completed'). The training would
  // be on the server and invisible.
  await enqueue({
    kind: "finish",
    session_id: sessionId,
    status,
    completed_at: new Date().toISOString(),
  });

  if (status === "completed") {
    const minutes = Math.max(1, Math.round((Date.now() - local.started_at_ms) / 60000));
    await enqueueActivity(local, minutes, false);
  }

  local.finished = true;
  await writeLocal(local);

  await flushQueue();
  await writeLocal(null); // the mirror's job is done; the queue owns delivery now
}

/**
 * The streak's activity_log row, as a queued op.
 *
 * Deliberately not `logActivity()`: that writes straight to Supabase with no
 * persistence and no retry, so finishing a workout offline — the exact case
 * this module exists for — would durably record the session and its sets while
 * silently losing the single row the streak reads.
 *
 * `client_event_id` is stamped HERE, once, so every retry of this op carries
 * the same id and 0012's unique (user_id, client_event_id) turns a replay into
 * a no-op. activity_log is append-only; a duplicate could not be cleaned up.
 */
function enqueueActivity(local: LocalSession, minutes: number, recovered: boolean): Promise<void> {
  return enqueue({
    kind: "activity",
    row: {
      activity_type: "workout",
      ref_id: local.source_ref_id,
      program_id: local.program_id,
      client_event_id: uuidv4(),
      meta: {
        session_id: local.id,
        source: local.source,
        minutes,
        sets: local.sets.length,
        ...(recovered ? { recovered: true } : {}),
      },
    },
  });
}

/**
 * The session in progress, if the user left the player without finishing it —
 * the read behind the workout tab's resume strip (docs/specs/workout.md v3).
 *
 * Read-only: it never mutates the mirror or the queue. Note what it can and
 * cannot see — `reconcile()` runs at launch and closes out + clears any
 * unfinished mirror, so this returns null after an app kill (that session was
 * already banked). What it does catch is the live case the strip is for: the
 * player was left mid-workout and the app is still running.
 */
export async function getInterruptedSession(): Promise<LocalSession | null> {
  // Never read across the launch clean-up. Without this the read races
  // `reconcile()` (child effects run before the root layout's), so deep-linking
  // straight into the workout tab could surface a strip for a session that is
  // being closed out in the same tick — one tap and the user would redo a
  // workout the app had already banked.
  if (reconciling) await reconciling;
  const local = await readLocal();
  return local && !local.finished ? local : null;
}

/**
 * Queue the close-out of an unfinished session. Shared by `reconcile` (launch)
 * and `startSession` (a new session taking the mirror) so the rules below exist
 * in exactly one place.
 *
 * Enqueues only — the caller owns what happens to the mirror afterwards.
 */
async function closeOutLocal(local: LocalSession): Promise<void> {
  const trained = local.sets.length > 0;
  await enqueue({
    kind: "finish",
    session_id: local.id,
    status: trained ? "completed" : "abandoned",
    completed_at: new Date().toISOString(),
  });
  if (trained && local.ist_date === istToday()) {
    const minutes = Math.max(1, Math.round((Date.now() - local.started_at_ms) / 60000));
    await enqueueActivity(local, minutes, true);
  }
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
export function reconcile(): Promise<void> {
  reconciling = runReconcile();
  return reconciling;
}

/** The in-flight launch reconcile — see `getInterruptedSession`. Stays resolved
 *  afterwards, so later readers await an already-settled promise. */
let reconciling: Promise<void> | null = null;

async function runReconcile(): Promise<void> {
  const local = await readLocal();

  if (local && !local.finished) {
    await closeOutLocal(local);
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
