/**
 * Local device preferences — currently the two feedback toggles (haptics,
 * sound), both default ON (spec: docs/specs/feature-sprint.md slice 2).
 *
 * These are read by TWO worlds: the feedback service (src/lib/feedback.ts), a
 * plain module with no React, and the settings screen, which is React. So the
 * source of truth is a plain in-memory value with a subscription — the service
 * reads it synchronously on every chirp, and React subscribes via
 * useSyncExternalStore. AsyncStorage is the durable backing, hydrated once at
 * startup; before hydration the defaults stand, which is why both default true.
 *
 * NOT server-side. These are per-device ("this phone buzzes"), unlike
 * notification prefs (slice 7), which live in Postgres because the send path is
 * on the server.
 */
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FeedbackPrefs {
  haptics: boolean;
  sound: boolean;
}

const STORAGE_KEY = "fithindu.feedback.prefs";
const DEFAULTS: FeedbackPrefs = { haptics: true, sound: true };

let prefs: FeedbackPrefs = { ...DEFAULTS };
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Synchronous read — the feedback service calls this on every tap. */
export function getFeedbackPrefs(): FeedbackPrefs {
  return prefs;
}

/** Load the stored choice once at app start. Unreadable storage keeps defaults. */
export async function hydrateFeedbackPrefs(): Promise<void> {
  if (hydrated) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FeedbackPrefs>;
      // Treat only an explicit `false` as off, so a future added key defaults on.
      prefs = { haptics: parsed.haptics !== false, sound: parsed.sound !== false };
    }
  } catch {
    // keep defaults
  }
  hydrated = true;
  emit();
}

export async function setFeedbackPref(key: keyof FeedbackPrefs, value: boolean): Promise<void> {
  if (prefs[key] === value) return;
  prefs = { ...prefs, [key]: value }; // new object → stable snapshot identity
  emit();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // the in-memory value still took effect; it just won't survive a restart
  }
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** React binding for the settings screen. */
export function useFeedbackPrefs(): FeedbackPrefs {
  return useSyncExternalStore(subscribe, getFeedbackPrefs, getFeedbackPrefs);
}
