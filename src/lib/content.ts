/**
 * Content queries — typed reads over the published content tables.
 * RLS returns only status='published' rows to anon users, so the app never
 * has to filter status itself (we still pass it for index use + clarity).
 */
import { supabase } from "./supabase";
import type { BodyArea, Exercise, Media, WorkoutMode } from "../types/db";

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
