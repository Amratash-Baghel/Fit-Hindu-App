/**
 * Database types — hand-written v1 mirror of supabase/migrations 0001–0012.
 * Replace with `supabase gen types typescript` output once the Supabase
 * project is created and linked; keep the enum unions as the app-wide
 * vocabulary either way.
 */

// ---------- enums (mirror 0001) ----------
export type LanguageMode = "hindi" | "english" | "mixed";
export type Goal = "weight_gain" | "strength" | "weight_loss" | "healthy_routine";
export type AgeBand = "18_25" | "26_35" | "36_50" | "50_plus";
export type DietType = "veg" | "sattvic" | "egg" | "nonveg";
export type WorkoutMode = "home" | "gym";
export type BodyArea =
  | "chest" | "back" | "shoulders" | "arms" | "core" | "legs" | "full_body";
export type Level = "beginner" | "intermediate" | "advanced";
export type SoundKind = "chant" | "ambient" | "sleep" | "jap_loop";
export type MealTime = "breakfast" | "lunch" | "snack" | "dinner";
export type ActivityType =
  | "workout" | "meal" | "meditation" | "jap" | "sleep_sound" | "devotional";
export type ContentStatus = "draft" | "published" | "archived";
export type MediaKind = "video" | "audio" | "image";
export type PlanStatus = "active" | "completed" | "abandoned";
export type DevotionalKind = "shloka" | "quote" | "greeting";

// ---------- enums (mirror 0011) ----------
export type SessionStatus = "active" | "completed" | "abandoned";
/** The three sources loadSession() supports (src/lib/content.ts). */
export type SessionSourceKind = "template" | "custom" | "exercise";
export type DevicePlatform = "android" | "ios" | "web";

// ---------- identity ----------
export interface Profile {
  id: string;
  display_name: string | null;
  language_mode: LanguageMode;
  goal: Goal | null;
  level: Level | null;
  /** Empty array = skipped or nothing chosen; never null (0010). */
  body_focus: BodyArea[];
  days_per_week: 3 | 5 | 7 | null;
  age_band: AgeBand | null;
  diet_type: DietType | null;
  workout_mode_pref: WorkoutMode | null;
  deity_id: string | null;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireResponse {
  id: string;
  user_id: string;
  version: number;
  answers: Record<string, unknown>;
  created_at: string;
}

// ---------- media & content atoms ----------
export interface Media {
  id: string;
  kind: MediaKind;
  provider: string;
  external_id: string;
  playback_url: string;
  download_url: string | null;
  duration_seconds: number | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Deity {
  id: string;
  slug: string;
  name_hi: string;
  name_en: string;
  icon_media_id: string | null;
  /** 0=Sun .. 6=Sat — deity-of-the-day fallback when daily_devotional has no row */
  weekdays: number[];
  sort: number;
  status: ContentStatus;
}

export interface Exercise {
  id: string;
  slug: string;
  name_hi: string;
  name_en: string;
  instructions_hi: string | null;
  instructions_en: string | null;
  safety_note_hi: string | null;
  safety_note_en: string | null;
  video_media_id: string | null;
  thumb_media_id: string | null;
  body_areas: BodyArea[];
  modes: WorkoutMode[];
  level: Level;
  default_sets: number | null;
  default_reps: number | null;
  default_duration_seconds: number | null;
  default_rest_seconds: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface Sound {
  id: string;
  name_hi: string;
  name_en: string;
  kind: SoundKind;
  deity_id: string | null;
  /** null = placeholder awaiting upload (migration 0008) */
  audio_media_id: string | null;
  duration_seconds: number | null;
  status: ContentStatus;
  created_at: string;
}

export interface Mantra {
  id: string;
  deity_id: string;
  text_devanagari: string;
  transliteration: string | null;
  meaning_hi: string | null;
  meaning_en: string | null;
  chant_audio_media_id: string | null;
  status: ContentStatus;
}

export interface MealItem {
  text_hi: string;
  text_en: string;
  veg: boolean;
}

export interface Meal {
  id: string;
  name_hi: string;
  name_en: string;
  items: MealItem[];
  kcal: number | null;
  meal_time: MealTime;
  diet_types: DietType[];
  status: ContentStatus;
}

export interface DevotionalItem {
  id: string;
  kind: DevotionalKind;
  deity_id: string | null;
  text_hi: string;
  text_en: string | null;
  source: string | null;
  status: ContentStatus;
}

// ---------- templates ----------
export interface WorkoutTemplate {
  id: string;
  name_hi: string;
  name_en: string;
  mode: WorkoutMode;
  level: Level;
  est_minutes: number | null;
  status: ContentStatus;
  created_at: string;
}

export interface WorkoutTemplateExercise {
  template_id: string;
  position: number;
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
}

export interface DietTemplate {
  id: string;
  name_hi: string;
  name_en: string;
  diet_types: DietType[];
  total_kcal: number | null;
  status: ContentStatus;
  created_at: string;
}

export interface DietTemplateMeal {
  template_id: string;
  meal_time: MealTime;
  position: number;
  meal_id: string;
}

// ---------- programs & assignment ----------
export interface Program {
  id: string;
  slug: string;
  name_hi: string;
  name_en: string;
  description_hi: string | null;
  description_en: string | null;
  duration_days: number;
  status: ContentStatus;
  created_at: string;
}

export interface ProgramDay {
  program_id: string;
  day_number: number;
  workout_template_id: string | null;
  diet_template_id: string | null;
  is_rest_day: boolean;
}

/**
 * conditions: absent key = "any". e.g. {goal:"strength", workout_mode:"home"}
 * Every present key must match for the rule to fire; rules are evaluated by
 * `priority` ascending and the first match wins (see src/lib/plan.ts).
 * `body_focus` is the one non-equality key: the profile holds an array, so the
 * rule names ONE area and matches when the user's focus includes it.
 */
export interface AssignmentRule {
  id: string;
  program_id: string;
  priority: number;
  conditions: Partial<{
    goal: Goal;
    age_band: AgeBand;
    diet_type: DietType;
    workout_mode: WorkoutMode;
    level: Level;
    body_focus: BodyArea;
    days_per_week: 3 | 5 | 7;
  }>;
  status: ContentStatus;
}

// ---------- user state & activity ----------
export interface UserPlan {
  id: string;
  user_id: string;
  program_id: string;
  started_on: string; // date (IST)
  status: PlanStatus;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  ref_id: string | null;
  ist_date: string; // date
  occurred_at: string;
  meta: Record<string, unknown>;
  /**
   * Null = not attributable to a program, which is a first-class state (0012):
   * jap/meditation/sleep are standalone, and some users match no rule at all.
   */
  program_id: string | null;
  /** Device-generated; unique per (user_id, client_event_id). Replaying the
   *  same event — guest merge, offline flush — is an `on conflict do nothing`. */
  client_event_id: string;
}

/** row of the daily_activity view — powers home-screen ticks */
export interface DailyActivity {
  user_id: string;
  ist_date: string;
  types: ActivityType[];
  entries: number;
}

// ---------- my workouts (migration 0009, workout spec v2) ----------
export interface UserWorkout {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserWorkoutItem {
  workout_id: string;
  position: number;
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
}

// ---------- devotional calendar ----------
export interface Festival {
  id: string;
  name_hi: string;
  name_en: string;
  on_date: string;
  deity_id: string | null;
  greeting_item_id: string | null;
  status: ContentStatus;
}

export interface DailyDevotional {
  on_date: string;
  deity_id: string;
  shloka_item_id: string | null;
  mantra_id: string | null;
}

// ---------- workout sessions (migration 0011) ----------
export interface WorkoutSession {
  /** Client-generated, so an offline device can log sets against a session the
   *  server has not seen yet, and a retry upserts instead of duplicating. */
  id: string;
  user_id: string;
  program_id: string | null;
  plan_id: string | null;
  source: SessionSourceKind;
  source_ref_id: string | null;
  status: SessionStatus;
  ist_date: string;
  started_at: string;
  completed_at: string | null;
}

export interface ExerciseLog {
  session_id: string;
  /** 0-based index within the session. Part of the key instead of exercise_id,
   *  because a circuit may repeat one exercise at several positions. */
  item_position: number;
  set_no: number; // 1-based
  exercise_id: string;
  reps: number | null;
  duration_seconds: number | null;
  weight_kg: number | null;
  skipped: boolean;
  completed_at: string;
}

/** row of the session_summary view — aggregates stay server-side */
export interface SessionSummary {
  session_id: string;
  user_id: string;
  program_id: string | null;
  ist_date: string;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  sets_done: number;
  exercises_done: number;
  minutes: number;
}

// ---------- push (migration 0011) ----------
export interface PushToken {
  user_id: string;
  /** Upsert key with user_id, so a reinstall replaces rather than duplicates. */
  device_id: string;
  expo_push_token: string;
  platform: DevicePlatform;
  program_id: string | null;
  last_seen_at: string;
  created_at: string;
}

/** Server-side, not local: the Edge Function cannot honour a preference it
 *  cannot read, and these must survive a reinstall. */
export interface NotificationPrefs {
  user_id: string;
  enabled: boolean;
  daily_reminder: boolean;
  /** Wall-clock "HH:MM:SS" in Asia/Kolkata; the sender converts. */
  reminder_time: string;
  streak_at_risk: boolean;
  plan_ready: boolean;
  updated_at: string;
}

// ---------- streak (migration 0012) ----------
/** Return of the streak_state(uid) RPC — one round-trip for the whole card.
 *  User-level, not program-scoped (owner decision 2026-07-28). */
export interface StreakState {
  current_streak: number;
  longest_streak: number;
  /** Most recent day with any activity; null for a user with no history. */
  last_date: string | null;
  /** Completed yesterday, nothing today — what the evening nudge hooks into. */
  at_risk: boolean;
  /** Forgiveness days spent inside the current run; 0 on a clean streak.
   *  Lets the UI say a freeze rescued the sankalp instead of silently hiding
   *  the missed day. */
  freezes_used: number;
}
