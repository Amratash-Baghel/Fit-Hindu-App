/** Enum value lists (mirror supabase/migrations/0001). Types live in lib/db.ts. */
import type { BodyArea, Level, SoundKind, WorkoutMode } from "./db";

export const BODY_AREAS: BodyArea[] = ["chest", "back", "shoulders", "arms", "core", "legs", "full_body"];
export const WORKOUT_MODES: WorkoutMode[] = ["home", "gym"];
export const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
export const SOUND_KINDS: SoundKind[] = ["chant", "ambient", "sleep", "jap_loop"];
