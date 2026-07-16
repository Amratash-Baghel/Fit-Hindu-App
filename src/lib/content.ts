/**
 * Content queries — typed reads over the published content tables.
 * RLS returns only status='published' rows to anon users, so the app never
 * has to filter status itself (we still pass it for index use + clarity).
 */
import { supabase } from "./supabase";
import type { BodyArea, Exercise, Media, Sound, WorkoutMode } from "../types/db";

/** An exercise joined with its (optional) video + thumbnail media rows. */
export type ExerciseWithMedia = Exercise & {
  video: Pick<Media, "playback_url" | "download_url"> | null;
  thumb: Pick<Media, "playback_url"> | null;
};

const SELECT = `
  id, slug, name_hi, name_en, instructions_hi, instructions_en,
  safety_note_hi, safety_note_en, video_media_id, thumb_media_id,
  body_areas, modes, level,
  default_sets, default_reps, default_duration_seconds, default_rest_seconds,
  status, created_at, updated_at,
  video:media!exercises_video_media_id_fkey ( playback_url, download_url ),
  thumb:media!exercises_thumb_media_id_fkey ( playback_url )
`;

/** Exercises for a workout mode (home / gym). */
export async function listExercisesByMode(mode: WorkoutMode): Promise<ExerciseWithMedia[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(SELECT)
    .eq("status", "published")
    .contains("modes", [mode])
    .order("name_en");
  if (error) throw error;
  return (data ?? []) as unknown as ExerciseWithMedia[];
}

/** Custom mode: every published exercise that trains the chosen body area. */
export async function listExercisesByArea(area: BodyArea): Promise<ExerciseWithMedia[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(SELECT)
    .eq("status", "published")
    .overlaps("body_areas", [area])
    .order("name_en");
  if (error) throw error;
  return (data ?? []) as unknown as ExerciseWithMedia[];
}

export async function getExercise(id: string): Promise<ExerciseWithMedia | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ExerciseWithMedia) ?? null;
}

/** A sound joined with its audio media row. */
export type SoundWithMedia = Sound & {
  audio: Pick<Media, "playback_url" | "download_url"> | null;
};

const SOUND_SELECT = `
  id, name_hi, name_en, kind, deity_id, audio_media_id, duration_seconds, status, created_at,
  audio:media!sounds_audio_media_id_fkey ( playback_url, download_url )
`;

/** Published sounds for the meditation flow (chants first, then ambient). */
export async function listMeditationSounds(): Promise<SoundWithMedia[]> {
  const { data, error } = await supabase
    .from("sounds")
    .select(SOUND_SELECT)
    .eq("status", "published")
    .in("kind", ["chant", "ambient"])
    .order("kind") // 'ambient' < 'chant' alphabetically — we re-sort below
    .order("name_en");
  if (error) throw error;
  const rows = (data ?? []) as unknown as SoundWithMedia[];
  return rows.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "chant" ? -1 : 1));
}

export async function getSound(id: string): Promise<SoundWithMedia | null> {
  const { data, error } = await supabase
    .from("sounds")
    .select(SOUND_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SoundWithMedia) ?? null;
}

/** A sleep sound + its deity label. `audio` null = placeholder awaiting upload. */
export type SleepSound = SoundWithMedia & {
  deity: { name_hi: string; name_en: string } | null;
};

/**
 * Published sleep sounds (docs/specs/sleep.md). Rows with no audio_media_id
 * are placeholders (migration 0008) and are returned as-is — the screen shows
 * them greyed rather than hiding them, so the content team can see what they
 * still owe an upload.
 */
export async function listSleepSounds(): Promise<SleepSound[]> {
  const { data, error } = await supabase
    .from("sounds")
    .select(
      `id, name_hi, name_en, kind, deity_id, audio_media_id, duration_seconds, status, created_at,
       audio:media!sounds_audio_media_id_fkey ( playback_url, download_url ),
       deity:deities!sounds_deity_id_fkey ( name_hi, name_en )`,
    )
    .eq("status", "published")
    .eq("kind", "sleep")
    .order("name_en");
  if (error) throw error;
  return (data ?? []) as unknown as SleepSound[];
}

// ---------- workout templates (composed in the admin panel) ----------

export interface WorkoutTemplateSummary {
  id: string;
  name_hi: string;
  name_en: string;
  mode: WorkoutMode;
  level: Exercise["level"];
  est_minutes: number | null;
  exercise_count: number;
}

/** Published composed workouts for a mode — the admin Compose area's output. */
export async function listWorkoutTemplates(mode: WorkoutMode): Promise<WorkoutTemplateSummary[]> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("id, name_hi, name_en, mode, level, est_minutes, items:workout_template_exercises(position)")
    .eq("status", "published")
    .eq("mode", mode)
    .order("name_en");
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    name_hi: t.name_hi,
    name_en: t.name_en,
    mode: t.mode,
    level: t.level,
    est_minutes: t.est_minutes,
    exercise_count: (t.items as unknown[] | null)?.length ?? 0,
  }));
}

export interface TemplateItem {
  position: number;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  exercise: ExerciseWithMedia;
}

export interface WorkoutTemplateFull extends WorkoutTemplateSummary {
  items: TemplateItem[];
}

export async function getWorkoutTemplate(id: string): Promise<WorkoutTemplateFull | null> {
  const [{ data: t, error: tErr }, { data: items, error: iErr }] = await Promise.all([
    supabase.from("workout_templates").select("id, name_hi, name_en, mode, level, est_minutes").eq("id", id).maybeSingle(),
    supabase
      .from("workout_template_exercises")
      .select(`position, sets, reps, duration_seconds, rest_seconds, exercise:exercises(${SELECT})`)
      .eq("template_id", id)
      .order("position"),
  ]);
  if (tErr) throw tErr;
  if (iErr) throw iErr;
  if (!t) return null;
  const list = (items ?? []) as unknown as TemplateItem[];
  return { ...(t as Omit<WorkoutTemplateFull, "items" | "exercise_count">), exercise_count: list.length, items: list };
}

/** Whole published library (builder picker). */
export async function listPublishedExercises(): Promise<ExerciseWithMedia[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(SELECT)
    .eq("status", "published")
    .order("name_en");
  if (error) throw error;
  return (data ?? []) as unknown as ExerciseWithMedia[];
}

// ---------- my workouts (user-composed; migration 0009) ----------

export interface UserWorkoutSummary {
  id: string;
  name: string;
  exercise_count: number;
  updated_at: string;
}

/** null = not signed in (pre-auth placeholder state). */
export async function listUserWorkouts(): Promise<UserWorkoutSummary[] | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_workouts")
    .select("id, name, updated_at, items:user_workout_items(position)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    updated_at: w.updated_at,
    exercise_count: (w.items as unknown[] | null)?.length ?? 0,
  }));
}

export interface UserWorkoutFull {
  id: string;
  name: string;
  items: TemplateItem[];
}

export async function getUserWorkout(id: string): Promise<UserWorkoutFull | null> {
  const [{ data: w, error: wErr }, { data: items, error: iErr }] = await Promise.all([
    supabase.from("user_workouts").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("user_workout_items")
      .select(`position, sets, reps, duration_seconds, rest_seconds, exercise:exercises(${SELECT})`)
      .eq("workout_id", id)
      .order("position"),
  ]);
  if (wErr) throw wErr;
  if (iErr) throw iErr;
  if (!w) return null;
  return { id: w.id, name: w.name, items: (items ?? []) as unknown as TemplateItem[] };
}

export interface SaveUserWorkoutInput {
  id?: string; // absent = create
  name: string;
  items: {
    exercise_id: string;
    sets: number | null;
    reps: number | null;
    duration_seconds: number | null;
    rest_seconds: number | null;
  }[];
}

/** Upsert a user workout; item positions are rewritten 1..n (ordering contract). */
export async function saveUserWorkout(input: SaveUserWorkoutInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("auth required");

  let workoutId = input.id;
  if (workoutId) {
    const { error } = await supabase
      .from("user_workouts")
      .update({ name: input.name, updated_at: new Date().toISOString() })
      .eq("id", workoutId);
    if (error) throw error;
    const { error: delErr } = await supabase.from("user_workout_items").delete().eq("workout_id", workoutId);
    if (delErr) throw delErr;
  } else {
    const { data, error } = await supabase
      .from("user_workouts")
      .insert({ user_id: user.id, name: input.name })
      .select("id")
      .single();
    if (error) throw error;
    workoutId = data.id;
  }

  if (input.items.length > 0) {
    const rows = input.items.map((it, i) => ({ workout_id: workoutId, position: i + 1, ...it }));
    const { error } = await supabase.from("user_workout_items").insert(rows);
    if (error) throw error;
  }
  return workoutId!;
}

export async function deleteUserWorkout(id: string): Promise<void> {
  const { error } = await supabase.from("user_workouts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- session loader (one player, three sources) ----------

export interface SessionSource {
  kind: "template" | "user_workout" | "single";
  refId: string;
  name_hi: string;
  name_en: string;
  items: TemplateItem[];
}

export async function loadSession(params: {
  template?: string;
  custom?: string;
  exercise?: string;
}): Promise<SessionSource | null> {
  if (params.template) {
    const t = await getWorkoutTemplate(params.template);
    if (!t) return null;
    return { kind: "template", refId: t.id, name_hi: t.name_hi, name_en: t.name_en, items: t.items };
  }
  if (params.custom) {
    const w = await getUserWorkout(params.custom);
    if (!w) return null;
    return { kind: "user_workout", refId: w.id, name_hi: w.name, name_en: w.name, items: w.items };
  }
  if (params.exercise) {
    const ex = await getExercise(params.exercise);
    if (!ex) return null;
    return {
      kind: "single",
      refId: ex.id,
      name_hi: ex.name_hi,
      name_en: ex.name_en,
      items: [{ position: 1, sets: null, reps: null, duration_seconds: null, rest_seconds: null, exercise: ex }],
    };
  }
  return null;
}

// ---------- devotional (home screen) ----------

function istDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function istWeekday(): number {
  const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export interface DevotionalToday {
  deity: { id: string; name_hi: string; name_en: string } | null;
  shloka: { text_hi: string; text_en: string | null; source: string | null } | null;
}

/**
 * Deity-of-the-day + today's shloka. Prefers the content team's scheduled
 * daily_devotional row; falls back to the weekday→deity mapping on the
 * deities table, then to any published shloka (deity-matched first).
 */
export async function getTodayDevotional(): Promise<DevotionalToday> {
  const today = istDateString();

  const { data: scheduled } = await supabase
    .from("daily_devotional")
    .select(
      `on_date,
       deity:deities!daily_devotional_deity_id_fkey ( id, name_hi, name_en ),
       shloka:devotional_items!daily_devotional_shloka_item_id_fkey ( text_hi, text_en, source )`,
    )
    .eq("on_date", today)
    .maybeSingle();

  let deity = (scheduled?.deity as unknown as DevotionalToday["deity"]) ?? null;
  let shloka = (scheduled?.shloka as unknown as DevotionalToday["shloka"]) ?? null;

  if (!deity) {
    const dow = istWeekday();
    const { data: byDay } = await supabase
      .from("deities")
      .select("id, name_hi, name_en")
      .eq("status", "published")
      .contains("weekdays", [dow])
      .order("sort")
      .limit(1);
    deity = byDay?.[0] ?? null;
    if (!deity) {
      const { data: anyDeity } = await supabase
        .from("deities")
        .select("id, name_hi, name_en")
        .eq("status", "published")
        .order("sort")
        .limit(1);
      deity = anyDeity?.[0] ?? null;
    }
  }

  if (!shloka) {
    let q = supabase
      .from("devotional_items")
      .select("text_hi, text_en, source, deity_id")
      .eq("status", "published")
      .eq("kind", "shloka")
      .limit(1);
    if (deity) q = q.eq("deity_id", deity.id);
    const { data: byDeity } = await q;
    shloka = byDeity?.[0] ?? null;
    if (!shloka) {
      const { data: anyShloka } = await supabase
        .from("devotional_items")
        .select("text_hi, text_en, source")
        .eq("status", "published")
        .eq("kind", "shloka")
        .limit(1);
      shloka = anyShloka?.[0] ?? null;
    }
  }

  return { deity, shloka };
}

// ---------- greetings (home) ----------

export interface Greeting {
  text_hi: string;
  text_en: string | null;
  deity_id: string | null;
}

/**
 * Published greetings, deity-tagged where they belong to one.
 * Empty list is a normal state — the caller falls back to the i18n string.
 */
export async function listGreetings(): Promise<Greeting[]> {
  const { data, error } = await supabase
    .from("devotional_items")
    .select("text_hi, text_en, deity_id, id")
    .eq("status", "published")
    .eq("kind", "greeting")
    .order("id");
  if (error) throw error;
  return (data ?? []) as unknown as Greeting[];
}

/**
 * Today's greeting: prefer one tagged to today's deity (Har Har Mahadev on
 * Shiv's day), else rotate the whole list by IST day so it still varies.
 * Returns null when the content team hasn't authored any greeting yet.
 */
export function pickGreeting(all: Greeting[], deityId: string | null): Greeting | null {
  if (all.length === 0) return null;
  // Day-of-epoch (IST) drives both branches, so the choice is stable all day
  // and rotates tomorrow — no randomness, no per-render churn.
  const dayIndex = Math.floor(new Date(istDateString()).getTime() / 86_400_000);
  const forDeity = deityId ? all.filter((g) => g.deity_id === deityId) : [];
  const pool = forDeity.length > 0 ? forDeity : all;
  return pool[dayIndex % pool.length];
}

// ---------- mantras (jap) ----------

export interface MantraWithDeity {
  id: string;
  deity_id: string;
  text_devanagari: string;
  transliteration: string | null;
  meaning_hi: string | null;
  meaning_en: string | null;
  deity: { id: string; name_hi: string; name_en: string; sort: number } | null;
}

/** Published mantras with their deity, ordered by the deity's sort. */
export async function listMantras(): Promise<MantraWithDeity[]> {
  const { data, error } = await supabase
    .from("mantras")
    .select(
      `id, deity_id, text_devanagari, transliteration, meaning_hi, meaning_en,
       deity:deities!mantras_deity_id_fkey ( id, name_hi, name_en, sort )`,
    )
    .eq("status", "published");
  if (error) throw error;
  const rows = (data ?? []) as unknown as MantraWithDeity[];
  return rows.sort((a, b) => (a.deity?.sort ?? 99) - (b.deity?.sort ?? 99));
}
