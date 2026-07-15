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
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false; // guest — nothing to attribute the activity to

    const { error } = await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: activityType,
      ref_id: refId ?? null,
      meta,
    });
    return !error;
  } catch {
    return false;
  }
}
