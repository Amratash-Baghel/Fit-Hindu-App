/**
 * Motion tokens + the motion gate — the ONE source of animation timing and
 * spring config, same standing rule as color/space/type: components and screens
 * never hardcode a duration or a spring, they use these. Introduced by the UI
 * polish pass (docs/specs/ui-polish.md slice A).
 *
 * These are plain config objects handed to withTiming/withSpring; importing this
 * file pulls in no native code. All motion in the app runs on the UI thread via
 * Reanimated 4 worklets (babel plugin already wired in babel.config.js) — the
 * low-end-Android rule from the risk register.
 *
 * `useMotion()` is the gate every animated component checks:
 *  - It is FALSE on react-native-web, where Reanimated does not drive animations
 *    in this project (see the note in CeremonyLoader.tsx) — the web preview is a
 *    verification surface, not a shipping target.
 *  - It is FALSE when the OS "reduce motion" flag is on — an accessibility ask
 *    we honour everywhere.
 * When it is false, callers assign shared values outright / render the final
 * static frame instead of tweening.
 *
 * It reads Reanimated's `useReducedMotion()`, which resolves SYNCHRONOUSLY on
 * the first render (Reanimated caches the OS setting at startup). That matters:
 * one-shot components like `Reveal` and `CelebrationBurst` fire their animation
 * in their very first effect, so a value that only corrected itself after an
 * async `AccessibilityInfo` round-trip would let those play in full for a
 * reduce-motion user (the bug the first code-review caught). Synchronous → they
 * get the right answer before they ever start.
 */
import { Easing, useReducedMotion } from "react-native-reanimated";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

/** Durations (ms). `sheen` is one glint sweep of the Shimmer. */
export const duration = {
  fast: 140,
  base: 220,
  slow: 360,
  count: 800, // number count-up
  sheen: 1200, // one shine sweep
  splash: 680, // one tap-ripple opening out (mockup .tapripple)
  ripple: 3900, // one ambient coin-ripple breath (mockup .rw/.rg cycle)
} as const;

export const easing = {
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.quad),
  linear: Easing.linear,
} as const;

/**
 * Spring presets. `press` is snappy — a tap must feel instant; `gentle` is for
 * entrances and blooms that should settle without a toy-like overshoot.
 */
export const spring = {
  press: { damping: 18, stiffness: 260, mass: 0.6 },
  gentle: { damping: 20, stiffness: 150, mass: 0.9 },
} as const;

/** How far a pressable dips on press (scale). Buttons dip a touch more than the
 *  big content cards, which would look jumpy at the button's depth. */
export const pressScale = {
  button: 0.96,
  card: 0.98,
} as const;

/**
 * Whether real motion should play right now. False on web (Reanimated inert
 * here) and under OS reduce-motion. See the file header — the reduce-motion read
 * is synchronous, so it is correct on the first render.
 */
export function useMotion(): boolean {
  const reduced = useReducedMotion();
  return !isWeb && !reduced;
}
