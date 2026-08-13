/**
 * Daypart — "a surface that keeps time" (docs/specs/redesign-bms.md).
 *
 * A pure read of the IST clock that tells Home how to feel right now: which
 * greeting to show, which wash to paint over the ink, and whether the evening
 * has come (Soul rises to the top of the ring stack after sunset). Everything
 * here is derived from the wall clock — no state, no storage — so a screen calls
 * `currentDaypart()` on focus and re-reads the moment a boundary is crossed.
 *
 * Day boundaries use Asia/Kolkata, the same convention as streaks and the
 * blessing. The washes live in the design tokens (`daypart`), never inline.
 */
import { daypart as washes } from "../ui/tokens";
import type { StringKey } from "./i18n";

export type DayPartKey = "brahma" | "morning" | "day" | "sandhya" | "night";

export interface DaypartInfo {
  part: DayPartKey;
  /** i18n key for the greeting line (Brahma Muhurta / Good morning / …). */
  greetingKey: StringKey;
  /** top-anchored gradient stops for the Home wash (from tokens). At least two
   *  stops — the shape LinearGradient's `colors` requires. */
  wash: readonly [string, string, ...string[]];
  /** after sunset the day turns inward — Soul leads the ring stack. */
  soulFirst: boolean;
}

/** One absolute day in ms — the safe step for walking IST dates (IST has no
 *  DST, so 24h of real time is always exactly one IST day). */
export const DAY_MS = 86_400_000;

/**
 * IST calendar day (YYYY-MM-DD) — THE day-boundary key. Streaks, rings, the
 * blessing and Purna all roll over on this string changing; it is defined
 * once, here, so a boundary fix can never land in one consumer and miss
 * another. (Legacy private copies in session/content/progress migrate to this
 * export as those files are next touched.)
 */
export function istDayKey(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Current hour (0–23) in IST, robust to the "24" some engines emit at midnight. */
function istHour(): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  const h = parseInt(s, 10) % 24;
  return Number.isFinite(h) ? h : 8; // a sane daytime default if parsing ever fails
}

export function currentDaypart(): DaypartInfo {
  const h = istHour();
  if (h >= 4 && h < 6)
    return { part: "brahma", greetingKey: "greet_brahma", wash: washes.brahma, soulFirst: false };
  if (h >= 6 && h < 12)
    return { part: "morning", greetingKey: "greet_morning", wash: washes.morning, soulFirst: false };
  if (h >= 12 && h < 17)
    return { part: "day", greetingKey: "greet_day", wash: washes.day, soulFirst: false };
  if (h >= 17 && h < 21)
    return { part: "sandhya", greetingKey: "greet_evening", wash: washes.sandhya, soulFirst: true };
  return { part: "night", greetingKey: "greet_night", wash: washes.night, soulFirst: true };
}
