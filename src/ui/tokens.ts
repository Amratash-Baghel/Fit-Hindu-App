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
  saffronWash: "rgba(240,118,30,0.12)", // selected-surface fill (saffron @ 12%)
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

/** The ember-card treatment — the warm hero cards (today's shloka, streak hero,
 *  blessing). Promoted from screen-level literals so new surfaces stop copying
 *  hexes (design-system rule); legacy screens migrate as they're touched. */
export const ember = {
  gradient: ["#241407", "#1C1510"] as const,
  line: "#4a3416", // hairline border on ember surfaces
} as const;

/** Full-screen overlay scrim (Purna, future modals) — the mockup's stage black. */
export const scrim = "rgba(7,5,3,0.94)";

/** The Home medallions' metal + face ramps (PillarCoin), ported from the
 *  mockup's --metal/--bezel/coin-face. Namespaced like `ceremony`: art
 *  surfaces own their ramp, but the values live HERE, not inline. */
export const coin = {
  metal: ["#F9DA92", "#EFC066", "#D9A441", "#B07E2B"] as const,
  faceHi: "#2C2117", // face highlight (lit from upper left)
  face: "#160F08",
  faceEdge: "#120C06",
  embossHi: "rgba(255,244,214,0.30)", // bezel outer hairline
  embossShade: "rgba(0,0,0,0.45)", // face inner shadow line
} as const;

/**
 * Ceremony palette — the deep oxblood + antique-gold ritual look, namespaced so
 * it stays OUT of the everyday app surfaces (owner decision 4, 2026-07-28). Used
 * ONLY by the splash (slice 3) and the plan-ready ceremony (slice 5). Everything
 * else uses the tokens above; nothing here leaks into normal screens.
 * `field` is mirrored by the native splash background in app.json so the
 * native→animated handoff shows no seam.
 */
export const ceremony = {
  field: "#5C1A1C", // oxblood base — app.json splash background matches this
  fieldHi: "#6B1F21", // lifted maroon — radial centre of the field
  fieldDeep: "#3B0F11", // vignette edge
  gold: "#D4A24C", // emblem, arch, filigree
  goldHi: "#F0CE84", // specular highlight + gada bloom
  goldShade: "#A9762A", // shaded gold facets
  terracotta: "#D2582A", // side-panel filigree
  terracottaHi: "#E2703A",
  cream: "#F2EDE6", // cream negative space / corners
  charcoal: "#2B2B2B", // base band
} as const;

/**
 * BMS pillar palette (redesign 2026-08-11, docs/specs/redesign-bms.md).
 * The three rings of the home screen and everything that keys off a pillar.
 * body = saffron (energy), mind = serene indigo (harmonizes with the night
 * palette; the one cool accent in the app), soul = devotional gold (amends the
 * "gold = button+streak only" guidance — pending owner sign-off).
 * Wash values are the fills at ring-track/selected-surface strength.
 */
export const pillar = {
  body: "#F0761E",
  bodyWash: "rgba(240,118,30,0.14)",
  mind: "#8FA3E8",
  mindWash: "rgba(143,163,232,0.14)",
  soul: "#D9A441",
  soulWash: "rgba(217,164,65,0.14)",
} as const;

export type PillarKey = "body" | "mind" | "soul";

/**
 * Time-of-day Home washes (redesign — "a surface that keeps time",
 * docs/specs/redesign-bms.md). Each is a top-anchored gradient painted over the
 * ink ground so Home breathes with the IST day. Every stop reuses an existing
 * hue — mind indigo (pre-dawn), saffron (day), gold + sindoor (dusk), the sleep
 * night-line (night) — fading to the ground's alpha-0 so nothing new is
 * introduced and the wash dissolves into the same black. Ordered by the day.
 */
export const daypart = {
  brahma: ["rgba(143,163,232,0.16)", "rgba(240,118,30,0.08)", "rgba(15,11,7,0)"],
  morning: ["rgba(240,118,30,0.14)", "rgba(15,11,7,0)"],
  day: ["rgba(240,118,30,0.07)", "rgba(15,11,7,0)"],
  sandhya: ["rgba(217,164,65,0.15)", "rgba(184,74,22,0.05)", "rgba(15,11,7,0)"],
  night: ["rgba(37,45,74,0.55)", "rgba(11,14,26,0)"],
} as const;

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

/** Progress bars — the ceremony loader's, and the three slice 6 needs. */
export const progressBar = { height: 6, radius: 3 } as const;
