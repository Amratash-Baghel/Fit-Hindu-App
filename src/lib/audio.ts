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
/** The background-playback value the global audio mode is currently set to
 *  (null = not set). Sleep sounds want `true`; meditation/jap want `false` so
 *  the OS pauses them when the app leaves the foreground. */
let modeBackground: boolean | null = null;
/** Monotonic call counter: each playLoop captures its own value and bails after
 *  the await if a newer call has since superseded it — see playLoop. */
let gen = 0;
/** JS-driven playing state for the global stop control. Deterministic (unlike
 *  the native `player.playing`, which flips asynchronously). */
let paused = false;

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

/** Subscribe to start/stop/pause transitions (powers the global stop pill). */
export function subscribeAudio(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** True while a sound is loaded and not paused. */
export function isPlaying(): boolean {
  return player != null && !paused;
}

/**
 * Silence AND release a player. pause() must run BEFORE remove(): on this
 * expo-audio build a *looping* player keeps sounding after remove() alone (the
 * buffer/loop plays on), so tearing one down without pausing first leaks an
 * audible, now-unreferenced loop. That leak is the "every tap stacks another
 * sound and Stop / Silent / Exit do nothing" bug — each sound-switch orphaned a
 * loop the singleton could no longer reach, so stopAudio() only ever killed the
 * newest layer. Pausing first cuts the sound dead the instant the reference is
 * dropped, whether we're swapping sources (playLoop) or stopping (stopAudio).
 */
function teardown(p: AudioPlayer): void {
  try {
    p.pause();
  } catch {}
  try {
    p.remove();
  } catch {}
}

async function ensureMode(background: boolean) {
  if (modeBackground === background) return;
  try {
    // keep playing with the screen locked / silent switch on (native; web ignores).
    // shouldPlayInBackground is scoped per surface: only sleep passes true, so
    // meditation/jap auto-pause when the app is backgrounded.
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: background });
    modeBackground = background;
  } catch {
    // web or unsupported — fine
  }
}

/**
 * Start (or switch to) a looping sound. Same source → keep playing untouched.
 * `source` is a CDN URL (string) or a bundled asset (a require()'d module id,
 * a number) — see src/lib/localAudio.ts. expo-audio takes a number directly
 * and a URL as { uri }. Only sleep passes `{ background: true }`.
 */
export async function playLoop(source: string | number, opts?: { background?: boolean }) {
  // Serialize this call against anything that supersedes it while it is awaiting
  // ensureMode()'s native setAudioModeAsync: a newer playLoop (mount auto-play +
  // a fast user tap both racing to create a player), OR a stopAudio/pauseAudio
  // that happened in between. All of those bump `gen`, so the post-await guard
  // below makes a stale call bail before it touches `player` — no orphaned,
  // still-looping player survives.
  const myGen = ++gen;
  await ensureMode(opts?.background ?? false);
  if (myGen !== gen) return; // superseded during the await — do nothing

  const key = String(source);
  try {
    if (player && currentKey === key) {
      if (!player.playing) player.play();
      paused = false;
      emit();
      return;
    }
    if (player) {
      teardown(player); // pause-then-release: remove() alone would leave the old loop sounding
      player = null;
    }
    const next = createAudioPlayer(typeof source === "number" ? source : { uri: source });
    next.loop = true;
    next.volume = 1; // reset in case a prior fade left it low
    next.play();
    player = next;
    currentKey = key;
    paused = false;
    emit();
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
  // Bump the generation so a playLoop still awaiting ensureMode() bails instead
  // of resuming into .play() and overriding this pause (see playLoop / stopAudio).
  gen++;
  try {
    player?.pause();
  } catch {}
  paused = true;
  emit();
}

export function resumeAudio() {
  try {
    player?.play();
  } catch {}
  paused = false;
  emit();
}

/** Full stop + release (end of session / silent selected). */
export function stopAudio() {
  // Bump the generation FIRST: a playLoop still suspended on ensureMode()'s
  // native setAudioModeAsync must not resume after this stop, find player===null,
  // and create a brand-new (orphaned) player. The bump makes its post-await
  // `myGen !== gen` guard fire, so it bails. Without this, an ordinary
  // "tap a sound, then stop before the audio mode finishes switching" leaks a
  // player that keeps looping past the stop — the exact bug this slice fixes.
  gen++;
  if (player) teardown(player); // pause-then-release (see teardown) — the hard stop
  player = null;
  currentKey = null;
  paused = false;
  // Reset the GLOBAL audio mode. ensureMode() above set playsInSilentMode:true
  // for this ambient session; left in place it would leak into the UI sound
  // effects (src/lib/feedback.ts), which must respect the iOS silent switch.
  // Clearing modeBackground lets the next playLoop re-establish the ambient mode.
  modeBackground = null;
  void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
  emit();
}
