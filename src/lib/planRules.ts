/**
 * The plan engine's decision logic — pure, no I/O.
 *
 * Split from plan.ts so the rule semantics can be exercised directly (they are
 * the keystone: every user's programme hangs off them) without a database, a
 * session, or a React tree.
 *
 * Contract (docs/specs/onboarding-questionnaire.md:47-52):
 *   rules are evaluated by `priority` ASCENDING, the FIRST match wins, and an
 *   absent condition key means "any".
 */
import type { AssignmentRule } from "../types/db";
import type { Answers } from "./onboarding";

/**
 * The answer shape a rule is matched against.
 * A type alias rather than an interface on purpose: ruleMatches looks keys up
 * dynamically, and only an alias carries the implicit index signature that
 * makes that lookup type-safe.
 */
export type Facts = {
  goal?: string;
  age_band?: string;
  diet_type?: string;
  workout_mode?: string;
  level?: string;
  days_per_week?: number;
  body_focus: string[];
};

export function factsOf(a: Answers): Facts {
  return {
    goal: a.goal,
    age_band: a.age_band,
    diet_type: a.diet_type,
    level: a.level,
    days_per_week: a.days_per_week,
    body_focus: a.body_focus,
    // "later" is not a workout_mode — it is the ABSENCE of a preference, so it
    // must not match a rule that demands home or gym.
    workout_mode: a.workout_mode_pref === "later" ? undefined : a.workout_mode_pref,
  };
}

/**
 * Does every condition the rule states hold?
 * An empty conditions object ({}) matches everything — that is how the content
 * team authors a catch-all default, and why priority order matters.
 */
export function ruleMatches(conditions: AssignmentRule["conditions"], f: Facts): boolean {
  return Object.entries(conditions).every(([key, want]) => {
    if (want === undefined || want === null) return true; // stated but empty = "any"
    // body_focus is the one non-equality key: the profile holds an array, the
    // rule names one area, and it matches when the user's focus includes it.
    if (key === "body_focus") return f.body_focus.includes(String(want));
    const has = (f as Record<string, unknown>)[key];
    if (has === undefined || has === null) return false; // rule demands it; user never answered
    return String(has) === String(want);
  });
}

/**
 * First match by priority, or null when the content team has no programme for
 * this combination yet (a real, survivable state — see assignPlan).
 * Sorts defensively rather than trusting the caller's ordering.
 */
export function pickProgramId(rules: readonly AssignmentRule[], a: Answers): string | null {
  const facts = factsOf(a);
  return (
    [...rules]
      .sort((x, y) => x.priority - y.priority)
      .find((r) => ruleMatches(r.conditions ?? {}, facts))?.program_id ?? null
  );
}
