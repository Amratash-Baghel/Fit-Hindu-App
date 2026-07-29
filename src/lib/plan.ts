/**
 * Plan engine — questionnaire answers → an assigned program.
 *
 * Rule-based ONLY (standing rule: no AI generation of health advice). The
 * mapping itself is team-authored in the admin panel as `assignment_rules`
 * rows; this file only fetches and applies them. Adding a program, or changing
 * who gets it, is content work — never a release.
 *
 * The decision logic lives in ./planRules (pure, tested separately); this file
 * is the I/O shell around it.
 */
import { supabase } from "./supabase";
import { pickProgramId } from "./planRules";
import type { AssignmentRule, UserPlan } from "../types/db";
import type { Answers } from "./onboarding";

/**
 * The two real awaits `assignPlan` performs, reported to a caller that wants to
 * show progress (the plan-ready ceremony, slice 5). These are events, not
 * timers: "matching" fires as the rules query goes out, "assembling" only once a
 * program actually matched and the plan row is about to be written. A caller can
 * therefore never paint a stage the data has not reached.
 */
export type PlanStage = "matching" | "assembling";

/** The winning program for these answers, or null if no rule matches. */
export async function resolveProgramId(a: Answers): Promise<string | null> {
  const { data, error } = await supabase
    .from("assignment_rules")
    .select("id, program_id, priority, conditions, status")
    .eq("status", "published")
    .order("priority", { ascending: true });
  if (error) throw error;
  return pickProgramId((data ?? []) as unknown as AssignmentRule[], a);
}

/**
 * Assign the plan for these answers. Requires a session (user_plans is own-row).
 *
 * Returns null when no rule matched — a real, survivable state: the content
 * team simply has no program for this combination yet. The app still works
 * (library, meditation, jap all stand alone); the user just has no day-by-day
 * plan. Never throw a user out of onboarding over it.
 */
export async function assignPlan(
  a: Answers,
  onStage?: (s: PlanStage) => void,
): Promise<UserPlan | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  onStage?.("matching");
  const programId = await resolveProgramId(a);
  if (!programId) return null;

  onStage?.("assembling");

  // One active plan per user is enforced by user_plans_one_active_idx, so a
  // re-take must supersede the old plan rather than insert a second one.
  const { data: existing, error: readErr } = await supabase
    .from("user_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (readErr) throw readErr;

  if (existing) {
    // Already on this program — return the real row, not a partial one, so
    // callers can trust started_on/status.
    if (existing.program_id === programId) return existing as unknown as UserPlan;
    const { error: supErr } = await supabase
      .from("user_plans")
      .update({ status: "abandoned" })
      .eq("id", existing.id);
    if (supErr) throw supErr;
  }

  const { data: created, error: insErr } = await supabase
    .from("user_plans")
    .insert({ user_id: user.id, program_id: programId, status: "active" })
    .select()
    .single();
  if (insErr) throw insErr;
  return created as unknown as UserPlan;
}
