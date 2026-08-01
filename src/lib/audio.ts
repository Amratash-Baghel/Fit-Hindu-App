/**
 * Singleton looping audio service for the meditation/jap/sleep surfaces.
 * A module-level player (not per-screen) so the selected sound keeps playing
 * across the flow's screens without restarting (spec: meditation.md).
 * Placeholder/unreachable URLs fail silently — the flow (and timer) never
 * depend on audio actually loading; "silent" is a first-class option.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

let player: AudioPlayer | null = null;
/** Dedup key for the currently-loaded source. A URL is its own key; a bundled
 *  asset (a Metro module id / number) is keyed by its stringified id. */
let currentKey: string | null = null;
let modeSet = false;

async function ensureMode() {
  if (modeSet) return;
  modeSet = true;
  try {
    // keep playing with the screen locked / silent switch on (native; web ignores)
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
  } catch {
    // web or unsupported — fine
  }
}

/**
 * Start (or switch to) a looping sound. Same source → keep playing untouched.
 * `source` is a CDN URL (string) or a bundled asset (a require()'d module id,
 * a number) — see src/lib/localAudio.ts. expo-audio takes a number directly
 * and a URL as { uri }.
 */
export async function playLoop(source: string | number) {
  await ensureMode();
  const key = String(source);
  try {
    if (player && currentKey === key) {
      if (!player.playing) player.play();
      return;
    }
    if (player) {
      player.remove();
      player = null;
    }
    player = createAudioPlayer(typeof source === "number" ? source : { uri: source });
    player.loop = true;
    player.volume = 1; // reset in case a prior fade left it low
    player.play();
    currentKey = key;
  } catch {
    // unreachable source — stay silent, never break the flow
    currentKey = key;
  }
}

/**
 * Gentle fade to silence, then stop — for a graceful session end (B4 meditation
 * bell rides on top of this) rather than the hard cut of stopAudio(). Bails if
 * the player is swapped mid-fade, and always ends in a real stop + mode reset.
 */
export async function fadeOutStop(durationMs = 600) {
  const p = player;
  if (!p) return;
  const steps = 8;
  const stepMs = Math.max(20, Math.floor(durationMs / steps));
  try {
    for (let i = steps - 1; i >= 0; i--) {
      if (player !== p) return; // superseded by another playLoop/stop
      p.volume = i / steps;
      await new Promise((r) => setTimeout(r, stepMs));
    }
  } catch {
    // volume ramping unsupported — fall through to the hard stop
  }
  if (player === p) stopAudio();
}

export function pauseAudio() {
  try {
    player?.pause();
  } catch {}
}

export function resumeAudio() {
  try {
    player?.play();
  } catch {}
}

/** Full stop + release (end of session / silent selected). */
export function stopAudio() {
  try {
    player?.remove();
  } catch {}
  player = null;
  currentKey = null;
  // Reset the GLOBAL audio mode. ensureMode() above set playsInSilentMode:true
  // for this ambient session; left in place it would leak into the UI sound
  // effects (src/lib/feedback.ts), which must respect the iOS silent switch.
  // Clearing modeSet lets the next playLoop re-establish the ambient mode.
  modeSet = false;
  void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
}
