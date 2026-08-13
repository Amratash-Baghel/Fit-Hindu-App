/**
 * GoldWash — the full-screen gold glow that blesses a completion (mockup
 * #goldwash, now app-wide): a warm radial blooms over the whole surface and
 * dies away in about a second. It is the shared "glow splash" every earned
 * moment fires — module complete, mala complete, blessing revealed, Purna —
 * so the reward grammar reads identically everywhere.
 *
 * Two ways to fire:
 *   - mount-play (default): plays once when it mounts — drop it into a modal
 *     or a completion screen and the open IS the trigger.
 *   - `trigger`: increment past 0 to fire on demand from a long-lived screen
 *     (Home's blessing card), resting invisible between plays.
 *
 * Perf contract: one animated node, opacity only, UI thread, over a static
 * SVG gradient. No-op under the motion gate (web / reduce-motion) — the
 * moment it decorates still lands via its own screen state.
 */
 
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { color } from "./tokens";
import { useMotion } from "./motion";

const WASH_MS = 1150;

export function GoldWash({ trigger = 1 }: { trigger?: number }) {
  const enabled = useMotion();
  const t = useSharedValue(1); // 1 = at rest (invisible)

  useEffect(() => {
    if (!enabled || trigger === 0) return;
    t.value = 0;
    t.value = withTiming(1, { duration: WASH_MS, easing: Easing.out(Easing.quad) });
  }, [enabled, trigger, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 1], [0, 1, 0]),
  }));

  if (!enabled) return null;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="goldWashG" cx="50%" cy="46%" r="55%">
            <Stop offset="0" stopColor={color.goldHi} stopOpacity="0.4" />
            <Stop offset="0.48" stopColor={color.saffron} stopOpacity="0.12" />
            <Stop offset="0.78" stopColor={color.saffron} stopOpacity="0" />
            <Stop offset="1" stopColor={color.saffron} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#goldWashG)" />
      </Svg>
    </Animated.View>
  );
}
