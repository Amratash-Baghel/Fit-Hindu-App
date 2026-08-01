/**
 * Bunny upload helpers — SERVER ONLY (imported exclusively from the upload
 * route handlers). Keys live in admin/.env.local and never reach the browser.
 *
 * Video → Bunny Stream: the video object is created here (server-side, tiny
 * JSON call), then the browser uploads the binary DIRECTLY to Bunny via TUS
 * using a short-lived, single-video signature minted here — the binary never
 * passes through our own server/Vercel function (Vercel caps request bodies
 * at 4.5MB, which any real demo video exceeds). The raw BUNNY_STREAM_API_KEY
 * never reaches the browser; only the derived signature does.
 * Audio/other → Bunny Storage: PUT binary, CDN URL via the linked pull zone
 * (small files, still proxied through our server).
 *
 * If BUNNY_* env vars are absent, callers fall back to paste-URL mode
 * (provider 'external') — the panel works before the Bunny account exists.
 */
import { createHash } from "crypto";

const STREAM_API = "https://video.bunnycdn.com";
const STORAGE_API = "https://storage.bunnycdn.com";
const TUS_AUTH_TTL_SECONDS = 3600; // Bunny's documented minimum-recommended window

export function bunnyConfigured(): { stream: boolean; storage: boolean } {
  return {
    stream: !!(process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY && process.env.BUNNY_STREAM_CDN_HOST),
    storage: !!(process.env.BUNNY_STORAGE_ZONE && process.env.BUNNY_STORAGE_API_KEY && process.env.BUNNY_STORAGE_CDN_HOST),
  };
}

export async function createStreamVideo(title: string): Promise<{ guid: string; cdnHost: string }> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const apiKey = process.env.BUNNY_STREAM_API_KEY!;
  const cdnHost = process.env.BUNNY_STREAM_CDN_HOST!; // e.g. vz-xxxx.b-cdn.net

  const createRes = await fetch(`${STREAM_API}/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!createRes.ok) throw new Error(`Bunny create video failed: ${createRes.status} ${await createRes.text()}`);
  const { guid } = (await createRes.json()) as { guid: string };

  return { guid, cdnHost };
}

// Signs a one-video, time-limited TUS upload session per Bunny's documented
// scheme: sha256(libraryId + apiKey + expire + videoId), hex. The browser
// gets this signature (and never the raw apiKey) and uses it to upload
// straight to https://video.bunnycdn.com/tusupload.
export function signStreamUpload(guid: string): { libraryId: string; signature: string; expire: number } {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const apiKey = process.env.BUNNY_STREAM_API_KEY!;
  const expire = Math.floor(Date.now() / 1000) + TUS_AUTH_TTL_SECONDS;
  const signature = createHash("sha256").update(`${libraryId}${apiKey}${expire}${guid}`).digest("hex");
  return { libraryId, signature, expire };
}

export async function uploadFileToStorage(
  file: ArrayBuffer,
  path: string, // e.g. "sounds/rain.mp3"
): Promise<{ externalId: string; playbackUrl: string }> {
  const zone = process.env.BUNNY_STORAGE_ZONE!;
  const apiKey = process.env.BUNNY_STORAGE_API_KEY!;
  const cdnHost = process.env.BUNNY_STORAGE_CDN_HOST!; // pull zone host

  const putRes = await fetch(`${STORAGE_API}/${zone}/${path}`, {
    method: "PUT",
    headers: { AccessKey: apiKey, "Content-Type": "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error(`Bunny storage upload failed: ${putRes.status} ${await putRes.text()}`);

  return { externalId: path, playbackUrl: `https://${cdnHost}/${path}` };
}
