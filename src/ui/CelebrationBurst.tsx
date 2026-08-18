/**
 * CelebrationBurst — gold diya-sparks that radiate out and fade, played once
 * behind the diya on a completion screen (docs/specs/ui-polish.md slice D).
 *
 * Deliberately NOT confetti: this is a devotional app, so the reward reads as
 * sparks/rays from a lit diya, in the app's own gold/saffron, never party
 * emoji. It fires a single burst on mount (or when `play` flips true), then
 * rests invisible — it never loops, so it costs nothing after it plays.
 *
 * Timing (owner feedback 2026-08-08): the burst is deliberately UNHURRIED — it
 * waits a beat after the diya has lit, then radiates slowly, so the moment
 * registers instead of flashing past. `delay` holds it; the sweep itself is
 * ~1500ms.
 *
 * Non-interactive; drop it centered behind the completion diya. On web /
 * reduce-motion it renders one faint mid-burst frame (so the preview screenshot
 * still shows the shape) rather than an inert blank.
 */
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { color } from "./tokens";
import { useMotion } from "./motion";

interface Props {
  /** Diameter of the burst field (sparks reach ~radius/2 out). */
  size?: number;
  /** Number of rays. */
  rays?: number;
  /** Flip to true to (re)fire. If omitted it fires once on mount. */
  play?: boolean;
  /** Hold before the burst begins (ms) — the pause that lets the diya light
   *  first. */
  delay?: number;
}

const RAY_COLORS = [color.goldHi, color.gold, color.saffron];
/** One slow, noticeable sweep — was 900ms, now unhurried. */
const BURST_MS = 1500;

export function CelebrationBurst({ size = 220, rays = 12, play, delay = 0 }: Props) {
  const enabled = useMotion();
  // 0 = at centre / invisible, 1 = fully radiated / faded. Static mid-burst on
  // web + reduce-motion so the shape still shows.
  const t = useSharedValue(enabled ? 0 : 0.55);

  useEffect(() => {
    if (!enabled) return;
    if (play === false) return; // caller is gating; not yet
    t.value = 0;
    t.value = withDelay(delay, withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
  }, [enabled, play, delay, t]);

  const dist = size / 2;

  return (
    <View pointerEvents="none" style={[styles.root, { width: size, height: size }]}>
      {Array.from({ length: rays }).map((_, i) => (
        <Ray key={i} angle={(360 / rays) * i} dist={dist} t={t} tint={RAY_COLORS[i % RAY_COLORS.length]} />
      ))}
    </View>
  );
}

function Ray({
  angle,
  dist,
  t,
  tint,
}: {
  angle: number;
  dist: number;
  t: SharedValue<number>;
  tint: string;
}) {
  const style = useAnimatedStyle(() => {
    const r = interpolate(t.value, [0, 1], [dist * 0.15, dist]);
    // Slower fade-in (0 → 0.35) so the sparks are visibly present, not a flash.
    const o = interpolate(t.value, [0, 0.35, 1], [0, 1, 0]);
    const sc = interpolate(t.value, [0, 0.4, 1], [0.4, 1, 0.7]);
    return {
      opacity: o,
      transform: [{ rotate: `${angle}deg` }, { translateY: -r }, { scale: sc }],
    };
  });
  return <Animated.View style={[styles.ray, { backgroundColor: tint }, style]} />;
}

/**
 * StarField — the twinkling gold stars of the reward moment (the plan's "gold
 * burst, animated with stars"). Bright spark-stars fly out from the diya,
 * twinkle (swell then shrink) and fade, layered over the CelebrationBurst rays
 * so a completion reads as a shower of stars, not just light beams. Plain Views
 * (no per-star SVG), transform/opacity only; one-shot, held back by `delay`
 * until the diya has caught. Static mid-frame on web / reduce-motion.
 */
// design-system tokens only — the near-white sparkle is `cream`, not a bespoke hex
const STAR_COLORS = [color.goldHi, color.cream, color.gold, color.saffron];

export function StarField({ size, count = 11, delay = 0 }: { size: number; count?: number; delay?: number }) {
  const enabled = useMotion();
  const t = useSharedValue(enabled ? 0 : 0.5);
  useEffect(() => {
    if (!enabled) return;
    t.value = 0;
    t.value = withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }));
  }, [enabled, delay, t]);
  const dist = size / 2;
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          angle={(360 / count) * i + (i % 2 ? 16 : -8)}
          dist={dist * (i % 3 === 0 ? 0.98 : 0.78)}
          dot={i % 3 === 0 ? 7 : 5}
          tint={STAR_COLORS[i % STAR_COLORS.length]}
          t={t}
        />
      ))}
    </View>
  );
}

function Star({
  angle,
  dist,
  dot,
  tint,
  t,
}: {
  angle: number;
  dist: number;
  dot: number;
  tint: string;
  t: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 0.72, 1], [0, 1, 0.85, 0]),
    transform: [
      { rotate: `${angle}deg` },
      { translateY: -interpolate(t.value, [0, 1], [dist * 0.12, dist]) },
      // twinkle: swell past 1, then shrink — a spark catching and dying
      { scale: interpolate(t.value, [0, 0.34, 0.68, 1], [0.2, 1.25, 0.85, 0.3]) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", width: dot, height: dot, borderRadius: dot / 2, backgroundColor: tint },
        style,
      ]}
    />
  );
}

// CompletionDiya (the diya + burst reward moment) lived here until 2026-08-18
// — the owner replaced it with the Purna TrinityMark on every reward screen
// (src/ui/Purna.tsx). CelebrationBurst + StarField stay as primitives.

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center" },
  ray: {
    position: "absolute",
    width: 4,
    height: 16,
    borderRadius: 2,
  },
});
