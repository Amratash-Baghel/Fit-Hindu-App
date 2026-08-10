/**
 * Feedback service — the ONE place haptics and sound fire together.
 * Spec: docs/specs/feature-sprint.md slice 2, re-cut by docs/specs/ui-polish.md
 * slice B.
 *
 * No component ever calls `Haptics.*` or touches an audio player for UI sound
 * directly; they call the verbs below. That keeps the two settings toggles
 * honest (one gate, checked here) and means the "which buzz, which chime"
 * mapping lives in exactly one file.
 *
 * The polish-pass rule that fixes the "irritating beep": **sound fires ONLY on
 * meaningful, low-frequency outcomes** (success / complete / chime / error).
 * High-frequency taps — every button press, every selection, every jap count,
 * every set — are haptic-ONLY. A 108-count mala used to fire 108 beeps; now it
 * is 108 soft taps you feel and one chime you hear at the end.
 *
 * Players are created ONCE (preloadFeedback, at app start) and replayed with
 * seekTo(0) — never re-created per fire, which would leak native players and
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

type Sfx = "success" | "complete" | "error" | "chime";

/** UI chirps stay warm but must be clearly audible on a phone speaker — the
 *  earlier 0.7 trim left the earned chimes so quiet they read as "no sound at
 *  all" on device. The assets are already low-amplitude (assets/sfx/README.md),
 *  so play them at full scale and let the quiet mix do the softening. */
const SFX_VOLUME = 1.0;

// require() sources are resolved by Metro at build time — bundled assets, not
// runtime URLs, so there is no network and no failure path beyond a missing file.
const SOURCES: Record<Sfx, number> = {
  success: require("../../assets/sfx/success.wav"),
  complete: require("../../assets/sfx/complete.wav"),
  error: require("../../assets/sfx/error.wav"),
  chime: require("../../assets/sfx/chime.wav"),
};

const players: Partial<Record<Sfx, AudioPlayer>> = {};

/** Create every SFX player once. Safe to call more than once; safe on web. */
export function preloadFeedback(): void {
  for (const key of Object.keys(SOURCES) as Sfx[]) {
    if (players[key]) continue;
    try {
      const p = createAudioPlayer(SOURCES[key]);
      p.volume = SFX_VOLUME;
      players[key] = p;
    } catch {
      // A missing asset must never break a flow — the chirp is optional.
    }
  }
}

function playSfx(key: Sfx): void {
  if (!getFeedbackPrefs().sound) return;
  try {
    let player = players[key];
    if (!player) {
      player = createAudioPlayer(SOURCES[key]);
      player.volume = SFX_VOLUME;
      players[key] = player;
    }
    // seekTo returns a Promise (unlike play(), which is void); a rapid second
    // fire before the asset finished decoding can reject it. Swallow that async
    // rejection the same way haptic() does, or it surfaces app-level.
    void player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // stay silent, never throw into a UI handler
  }
}

type Buzz = "light" | "medium" | "heavy" | "selection" | "success" | "warning";

function haptic(kind: Buzz): void {
  if (!getFeedbackPrefs().haptics) return;
  if (Platform.OS === "web") return; // no haptics on web; expo-haptics no-ops but skip the call
  try {
    const p =
      kind === "light"
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : kind === "medium"
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          : kind === "heavy"
            ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            : kind === "selection"
              ? Haptics.selectionAsync()
              : kind === "success"
                ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    void p.catch(() => {}); // swallow async rejection (device without a motor, etc.)
  } catch {
    // sync throw (unsupported) — ignore
  }
}

/**
 * The vocabulary. HAPTIC-ONLY verbs come first (the frequent ones); the four
 * that also SOUND are the rare, earned moments.
 *
 *   press    — a button/card was tapped; the lightest ack, no sound
 *   select   — a choice/toggle/chip/tab changed; a crisp selection tick, no sound
 *   count    — one jap count, one set logged; light + no sound (fires many times)
 *   milestone— a partway marker (jap 27/54/81); a medium nudge, still no sound
 *   ── the four that ring ──
 *   success  — plan assigned, or a mala completed (108); a small "yes"
 *   complete — a workout finished; the reward
 *   chime    — a meditation session ended; a soft bell, gentler than complete
 *   error    — a destructive action confirmed; a soft warning
 */
export const feedback = {
  press() {
    // Bumped Light → Medium: on most Android motors the Light impact is so faint
    // it reads as "haptics don't work". Medium is the baseline tap that actually
    // registers under the thumb (owner feedback 2026-08-08).
    haptic("medium");
  },
  select() {
    haptic("selection");
  },
  count() {
    haptic("light");
  },
  /** One jap count — the strongest thump we fire, on EVERY tap. The mala is the
   *  one place a devotee wants a satisfying, definite hit per bead (owner
   *  override 2026-08-08), so it opts out of the quiet `count` tick. Still no
   *  sound: the 108 stay a felt count, not 108 beeps. */
  japTap() {
    haptic("heavy");
  },
  milestone() {
    haptic("heavy");
  },
  success() {
    haptic("medium");
    playSfx("success");
  },
  complete() {
    haptic("success");
    playSfx("complete");
  },
  /** The quiet end of a meditation — a light haptic + soft bell, deliberately
   *  gentler than the shared `complete` reward (the "timer sound"). */
  chime() {
    haptic("light");
    playSfx("chime");
  },
  error() {
    haptic("warning");
    playSfx("error");
  },
};
