/**
 * Onboarding persistence. Writes the typed answers onto the user's profile and
 * appends a versioned questionnaire_responses row. Like activity logging, this
 * no-ops silently until app auth ships — the call site stays correct and lights
 * up the moment a session exists.
 */
import { supabase } from "./supabase";
import type { AgeBand, BodyArea, DietType, Goal, Level, WorkoutMode } from "../types/db";

export interface OnboardingAnswers {
  goal: Goal | null;
  body_focus: BodyArea[];
  level: Level | null;
  days_per_week: number | null;
  age_band: AgeBand | null;
  diet_type: DietType | null;
  workout_mode_pref: WorkoutMode | null;
  deity_id: string | null;
}

export async function saveOnboarding(answers: OnboardingAnswers): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false; // no auth yet — persists once auth ships

    const now = new Date().toISOString();
    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        goal: answers.goal,
        body_focus: answers.body_focus,
        days_per_week: answers.days_per_week,
        age_band: answers.age_band,
        diet_type: answers.diet_type,
        workout_mode_pref: answers.workout_mode_pref,
        deity_id: answers.deity_id,
        consent_at: now,
        updated_at: now,
      })
      .eq("id", user.id);
    if (pErr) return false;

    const { error: qErr } = await supabase.from("questionnaire_responses").insert({
      user_id: user.id,
      version: 2,
      answers: answers as unknown as Record<string, unknown>,
    });
    return !qErr;
  } catch {
    return false;
  }
}
