/**
 * Activity logging — every completed activity writes one append-only row
 * (docs/specs/tracking-streaks.md).
 *
 * Guests have no session (sign-in is optional and comes after onboarding), so
 * for them this no-ops silently rather than throwing: a signed-out user can
 * still work out, they just bank no streak. Signing in starts the record from
 * that moment.
 */
import { supabase } from "./supabase";
import { enqueueActivity, flushActivityQueue } from "./activityQueue";
import type { ActivityType } from "../types/db";

/**
 * The plan the user is currently enrolled in, if any — mirrors
 * `session.ts`'s own `activePlan()` (not exported from there, and not worth
 * coupling this module to it for one field). `null` is a normal, common
 * result (most activity happens with no assigned plan) and is written as-is:
 * `program_id` is nullable by design (migration 0012).
 */
async function activeProgramId(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("user_plans")
      .select("program_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    return data?.program_id ?? null;
  } catch {
    return null;
  }
}

export async function logActivity(
  activityType: ActivityType,
  meta: Record<string, unknown> = {},
  refId?: string,
  /**
   * When set, the row carries this `client_event_id` and the write becomes an
   * idempotent upsert (0012's unique `(user_id, client_event_id)`). Pass it when
   * the SAME logical activity may be written from two paths — e.g. a sleep run
   * logged live on stop AND recovered by the launch reconcile — so a replay
   * collapses to one row in this append-only table. Omit for a plain insert.
   */
  clientEventId?: string,
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false; // guest — nothing to attribute the activity to

    const row = {
      user_id: user.id,
      activity_type: activityType,
      ref_id: refId ?? null,
      // Same field session.ts's queued workout rows already carry — every
      // OTHER activity type wrote it as null forever (review finding
      // 2026-08-17), which is silent only because nothing reads it yet.
      program_id: await activeProgramId(user.id),
      meta,
    };

    if (clientEventId) {
      const { error } = await supabase
        .from("activity_log")
        .upsert(
          { ...row, client_event_id: clientEventId },
          { onConflict: "user_id,client_event_id", ignoreDuplicates: true },
        );
      return !error;
    }

    const { error } = await supabase.from("activity_log").insert(row);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Durable variant for the four completions that are NOT part of a workout
 * session (meditation, jap, sleep, "kept today's plan") — they deserve the
 * same guarantee session.ts gives workouts: a write that fails offline is
 * queued for delivery, never dropped. `clientEventId` is REQUIRED (not
 * optional, unlike `logActivity`) because a queued retry must be able to
 * upsert without risking a duplicate row — generate one per completion with
 * `uuidv4()` (src/lib/ids.ts), or `deterministicUuid(seed)` for an action
 * that should collapse to one row per some natural key (e.g. per IST day).
 *
 * Returns the SAME shape as `logActivity` — `ok` is only true when the write
 * landed just now. A queued write still returns `false`: the caller's reward
 * screen already treats `false` as "don't show a number this time" (see
 * call sites), which is the correct, honest read — the points are real and
 * will land, but not fast enough to diff against right now.
 */
export async function logActivityDurable(
  activityType: ActivityType,
  meta: Record<string, unknown>,
  refId: string | undefined,
  clientEventId: string,
): Promise<boolean> {
  const ok = await logActivity(activityType, meta, refId, clientEventId);
  if (ok) return true;

  // logActivity() already returned false for a guest (nothing to attribute
  // the write to) — re-checking here, rather than queueing blind, is what
  // stops a signed-out device from silently building up rows for whichever
  // account happens to sign in next.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  await enqueueActivity({
    user_id: user.id,
    activity_type: activityType,
    ref_id: refId ?? null,
    program_id: await activeProgramId(user.id),
    client_event_id: clientEventId,
    meta,
  });
  void flushActivityQueue(); // try immediately in case the failure was transient
  return false;
}
