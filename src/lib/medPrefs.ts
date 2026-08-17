/**
 * The last meditation setup, remembered locally (docs/specs/meditation.md v2).
 *
 * The hub's quick start exists because re-picking the same sound and the same
 * 15 minutes before every sit is the tax the old three-screen flow charged.
 * This is the memory that removes it.
 *
 * Local only, and deliberately so: it is a UI convenience, not user data worth
 * a table or a round-trip. Same best-effort shape as `sleepRun.ts` — a storage
 * failure costs the memory, never the session.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "fithindu.meditation.prefs";

/** The default sit, used until the user has finished picking their own. */
export const DEFAULT_MINUTES = 15;

/** The "no sound" choice — a real option, not an absence. Lives here because
 *  the hub, the Start screen and the session all have to agree on the word
 *  (the session already treats it as "log no sound_id"). */
export const SILENT = "silent";

/** The two practices the session can run (UI9 slice D). */
export type MedMode = "timer" | "breath";
/** Breath rhythms: `calm` = in 4s / out 6s, `even` = 4s / 4s. */
export type MedPace = "calm" | "even";

export interface MedPrefs {
  /** A `sounds.id`, or "silent". May point at a sound that has since been
   *  unpublished — resolving that is the caller's job (see the hub's fallback
   *  chain), because only the caller knows what is currently published. */
  soundId: string;
  minutes: number;
  /** Which practice was run last, so quick start resumes THAT one. */
  mode: MedMode;
  /** The optional 5-minute interval bell. */
  bell: boolean;
  pace: MedPace;
}

export const DEFAULT_MODE: MedMode = "timer";
export const DEFAULT_PACE: MedPace = "calm";

const isMode = (v: unknown): v is MedMode => v === "timer" || v === "breath";
const isPace = (v: unknown): v is MedPace => v === "calm" || v === "even";

export async function getMedPrefs(): Promise<MedPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<MedPrefs>;
    // Written by an older build, or hand-edited: take only what is usable. The
    // slice-C shape had no mode/bell/pace, so those simply read as defaults.
    if (typeof p.soundId !== "string") return null;
    const minutes = typeof p.minutes === "number" && p.minutes > 0 ? p.minutes : DEFAULT_MINUTES;
    return {
      soundId: p.soundId,
      minutes,
      mode: isMode(p.mode) ? p.mode : DEFAULT_MODE,
      bell: p.bell === true,
      pace: isPace(p.pace) ? p.pace : DEFAULT_PACE,
    };
  } catch {
    return null;
  }
}

/** Called as a session begins — from the quick start and from the Start screen,
 *  so whichever way the user got there is the setup that is remembered. */
export async function saveMedPrefs(prefs: MedPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* best-effort — losing the memory must never block starting a sit */
  }
}
