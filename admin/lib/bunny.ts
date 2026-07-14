/**
 * Bunny upload helpers — SERVER ONLY (imported exclusively from the upload
 * route handler). Keys live in admin/.env.local and never reach the browser.
 *
 * Video  → Bunny Stream:  create video, PUT binary, HLS playback URL.
 * Audio/other → Bunny Storage: PUT binary, CDN URL via the linked pull zone.
 *
 * If BUNNY_* env vars are absent, callers fall back to paste-URL mode
 * (provider 'external') — the panel works before the Bunny account exists.
 */

const STREAM_API = "https://video.bunnycdn.com";
const STORAGE_API = "https://storage.bunnycdn.com";

export function bunnyConfigured(): { stream: boolean; storage: boolean } {
  return {
    stream: !!(process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY && process.env.BUNNY_STREAM_CDN_HOST),
    storage: !!(process.env.BUNNY_STORAGE_ZONE && process.env.BUNNY_STORAGE_API_KEY && process.env.BUNNY_STORAGE_CDN_HOST),
  };
}

export async function uploadVideoToStream(
  file: ArrayBuffer,
  title: string,
): Promise<{ externalId: string; playbackUrl: string }> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const apiKey = process.env.BUNNY_STREAM_API_KEY!;
  const cdnHost = process.env.BUNNY_STREAM_CDN_HOST!; // e.g. vz-xxxx.b-cdn.net

  // 1. create the video object
  const createRes = await fetch(`${STREAM_API}/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!createRes.ok) throw new Error(`Bunny create video failed: ${createRes.status} ${await createRes.text()}`);
  const { guid } = (await createRes.json()) as { guid: string };

  // 2. upload the binary
  const putRes = await fetch(`${STREAM_API}/library/${libraryId}/videos/${guid}`, {
    method: "PUT",
    headers: { AccessKey: apiKey },
    body: file,
  });
  if (!putRes.ok) throw new Error(`Bunny video upload failed: ${putRes.status} ${await putRes.text()}`);

  return { externalId: guid, playbackUrl: `https://${cdnHost}/${guid}/playlist.m3u8` };
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
