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
import { Platform, Vibration } from "react-native";
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
/**
 * One OS-scheduled vibration pattern (Android). The mockup's haptic map speaks
 * in short waveforms — [12,40,18] for a completion, [20,60,30,60,40] for the
 * all-three celebration — and JS-scheduled impact trains land late and
 * unevenly on a busy thread. Vibration.vibrate hands the whole timeline to
 * the OS (same reasoning as rewardBurst). Pattern = [wait, on, off, on, …].
 */
function buzzPattern(pattern: number[]): void {
  if (!getFeedbackPrefs().haptics || Platform.OS === "web") return;
  try {
    Vibration.vibrate(pattern);
  } catch {
    // no vibrator — silent
  }
}

export const feedback = {
  press() {
    // The mockup's haptic map (2026-08-13 rework): a LIGHT tick on every plain
    // press — presses are constant, so the baseline ack stays feather-light and
    // the heavier hits below keep their meaning. (Supersedes the 2026-08-08
    // Medium bump, which made every surface thump like a completion.)
    haptic("light");
  },
  select() {
    haptic("selection");
  },
  count() {
    haptic("light");
  },
  /** The primary GOLD action press (Set done, Begin meditation, Let's begin …) —
   *  a firm, satisfying two-beat that rides the gold spark-burst, so the one gold
   *  button on a screen feels weightier than an ordinary tap. No sound: the earned
   *  chime belongs to a genuine completion (feedback.complete), which those
   *  handlers fire on their own. */
  goldPress() {
    if (Platform.OS === "android") buzzPattern([0, 12, 30, 18]);
    else haptic("medium");
  },
  /** A small earned reveal (the daily blessing) — the mockup's two-beat flutter
   *  (buzz([10,30,14])) under the gold wash, with the soft bell rather than the
   *  full completion ring: a blessing is gentler than a workout done. */
  reveal() {
    if (Platform.OS === "android") buzzPattern([0, 10, 30, 14]);
    else haptic("medium");
    playSfx("chime");
  },
  // NOTE: the grand-celebration haptic (Purna, mala complete) is rewardBurst()
  // below — the owner-approved accelerando that superseded the mockup's flat
  // buzz([20,60,30,60,40]). Don't add a parallel "celebrate" verb: two
  // celebration timelines on one Android vibrator cancel each other.
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
    // the mockup's completion buzz — a crisp hit-release-hit, not one flat thud
    if (Platform.OS === "android") buzzPattern([0, 12, 40, 18]);
    else haptic("medium");
    playSfx("success");
  },
  complete() {
    if (Platform.OS === "android") buzzPattern([0, 12, 40, 18]);
    else haptic("success");
    playSfx("complete");
  },
  /** Just the workout reward chime — the SOUND with no haptic, for a screen whose
   *  haptic is the synced rewardBurst instead (so a notification buzz doesn't
   *  fight the vibration pattern on the same vibrator). */
  completeChime() {
    playSfx("complete");
  },
  /**
   * The reward burst — a haptic that BUILDS then RELEASES hard, in sync with the
   * diya spark burst on the completion / Fit-Points reward screens (owner ask
   * 2026-08-11: "smooth accelerating then burst — continuous, not choppy").
   *
   * Delivered as ONE native vibration pattern, NOT a train of JS-scheduled
   * impacts. The first version fired ten setTimeout impacts, which land late and
   * unevenly on a busy JS thread (exactly while the completion screen mounts +
   * animates) → the laggy, choppy feel. Handing the whole timeline to the OS
   * (Vibration.vibrate) keeps it smooth no matter what the JS thread is doing.
   *
   * The ramp accelerates — pulses lengthen as the gaps shrink, revving up — then
   * a short breath and a long sustained BURST that lands with the sparks (the
   * diya burst fires at ~1100ms in CompletionDiya; the burst pulse starts ~1075).
   * `ramp:false` (reduce-motion — the burst renders static) collapses to one firm
   * hit. Returns a cancel fn so a surface unmounting mid-burst stops the buzz.
   */
  rewardBurst(opts?: { ramp?: boolean }): () => void {
    if (!getFeedbackPrefs().haptics || Platform.OS === "web") return () => {};
    // iOS has no precise-waveform vibration API (Vibration ignores durations
    // there); a single rich confirm stands in — iOS ships later, Android is what
    // this pattern is tuned for.
    if (Platform.OS !== "android") {
      haptic("success");
      return () => {};
    }
    // Android pattern = [waitMs, onMs, offMs, onMs, offMs, …]; the final, longest
    // `on` is the burst. Durations climb (30→170) while gaps shrink (120→25) for
    // the accelerando, then a 50ms breath, then the 320ms sustained pop.
    const pattern =
      opts?.ramp === false
        ? [0, 45, 60, 220]
        : [0, 30, 120, 40, 100, 55, 80, 75, 60, 100, 40, 130, 25, 170, 50, 320];
    try {
      Vibration.vibrate(pattern);
    } catch {
      // no vibrator / unsupported — silent
    }
    return () => {
      try {
        Vibration.cancel();
      } catch {}
    };
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
