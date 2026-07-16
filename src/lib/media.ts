/**
 * Media URL helpers — everything the app needs to know about how Bunny
 * serves our files lives HERE, so screens never build URLs themselves.
 *
 * Bunny Stream serves each video under .../<guid>/:
 *   playlist.m3u8   HLS (Android/iOS native players)
 *   play_720p.mp4   MP4 fallback (web preview — Chrome can't play HLS)
 *   thumbnail.jpg   auto-generated poster
 *
 * The Stream zone blocks referer-LESS requests (403), which is why plain
 * curl fails while browsers succeed: browsers always send a Referer. Native
 * players send none by default, so we attach one explicitly via source
 * headers (web ignores them and uses the browser's own referer).
 *
 * Placeholder rows (provider 'placeholder', example.com URLs) are NOT
 * playable — helpers return null for them and screens fall back to the
 * avatar tile.
 */
import { Platform } from "react-native";

/** Matches a Bunny Stream HLS URL and captures the base .../<guid> part. */
const BUNNY_STREAM_RE = /^(https:\/\/[^/]+\.b-cdn\.net\/[0-9a-f-]{36})\/playlist\.m3u8$/i;

/** Referer for native video requests — the Stream zone rejects referer-less
 *  requests. Any value passes today; use the app's origin for honesty. */
const VIDEO_REFERER = "https://app.fithindu.in/";

export interface VideoSource {
  uri: string;
  headers?: Record<string, string>;
}

function bunnyBase(playbackUrl: string | null | undefined): string | null {
  if (!playbackUrl) return null;
  const m = playbackUrl.match(BUNNY_STREAM_RE);
  return m ? m[1] : null;
}

/** True when the URL is a real, playable Bunny Stream video (not a placeholder). */
export function isPlayableVideo(playbackUrl: string | null | undefined): boolean {
  return bunnyBase(playbackUrl) !== null;
}

/**
 * Player source for a video playback_url, or null when not playable.
 * Web gets the MP4 fallback (Chrome has no native HLS); native gets HLS
 * with an explicit Referer.
 */
export function videoSource(playbackUrl: string | null | undefined): VideoSource | null {
  const base = bunnyBase(playbackUrl);
  if (!base) return null;
  if (Platform.OS === "web") return { uri: `${base}/play_720p.mp4` };
  return { uri: `${base}/playlist.m3u8`, headers: { Referer: VIDEO_REFERER } };
}

/**
 * Poster/thumbnail for an exercise: the team-uploaded thumb when present,
 * else Bunny's auto-generated frame from the video, else null (avatar tile).
 */
export function posterUrl(
  thumbUrl: string | null | undefined,
  videoUrl: string | null | undefined,
): string | null {
  if (thumbUrl) return thumbUrl;
  const base = bunnyBase(videoUrl);
  return base ? `${base}/thumbnail.jpg` : null;
}

/**
 * Headers an <Image> needs for a given URL. The Bunny STREAM zone (vz-*)
 * refuses referer-less requests; browsers send a Referer on their own but
 * the native image loader does not, so derived video posters would 403 on
 * device without this. The images pull zone is open — no headers needed.
 */
export function imageHeaders(url: string | null | undefined): Record<string, string> | undefined {
  if (url && /^https:\/\/vz-[^/]+\.b-cdn\.net\//i.test(url)) return { Referer: VIDEO_REFERER };
  return undefined;
}
