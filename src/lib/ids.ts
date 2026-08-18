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

  return formatUuid(b);
}

function formatUuid(b: Uint8Array): string {
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(b[i].toString(16).padStart(2, "0"));
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/**
 * A stable, UUID-shaped id derived from `seed` — same seed always yields the
 * same string. For a per-day idempotency key (e.g. "one `meal` row per user
 * per IST day, however many times the write is retried"), where a `uuid`
 * column needs a value that repeats on purpose rather than one that must
 * never collide. NOT cryptographic — a plain string is not universally
 * unguessable, which is fine for a dedup key scoped by `activity_log`'s own
 * `(user_id, client_event_id)` uniqueness, but never use this where
 * unpredictability itself is the requirement (see `uuidv4`'s own caveat).
 */
export function deterministicUuid(seed: string): string {
  // Four independent 32-bit FNV-1a passes (offset basis rotated per lane) fill
  // 16 bytes from one string with no crypto dependency — same absence of
  // WebCrypto that `uuidv4` works around above.
  const b = new Uint8Array(16);
  for (let lane = 0; lane < 4; lane++) {
    let h = 0x811c9dc5 ^ lane;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    const u = h >>> 0;
    b[lane * 4] = (u >>> 24) & 0xff;
    b[lane * 4 + 1] = (u >>> 16) & 0xff;
    b[lane * 4 + 2] = (u >>> 8) & 0xff;
    b[lane * 4 + 3] = u & 0xff;
  }
  return formatUuid(b);
}
