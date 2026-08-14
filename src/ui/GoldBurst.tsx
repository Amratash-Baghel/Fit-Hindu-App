/**
 * GoldBurst — the "gold burst" beat of the completion grammar (plan artifact
 * "One grammar of completion": tick → gold burst → ring fills → streak settles),
 * as a drop-in overlay for the primary gold Button. On each press a ring of gold
 * sparks flies outward from the button's centre and fades — the shared reward
 * flourish the owner asked to ride every main gold action.
 *
 * Fire-and-rest: it does NOTHING until `trigger` increments, then plays one
 * ~600ms burst and returns to invisible. No loop, so a screen full of gold
 * buttons costs nothing at idle (low-end Android rule). Web / reduce-motion
 * renders nothing — the press still lands via the button's own onPress.
 *
 * Perf: transform + opacity only, on the UI thread; ~10 tiny views per press.
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

const SPARK_COLORS = [color.goldHi, color.gold, color.saffron];
const BURST_MS = 620;

export function GoldBurst({
  trigger,
  /** diameter of the field the sparks reach across */
  size = 150,
  count = 10,
}: {
  trigger: number;
  size?: number;
  count?: number;
}) {
  const enabled = useMotion();
  const t = useSharedValue(1); // 1 = at rest (invisible)

  useEffect(() => {
    if (!enabled || trigger === 0) return;
    t.value = 0;
    t.value = withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) });
  }, [enabled, trigger, t]);

  if (!enabled) return null;
  const dist = size / 2;

  return (
    <View pointerEvents="none" style={styles.root}>
      {Array.from({ length: count }).map((_, i) => (
        <Spark
          key={i}
          angle={(360 / count) * i + (i % 2 ? 18 : 0)}
          dist={dist}
          t={t}
          tint={SPARK_COLORS[i % SPARK_COLORS.length]}
        />
      ))}
    </View>
  );
}

function Spark({
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
    const r = interpolate(t.value, [0, 1], [dist * 0.2, dist]);
    return {
      opacity: interpolate(t.value, [0, 0.3, 1], [0, 1, 0]),
      transform: [
        { rotate: `${angle}deg` },
        { translateY: -r },
        { scale: interpolate(t.value, [0, 0.4, 1], [0.5, 1, 0.25]) },
      ],
    };
  });
  return <Animated.View style={[styles.spark, { backgroundColor: tint }, style]} />;
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  spark: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
