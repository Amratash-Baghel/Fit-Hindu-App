/**
 * Singleton looping audio service for the meditation/jap/sleep surfaces.
 * A module-level player (not per-screen) so the selected sound keeps playing
 * across the flow's screens without restarting (spec: meditation.md).
 * Placeholder/unreachable URLs fail silently — the flow (and timer) never
 * depend on audio actually loading; "silent" is a first-class option.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

let player: AudioPlayer | null = null;
let currentUrl: string | null = null;
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

/** Start (or switch to) a looping sound. Same URL → keep playing untouched. */
export async function playLoop(url: string) {
  await ensureMode();
  try {
    if (player && currentUrl === url) {
      if (!player.playing) player.play();
      return;
    }
    if (player) {
      player.remove();
      player = null;
    }
    player = createAudioPlayer({ uri: url });
    player.loop = true;
    player.play();
    currentUrl = url;
  } catch {
    // unreachable source — stay silent, never break the flow
    currentUrl = url;
  }
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
  currentUrl = null;
}
