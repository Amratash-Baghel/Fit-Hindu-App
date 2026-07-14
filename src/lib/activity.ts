/**
 * Activity logging — every completed activity writes one append-only row
 * (docs/specs/tracking-streaks.md). Until app auth ships, there is no
 * session, so this no-ops silently; the call sites are already correct and
 * light up the moment auth lands.
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
    if (!user) return false; // no auth yet — tracked once auth ships

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
