/**
 * CelebrationBurst — gold diya-sparks that radiate out and fade, played once
 * behind the diya on a completion screen (docs/specs/ui-polish.md slice D).
 *
 * Deliberately NOT confetti: this is a devotional app, so the reward reads as
 * sparks/rays from a lit diya, in the app's own gold/saffron, never party
 * emoji. It fires a single ~900ms burst on mount (or when `play` flips true),
 * then rests invisible — it never loops, so it costs nothing after it plays.
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
}

const RAY_COLORS = [color.goldHi, color.gold, color.saffron];

export function CelebrationBurst({ size = 220, rays = 12, play }: Props) {
  const enabled = useMotion();
  // 0 = at centre / invisible, 1 = fully radiated / faded. Static mid-burst on
  // web + reduce-motion so the shape still shows.
  const t = useSharedValue(enabled ? 0 : 0.55);

  useEffect(() => {
    if (!enabled) return;
    if (play === false) return; // caller is gating; not yet
    t.value = 0;
    t.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [enabled, play, t]);

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
    const o = interpolate(t.value, [0, 0.2, 1], [0, 1, 0]);
    const sc = interpolate(t.value, [0, 0.3, 1], [0.4, 1, 0.7]);
    return {
      opacity: o,
      transform: [{ rotate: `${angle}deg` }, { translateY: -r }, { scale: sc }],
    };
  });
  return <Animated.View style={[styles.ray, { backgroundColor: tint }, style]} />;
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
