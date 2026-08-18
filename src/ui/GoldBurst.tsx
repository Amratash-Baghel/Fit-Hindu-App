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
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { color } from "./tokens";
import { GOLD_WASH_RAMP } from "./GoldWash";
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

/**
 * GoldGlow — the demo artifact's press glow, exactly (owner ask 2026-08-18:
 * the "Mark Complete" glow from the approved mockup on EVERY gold button).
 * The mockup answers a gold press with `goldwash` — a SCREEN-sized radial in
 * the shared GOLD_WASH_RAMP that swells in fast and dies away slow (1.15s,
 * opacity only, no travel) — plus the ring bloom PressableScale already
 * draws on the button itself. This is that wash: a disc wider than the
 * screen, centred on the pressed button, faded through the mockup's exact
 * gwash envelope. Fire-and-rest via `trigger`; nothing renders under the
 * motion gate.
 *
 * Perf: one animated node, opacity only, UI thread, over one static SVG
 * gradient rasterised at mount, never at press.
 */
const GLOW_MS = 1150; // the mockup's gwash 1.15s

export function GoldGlow({ trigger }: { trigger: number }) {
  const enabled = useMotion();
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(1); // 1 = at rest (invisible)

  useEffect(() => {
    if (!enabled || trigger === 0) return;
    t.value = 0;
    t.value = withTiming(1, { duration: GLOW_MS, easing: Easing.out(Easing.quad) });
  }, [enabled, trigger, t]);

  const style = useAnimatedStyle(() => ({
    // the mockup's gwash keyframes: 0% → 0, 20% → 1, 100% → 0
    opacity: interpolate(t.value, [0, 0.2, 1], [0, 1, 0]),
  }));

  if (!enabled) return null;

  // wider than the screen from wherever the button sits — the wash reads as
  // the whole surface lighting, exactly like the demo
  const d = Math.max(width, height) * 1.35;

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View style={[{ width: d, height: d }, style]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="goldGlowG" cx="50%" cy="50%" r="50%">
              {GOLD_WASH_RAMP.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#goldGlowG)" />
        </Svg>
      </Animated.View>
    </View>
  );
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
