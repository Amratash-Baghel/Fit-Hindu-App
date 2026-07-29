/**
 * Onboarding v2 — the question set as DATA, plus local persistence.
 *
 * Spec: docs/specs/onboarding-questionnaire.md:19-39 (11 steps, Leap/F&B-style).
 * The questionnaire runs BEFORE sign-in (owner decision 2026-07-15: auth comes
 * after the plan-ready moment), so answers live in AsyncStorage until a session
 * exists and src/lib/auth flushes them to profiles + questionnaire_responses.
 * That also satisfies the spec's two hard states (:56-58): resume at the last
 * answered question, and retain answers when a submit fails.
 *
 * Every option's `value` is an enum member from migration 0001 — the vocabulary
 * is the database's, not this file's.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StringKey } from "./i18n";
import type {
  AgeBand, BodyArea, DietType, Goal, LanguageMode, Level, WorkoutMode,
} from "../types/db";

const KEY = "fithindu.onboarding.v2";

/** Version stamped onto questionnaire_responses.answers so a future re-take is comparable. */
export const QUESTIONNAIRE_VERSION = 2;

export interface Answers {
  language_mode: LanguageMode;
  goal?: Goal;
  /** Multi-select and skippable, so [] means "skipped or none" — never undefined. */
  body_focus: BodyArea[];
  level?: Level;
  days_per_week?: 3 | 5 | 7;
  age_band?: AgeBand;
  /** The 18+ gate (spec :30). Set only by picking the under-18 option. */
  under_18?: boolean;
  diet_type?: DietType;
  /** "later" = the explicit "decide later" choice; undefined = unanswered. Both map to null in the DB (workout_mode has no such member, by design). */
  workout_mode_pref?: WorkoutMode | "later";
  /** null = explicitly skipped; undefined = unanswered. Never required (standing rule). */
  deity_id?: string | null;
  /** DPDP. Starts false and must be ticked by hand (spec :35-37). */
  consent: boolean;
}

export const emptyAnswers: Answers = {
  language_mode: "english",
  body_focus: [],
  consent: false,
};

interface Opt {
  value: string;
  k: StringKey;
}

export type StepId =
  | "language" | "goal" | "body_focus" | "level" | "days_per_week"
  | "age_band" | "diet_type" | "workout_mode" | "deity" | "consent" | "ready";

interface BaseStep {
  id: StepId;
  /** The question heading. */
  qk: StringKey;
}

/**
 * A one-of question. `set`/`get` do the narrowing in one place, right beside the
 * options list that guarantees the value is a member of that enum.
 */
export interface SingleStep extends BaseStep {
  kind: "single";
  options: readonly Opt[];
  set: (a: Answers, v: string) => Answers;
  get: (a: Answers) => string | undefined;
  /** Skippable steps let Continue through with no selection. */
  optional?: boolean;
}

export interface MultiStep extends BaseStep {
  kind: "multi";
  options: readonly Opt[];
  optional?: boolean;
}

export type Step =
  | SingleStep
  | MultiStep
  | ({ kind: "deity" } & BaseStep)
  | ({ kind: "consent" } & BaseStep)
  | ({ kind: "ready" } & BaseStep);

export const STEPS: readonly Step[] = [
  // 1 — ALWAYS first, before anything else renders (standing rule + spec :19).
  {
    id: "language",
    kind: "single",
    qk: "q_language",
    options: [
      { value: "hindi", k: "lang_hindi" },
      { value: "english", k: "lang_english" },
      { value: "mixed", k: "lang_mixed" },
    ],
    set: (a, v) => ({ ...a, language_mode: v as LanguageMode }),
    get: (a) => a.language_mode,
  },
  // 2
  {
    id: "goal",
    kind: "single",
    qk: "q_goal",
    options: [
      { value: "weight_gain", k: "goal_weight_gain" },
      { value: "strength", k: "goal_strength" },
      { value: "weight_loss", k: "goal_weight_loss" },
      { value: "healthy_routine", k: "goal_healthy_routine" },
    ],
    set: (a, v) => ({ ...a, goal: v as Goal }),
    get: (a) => a.goal,
  },
  // 3 — multi-select, skippable (spec :25-26).
  {
    id: "body_focus",
    kind: "multi",
    qk: "q_body_focus",
    optional: true,
    options: [
      { value: "full_body", k: "area_full_body" },
      { value: "chest", k: "area_chest" },
      { value: "back", k: "area_back" },
      { value: "shoulders", k: "area_shoulders" },
      { value: "arms", k: "area_arms" },
      { value: "core", k: "area_core" },
      { value: "legs", k: "area_legs" },
    ],
  },
  // 4
  {
    id: "level",
    kind: "single",
    qk: "q_level",
    options: [
      { value: "beginner", k: "level_beginner" },
      { value: "intermediate", k: "level_intermediate" },
      { value: "advanced", k: "level_advanced" },
    ],
    set: (a, v) => ({ ...a, level: v as Level }),
    get: (a) => a.level,
  },
  // 5 — drives program_days density (spec :28-29).
  {
    id: "days_per_week",
    kind: "single",
    qk: "q_days",
    options: [
      { value: "3", k: "days_3" },
      { value: "5", k: "days_5" },
      { value: "7", k: "days_7" },
    ],
    set: (a, v) => ({ ...a, days_per_week: Number(v) as 3 | 5 | 7 }),
    get: (a) => (a.days_per_week ? String(a.days_per_week) : undefined),
  },
  // 6 — the 18+ gate. under_18 is an answer, not an enum member: picking it
  // blocks the flow rather than writing to profiles.age_band.
  {
    id: "age_band",
    kind: "single",
    qk: "q_age",
    options: [
      { value: "under_18", k: "age_under_18" },
      { value: "18_25", k: "age_18_25" },
      { value: "26_35", k: "age_26_35" },
      { value: "36_50", k: "age_36_50" },
      { value: "50_plus", k: "age_50_plus" },
    ],
    set: (a, v) =>
      v === "under_18"
        ? { ...a, under_18: true, age_band: undefined }
        : { ...a, under_18: false, age_band: v as AgeBand },
    get: (a) => (a.under_18 ? "under_18" : a.age_band),
  },
  // 7
  {
    id: "diet_type",
    kind: "single",
    qk: "q_diet",
    options: [
      { value: "veg", k: "diet_veg" },
      { value: "sattvic", k: "diet_sattvic" },
      { value: "egg", k: "diet_egg" },
      { value: "nonveg", k: "diet_nonveg" },
    ],
    set: (a, v) => ({ ...a, diet_type: v as DietType }),
    get: (a) => a.diet_type,
  },
  // 8 — "decide later" is a real answer; it just has no enum member (spec :32).
  {
    id: "workout_mode",
    kind: "single",
    qk: "q_workout_mode",
    options: [
      { value: "home", k: "mode_home_full" },
      { value: "gym", k: "mode_gym" },
      { value: "later", k: "mode_later" },
    ],
    set: (a, v) => ({ ...a, workout_mode_pref: v as WorkoutMode | "later" }),
    get: (a) => a.workout_mode_pref,
  },
  // 9 — optional, from the deities table; never required (standing rule).
  { id: "deity", kind: "deity", qk: "q_deity" },
  // 10 — DPDP consent.
  { id: "consent", kind: "consent", qk: "q_consent" },
  // 11 — the gift moment.
  { id: "ready", kind: "ready", qk: "ready_title" },
];

/** Can the user leave this step? Optional steps always; others need an answer. */
export function canAdvance(step: Step, a: Answers): boolean {
  switch (step.kind) {
    case "single":
      return step.optional === true || step.get(a) !== undefined;
    case "multi":
      return step.optional === true || a.body_focus.length > 0;
    case "deity":
      return a.deity_id !== undefined; // null (skipped) counts as answered
    case "consent":
      return a.consent;
    case "ready":
      return true;
  }
}

// ---------- local persistence (pre-auth) ----------

interface Saved {
  answers: Answers;
  step: number;
}

/** Resume point for a half-finished questionnaire (spec :58). */
export async function loadProgress(): Promise<Saved | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Saved>;
    if (!p.answers) return null;
    // Merge over emptyAnswers so a payload written by an older build (missing a
    // key added since) resumes instead of crashing on an undefined field.
    return {
      answers: { ...emptyAnswers, ...p.answers },
      step: Math.min(Math.max(p.step ?? 0, 0), STEPS.length - 1),
    };
  } catch {
    return null; // unreadable/corrupt — start clean rather than block the app
  }
}

export async function saveProgress(answers: Answers, step: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ answers, step } satisfies Saved));
  } catch {
    // Best-effort: losing the resume point is survivable, blocking the UI is not.
  }
}

export async function clearProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * A tombstone that outlives the answers. flushOnboarding() deletes the local
 * answers once they are safely in the database; without this marker the device
 * would look brand-new the moment the user signed out, and re-ask all 11
 * questions someone had already answered.
 */
const DONE_KEY = "fithindu.onboarded";

export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(DONE_KEY, "1");
  } catch {
    /* best-effort */
  }
}

/** Has the user finished the questionnaire? Drives the cold-start route. */
export async function hasOnboarded(): Promise<boolean> {
  try {
    const [flag, p] = await Promise.all([AsyncStorage.getItem(DONE_KEY), loadProgress()]);
    // Either the answers are still here unflushed (guest), or they were flushed
    // and left the marker behind (signed in, possibly since signed out).
    return flag === "1" || p?.answers.consent === true;
  } catch {
    return false;
  }
}

/**
 * Consented answers still on disk that have NEVER been flushed — the cold-start
 * signal to resume the plan-ready ceremony (slice 5).
 *
 * The marker check is the load-bearing half. `flushOnboarding` ends with
 * `markOnboarded()` then `clearProgress()`, two non-atomic AsyncStorage writes;
 * a kill between them (routine on the low-end Android this app targets) leaves
 * the marker set AND the answers behind. Testing the answers alone would then
 * re-run a flush that already succeeded, and `questionnaire_responses` is
 * deliberately append-only with no unique key (migration 0002) — so it would
 * write a second response row for a questionnaire taken once.
 *
 * The marker also records "the user has settled this", which is what lets
 * someone walk away from a permanently failing write instead of being steered
 * back into the ceremony on every cold start.
 */
export async function isFlushPending(): Promise<boolean> {
  try {
    const [flag, p] = await Promise.all([AsyncStorage.getItem(DONE_KEY), loadProgress()]);
    return flag !== "1" && p?.answers.consent === true;
  } catch {
    return false;
  }
}

// ---------- DB shapes ----------

/**
 * The typed-column half of the write. "later" and a skipped deity both become
 * null — the columns are nullable for exactly these two cases.
 */
export function answersToProfile(a: Answers) {
  return {
    language_mode: a.language_mode,
    goal: a.goal ?? null,
    body_focus: a.body_focus,
    level: a.level ?? null,
    days_per_week: a.days_per_week ?? null,
    age_band: a.age_band ?? null,
    diet_type: a.diet_type ?? null,
    workout_mode_pref: a.workout_mode_pref === "later" ? null : a.workout_mode_pref ?? null,
    deity_id: a.deity_id ?? null,
    consent_at: a.consent ? new Date().toISOString() : null,
  };
}
