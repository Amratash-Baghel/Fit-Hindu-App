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
  // A placeholder row is a content-team stand-in whose URL is deliberately not
  // real (the seed's `https://example.com/...`). Returning it handed the player
  // a dead source and threw `NotSupportedError`; null is what this function has
  // always documented and what callers already treat as "not playable"
  // (app/(tabs)/sleep.tsx dims the row on exactly this check).
  if (audio.provider === "placeholder") return null;
  return audio.playback_url ?? null;
}

/**
 * The sound a screen should land on or auto-start: the preferred one when it is
 * still published AND actually playable, else the first playable one, else null
 * — a genuinely silent library, which is a real state, not an error.
 *
 * The playability step matters because "published" and "playable" are not the
 * same thing: a placeholder row is published content the content team has not
 * uploaded audio for yet. Landing on one would make "arriving is never silent"
 * (docs/specs/meditation.md) quietly false, and would start a sit that names a
 * sound and plays nothing.
 */
export function resolvePlayable<T extends { id: string; audio: AudioRef | null }>(
  rows: readonly T[],
  preferredId?: string | null,
): T | null {
  const playable = (r: T) => audioSourceFor(r.audio) != null;
  const preferred = preferredId ? rows.find((r) => r.id === preferredId) : undefined;
  if (preferred && playable(preferred)) return preferred;
  return rows.find(playable) ?? null;
}
