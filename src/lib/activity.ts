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
import type { ActivityType } from "../types/db";

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
