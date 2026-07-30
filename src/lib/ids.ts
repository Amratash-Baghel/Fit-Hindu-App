/**
 * Client-generated identifiers.
 *
 * Extracted from src/lib/session.ts in slice 7, when the push registration
 * needed a stable per-install device id and the alternative was a second copy
 * of the same generator. One implementation, one set of caveats.
 */

/**
 * RFC-4122 v4, without a dependency.
 *
 * Neither `crypto.randomUUID` nor `crypto.getRandomValues` exists in this
 * runtime (Hermes has no WebCrypto, Expo's winter polyfills do not add it, and
 * expo-crypto is not installed), so the `Math.random` path is the one that
 * actually runs today. That is acceptable for what these ids ARE: row
 * identifiers used for idempotent replay, and a device label — never secrets,
 * never anything an attacker gains by predicting. The uniqueness that matters
 * is per user, not global. The stronger sources are preferred if a future SDK
 * provides them.
 *
 * Do not reach for this if a value ever becomes a capability (a share link, a
 * token, an unguessable url). Those need expo-crypto.
 */
export function uuidv4(): string {
  const c = (globalThis as {
    crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => void };
  }).crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();

  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);

  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(b[i].toString(16).padStart(2, "0"));
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
