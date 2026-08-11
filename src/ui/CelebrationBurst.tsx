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
import { DiyaIcon } from "./icons";
import { useMotion } from "./motion";
import { feedback } from "../lib/feedback";

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
 * CompletionDiya — the whole reward moment as one drop-in: a diya that LIGHTS
 * (a slow warm glow blooms behind it and it swells in), holds a beat, then the
 * spark burst radiates. Both the workout- and meditation-complete screens use
 * this so the timing stays identical and tunable in one place (owner feedback
 * 2026-08-08: the light-up and burst were too fast).
 */
export function CompletionDiya({
  diyaSize = 72,
  burstSize = 220,
  rays = 12,
  celebrate = false,
}: {
  diyaSize?: number;
  burstSize?: number;
  rays?: number;
  /** Fire the reward-burst haptic (feedback.rewardBurst) on mount, timed to this
   *  diya's light-up + spark burst. Off by default so the calm surfaces
   *  (meditation) stay gentle; the workout-complete + Fit-Points reward screens
   *  opt in. */
  celebrate?: boolean;
}) {
  const enabled = useMotion();
  // Drives the diya lighting up: 0 = cold/small/dark, 1 = fully lit.
  const lit = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) return;
    lit.value = 0;
    // ~1s ignite — slow enough to read as "the flame catches".
    lit.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [enabled, lit]);

  // The haptic twin of the burst — fires here, on the diya's own mount, so it
  // stays in sync with the sparks whether this is a pushed completion screen
  // (workout) or a modal that mounts later (the Fit-Points RewardOverlay).
  // ramp:false when motion is off, since the burst then renders as one static
  // frame with nothing to sync a ramp to. Returns rewardBurst's cancel fn.
  useEffect(() => {
    if (!celebrate) return;
    return feedback.rewardBurst({ ramp: enabled });
  }, [celebrate, enabled]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(lit.value, [0, 1], [0, 0.42]),
    transform: [{ scale: interpolate(lit.value, [0, 1], [0.5, 1.15]) }],
  }));
  const diyaStyle = useAnimatedStyle(() => ({
    opacity: interpolate(lit.value, [0, 0.5, 1], [0.18, 0.7, 1]),
    transform: [{ scale: interpolate(lit.value, [0, 1], [0.82, 1]) }],
  }));

  return (
    <View style={{ width: burstSize, height: burstSize * 0.62, alignItems: "center", justifyContent: "center" }}>
      {/* the warm halo the flame throws — blooms as it lights */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: diyaSize * 2.4,
            height: diyaSize * 2.4,
            borderRadius: diyaSize * 1.2,
            backgroundColor: color.saffron,
          },
          glowStyle,
        ]}
      />
      {/* the spark burst — held back until the diya has caught (delay) */}
      <View style={{ position: "absolute" }} pointerEvents="none">
        <CelebrationBurst size={burstSize} rays={rays} delay={1100} />
      </View>
      <Animated.View style={diyaStyle}>
        <DiyaIcon size={diyaSize} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center" },
  ray: {
    position: "absolute",
    width: 4,
    height: 16,
    borderRadius: 2,
  },
});
