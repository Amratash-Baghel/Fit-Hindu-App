/**
 * Local profile store — the pre-auth home for the few answers we collect
 * before there is an account (onboarding spec Q1 language, Q2 name).
 *
 * Everything here is a mirror, not a source of truth: once app auth ships
 * these fields live on `profiles` (language_mode, display_name) and this
 * layer becomes the offline cache + the pre-sign-in buffer. Keeping the
 * shape identical to the profile columns now means that migration is a sync
 * call, not a rewrite.
 *
 * Storage is best-effort by design: a device that refuses AsyncStorage
 * (private mode, quota) must still get a working app, so every read falls
 * back to a default and every write swallows its error.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageMode } from "../types/db";

const KEY_NAME = "fithindu.display_name";
const KEY_LANG = "fithindu.language_mode";
const KEY_ONBOARDED = "fithindu.onboarded";

/** Longest name we store. Guards the greeting layout, not identity. */
const NAME_MAX = 24;

export interface LocalProfile {
  displayName: string | null;
  languageMode: LanguageMode | null;
  onboarded: boolean;
}

/**
 * In-memory mirror of what this session wrote.
 *
 * Storage is best-effort, but `onboarded` cannot be: the tabs gate redirects
 * to onboarding whenever it reads false, so a device that silently refuses
 * the write would bounce the user between onboarding and the tabs forever.
 * Remembering the answer for the current session breaks that loop — the user
 * gets in, and only pays a repeated onboarding on the NEXT launch.
 */
const session: { displayName: string | null; onboarded: boolean } = {
  displayName: null,
  onboarded: false,
};

/** Trim, collapse whitespace, cap length. Empty → null (treated as skipped). */
export function normaliseName(raw: string): string | null {
  const clean = raw.trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
  return clean.length > 0 ? clean : null;
}

export async function loadProfile(): Promise<LocalProfile> {
  try {
    const [name, lang, onboarded] = await AsyncStorage.multiGet([KEY_NAME, KEY_LANG, KEY_ONBOARDED]);
    return {
      displayName: session.displayName ?? name[1] ?? null,
      languageMode: (lang[1] as LanguageMode | null) ?? null,
      onboarded: session.onboarded || onboarded[1] === "1",
    };
  } catch {
    return { displayName: session.displayName, languageMode: null, onboarded: session.onboarded };
  }
}

export async function saveName(name: string | null): Promise<void> {
  session.displayName = name;
  try {
    if (name === null) await AsyncStorage.removeItem(KEY_NAME);
    else await AsyncStorage.setItem(KEY_NAME, name);
  } catch {
    // best-effort — a lost name costs a greeting next launch, never the session
  }
}

export async function saveLanguage(mode: LanguageMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LANG, mode);
  } catch {
    // best-effort
  }
}

export async function markOnboarded(): Promise<void> {
  // Set BEFORE the write: the gate must never bounce this session back.
  session.onboarded = true;
  try {
    await AsyncStorage.setItem(KEY_ONBOARDED, "1");
  } catch {
    // best-effort
  }
}
