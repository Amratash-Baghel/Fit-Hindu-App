/**
 * Bundled audio — the offline launch tracks (B5). The DB models these as
 * `media` rows with provider='local'; this map is the app-side half of that
 * swappable layer: external_id → the require()'d asset Metro bundles into the
 * app. A local track plays offline and instantly. Future tracks slot in by
 * adding a media/sound row + one line here, or by moving to a CDN provider
 * (which needs no app change at all — the resolver falls through to the URL).
 *
 * Media/CDN stays behind this seam per the standing rule: files never live in
 * the database; here they live in the bundle, keyed by the same external_id.
 */
const LOCAL_AUDIO: Record<string, number> = {
  "om-chant-loop": require("../../assets/audio/om-chant-loop.m4a"),
  "sleep-flute-loop": require("../../assets/audio/sleep-flute-loop.m4a"),
};

/** The media fields the resolver needs (a structural subset of `Media`). */
export interface AudioRef {
  provider?: string | null;
  external_id?: string | null;
  playback_url?: string | null;
}

/**
 * Resolve a sound's media to a playable source for `playLoop`:
 *   provider='local' → the bundled asset (a Metro module id, a number)
 *   otherwise        → the CDN playback_url (a string)
 * Returns null when there is nothing playable (a placeholder row, or a local
 * external_id with no bundled file). Callers use null to mean "not tappable".
 */
export function audioSourceFor(audio: AudioRef | null | undefined): number | string | null {
  if (!audio) return null;
  if (audio.provider === "local") {
    return audio.external_id ? LOCAL_AUDIO[audio.external_id] ?? null : null;
  }
  return audio.playback_url ?? null;
}
