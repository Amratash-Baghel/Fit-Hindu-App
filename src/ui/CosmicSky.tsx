/**
 * CosmicSky — the ceremony's space backdrop (owner ask 2026-08-18: a
 * completion should feel like "getting connected to the universe"). A deep
 * night-indigo veil settles over the ink ground, faint colour nebulas give it
 * depth, two vast dashed orbit rings turn almost imperceptibly, and a field of
 * stars twinkles in and out — each on its own phase, so stars are always
 * arriving and dying somewhere. Dropped behind EVERY completion ceremony
 * (Purna, workout/meditation complete, the jap/sleep/diet RewardOverlay) so
 * "done" reads as the same cosmic moment everywhere.
 *
 * Perf contract: mounted only while a ceremony is on screen (all short-lived
 * surfaces), so the loops never run at idle. Each star is one Animated.View
 * looping opacity/scale on the UI thread over a plain dot view; the orbits are
 * two slow rotate loops over static SVG; veil + nebulas are static. Web /
 * reduce-motion renders a still sky with varied star brightness (no loops), so
 * the moment still reads as a night sky in a screenshot.
 */
import React, { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { color, cosmos, pillar } from "./tokens";
import { easing, useMotion } from "./motion";

/**
 * The star chart — deterministic, edge-weighted (the ceremony's content owns
 * the centre). x/y in % of the field, s in dp, c indexes `cosmos.star`,
 * d = phase delay (ms), p = one full twinkle (ms).
 */
const STARS: { x: number; y: number; s: number; c: number; d: number; p: number }[] = [
  { x: 8, y: 6, s: 3, c: 0, d: 0, p: 2600 },
  { x: 22, y: 14, s: 2, c: 1, d: 900, p: 3400 },
  { x: 38, y: 4, s: 2.5, c: 2, d: 1700, p: 2900 },
  { x: 55, y: 11, s: 4, c: 0, d: 400, p: 3800 },
  { x: 72, y: 6, s: 2, c: 3, d: 2200, p: 2700 },
  { x: 88, y: 13, s: 3, c: 1, d: 1300, p: 3200 },
  { x: 94, y: 30, s: 2, c: 0, d: 600, p: 2500 },
  { x: 5, y: 28, s: 2.5, c: 2, d: 1900, p: 3600 },
  { x: 15, y: 45, s: 2, c: 1, d: 200, p: 3000 },
  { x: 90, y: 48, s: 3.5, c: 0, d: 1500, p: 3300 },
  { x: 4, y: 62, s: 2, c: 3, d: 1000, p: 2800 },
  { x: 94, y: 66, s: 2, c: 2, d: 2500, p: 3700 },
  { x: 10, y: 80, s: 3, c: 0, d: 300, p: 3100 },
  { x: 26, y: 90, s: 2, c: 1, d: 1600, p: 2600 },
  { x: 46, y: 95, s: 2.5, c: 2, d: 800, p: 3500 },
  { x: 64, y: 89, s: 3, c: 0, d: 2000, p: 2900 },
  { x: 81, y: 93, s: 2, c: 3, d: 1200, p: 3400 },
  { x: 70, y: 76, s: 2, c: 1, d: 2300, p: 2500 },
];

/** One star: opacity (and a touch of scale) breathing 0 → bright → 0 forever,
 *  offset by its own phase so the sky never twinkles in unison. */
function TwinkleStar({
  x,
  y,
  s,
  tint,
  delayMs,
  period,
  rest,
}: {
  x: number;
  y: number;
  s: number;
  tint: string;
  delayMs: number;
  period: number;
  /** static brightness under the motion gate (varied per star) */
  rest: number;
}) {
  const enabled = useMotion();
  const t = useSharedValue(enabled ? 0 : rest);

  useEffect(() => {
    if (!enabled) return;
    t.value = 0;
    t.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: period / 2, easing: easing.inOut }),
          withTiming(0, { duration: period / 2, easing: easing.inOut }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [enabled, delayMs, period, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.06 + t.value * 0.86,
    transform: [{ scale: 0.6 + t.value * 0.55 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: s,
          height: s,
          borderRadius: s / 2,
          backgroundColor: tint,
        },
        style,
      ]}
    />
  );
}

/** One vast dashed orbit ring, turning so slowly it reads as the sky itself
 *  moving. Static (unturning) under the motion gate. */
function Orbit({
  d,
  tint,
  opacity,
  turnMs,
  reverse = false,
}: {
  d: number;
  tint: string;
  opacity: number;
  turnMs: number;
  reverse?: boolean;
}) {
  const enabled = useMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: turnMs, easing: easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [enabled, turnMs, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(reverse ? -360 : 360) * t.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", width: d, height: d }, style]}>
      <Svg width={d} height={d} viewBox="0 0 100 100">
        <Circle
          cx="50"
          cy="50"
          r="49.5"
          fill="none"
          stroke={tint}
          strokeWidth={0.3}
          strokeDasharray="1.1 6.5"
          opacity={opacity}
        />
      </Svg>
    </Animated.View>
  );
}

export function CosmicSky() {
  const { width } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* the deep-space veil over the ink ground */}
      <LinearGradient
        colors={[...cosmos.veil]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* faint nebulas — a cool cloud high, a warm one low — pure depth */}
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="cosmicNebCool" cx="78%" cy="16%" r="55%">
            <Stop offset="0" stopColor={cosmos.nebulaCool} stopOpacity="0.13" />
            <Stop offset="1" stopColor={cosmos.nebulaCool} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="cosmicNebWarm" cx="16%" cy="88%" r="60%">
            <Stop offset="0" stopColor={cosmos.nebulaWarm} stopOpacity="0.09" />
            <Stop offset="1" stopColor={cosmos.nebulaWarm} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#cosmicNebCool)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#cosmicNebWarm)" />
      </Svg>

      {/* the orbits — centred on the ceremony, wider than the screen */}
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Orbit d={width * 1.4} tint={color.gold} opacity={0.2} turnMs={140000} />
        <Orbit d={width * 1.05} tint={pillar.mind} opacity={0.16} turnMs={90000} reverse />
      </View>

      {/* the stars, always arriving and dying somewhere */}
      {STARS.map((st, i) => (
        <TwinkleStar
          key={i}
          x={st.x}
          y={st.y}
          s={st.s}
          tint={cosmos.star[st.c]}
          delayMs={st.d}
          period={st.p}
          rest={0.15 + ((i * 53) % 60) / 100}
        />
      ))}
    </View>
  );
}
