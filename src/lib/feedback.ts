/**
 * Feedback service — the ONE place haptics and sound fire together.
 * Spec: docs/specs/feature-sprint.md slice 2.
 *
 * No component ever calls `Haptics.*` or touches an audio player for UI sound
 * directly; they call feedback.tap/success/complete/error. That keeps the two
 * settings toggles honest (one gate, checked here) and means the "which buzz,
 * which chime" mapping lives in exactly one file.
 *
 * Players are created ONCE (preloadFeedback, at app start) and replayed with
 * seekTo(0) — never re-created per tap, which would leak native players and
 * stutter on low-end Android.
 *
 * Audio-mode note: this service deliberately does NOT call setAudioModeAsync.
 * The expo-audio default respects the iOS silent switch (playsInSilentMode:
 * false), which is what UI chirps want. The meditation/ambient player
 * (src/lib/audio.ts) is the one that flips playsInSilentMode:true while it
 * plays, and it resets the mode back on stopAudio() so that choice does not
 * leak into subsequent chirps.
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { getFeedbackPrefs } from "./settings";

type Sfx = "tap" | "success" | "complete" | "error";

// require() sources are resolved by Metro at build time — bundled assets, not
// runtime URLs, so there is no network and no failure path beyond a missing file.
const SOURCES: Record<Sfx, number> = {
  tap: require("../../assets/sfx/tap.wav"),
  success: require("../../assets/sfx/success.wav"),
  complete: require("../../assets/sfx/complete.wav"),
  error: require("../../assets/sfx/error.wav"),
};

const players: Partial<Record<Sfx, AudioPlayer>> = {};

/** Create every SFX player once. Safe to call more than once; safe on web. */
export function preloadFeedback(): void {
  for (const key of Object.keys(SOURCES) as Sfx[]) {
    if (players[key]) continue;
    try {
      players[key] = createAudioPlayer(SOURCES[key]);
    } catch {
      // A missing asset must never break a flow — the chirp is optional.
    }
  }
}

function playSfx(key: Sfx): void {
  if (!getFeedbackPrefs().sound) return;
  try {
    const player = players[key] ?? (players[key] = createAudioPlayer(SOURCES[key]));
    // seekTo returns a Promise (unlike play(), which is void); a rapid second
    // tap before the asset finished decoding can reject it. Swallow that async
    // rejection the same way haptic() does, or it surfaces app-level.
    void player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // stay silent, never throw into a UI handler
  }
}

type Buzz = "light" | "medium" | "success" | "warning";

function haptic(kind: Buzz): void {
  if (!getFeedbackPrefs().haptics) return;
  if (Platform.OS === "web") return; // no haptics on web; expo-haptics no-ops but skip the call
  try {
    const p =
      kind === "light"
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : kind === "medium"
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          : kind === "success"
            ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    void p.catch(() => {}); // swallow async rejection (device without a motor, etc.)
  } catch {
    // sync throw (unsupported) — ignore
  }
}

/**
 * The vocabulary. Each pairs a haptic with its chime:
 *   tap      — a set completed; the lightest ack
 *   success  — plan assigned; a small "yes"
 *   complete — a workout or meditation finished; the reward
 *   error    — a destructive action confirmed; a soft warning
 */
export const feedback = {
  tap() {
    haptic("light");
    playSfx("tap");
  },
  success() {
    haptic("medium");
    playSfx("success");
  },
  complete() {
    haptic("success");
    playSfx("complete");
  },
  error() {
    haptic("warning");
    playSfx("error");
  },
};
