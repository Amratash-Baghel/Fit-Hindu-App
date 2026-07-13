/**
 * Design tokens — the ONLY source of color/type/spacing in the app.
 * Values frozen from the owner-approved mockups (docs/mockups/, 2026-07-12):
 * premium black · saffron · gold. Gold is spent ONLY on the primary action
 * and the streak; sleep surfaces shift to night-indigo.
 * Standing rule: screens never use one-off values — they use these.
 */

export const color = {
  // grounds
  ink: "#0F0B07", // warm black — app background
  surface: "#1C1510", // cards
  surface2: "#28201A", // nested chips/slots
  line: "#3A2E24", // hairline borders

  // brand accents
  saffron: "#F0761E", // THE action color: buttons, selection, active tabs
  saffronDeep: "#B84A16", // sindoor — devotional accents
  gold: "#D9A441", // primary button + streak ONLY
  goldHi: "#F2C879",

  // text
  cream: "#F6EDDD", // primary text
  muted: "#A8917A", // secondary text
  bodySoft: "#D9CBB8", // long-form body

  // semantic
  ok: "#7CB07F",
  danger: "#C4452F",

  // sleep mood (night-indigo — sleep screens only)
  night: "#0B0E1A",
  nightSurface: "#151A2E",
  nightLine: "#252D4A",
  nightMuted: "#8E96B8",
} as const;

/** Gold gradient for the primary button (use with expo-linear-gradient later;
 *  flat `gold` is the fallback). */
export const goldGradient = ["#F2C879", "#D9A441", "#B07E2B"] as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  chip: 999,
  button: 14,
  card: 18,
  media: 20,
} as const;

/** Type scale — large by default (wide age range, Hindi-first).
 *  lineHeight is generous for Devanagari matras. */
export const type = {
  display: { fontSize: 28, lineHeight: 38, fontWeight: "800" },
  h1: { fontSize: 24, lineHeight: 33, fontWeight: "800" },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
  body: { fontSize: 17, lineHeight: 25, fontWeight: "400" },
  bodyBold: { fontSize: 17, lineHeight: 25, fontWeight: "700" },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 2 },
} as const;

/** Minimum tap target (dp) — enforced by base components. */
export const tapTarget = 48;
