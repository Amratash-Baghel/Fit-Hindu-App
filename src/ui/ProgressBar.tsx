/**
 * ProgressBar — the one bar for all of slice 6's progress surfaces (in-session
 * sets, plan days, per-body-area) and anything after them.
 *
 * Default is STATIC and free: a plain width change, no Reanimated, no shared
 * value per bar — which matters on the body-area list where several render at
 * once. Pass `animated` to opt a single, on-screen bar into a smooth fill
 * (the session progress, the Home milestone bar) — it grows on the UI thread by
 * animating `scaleX` (a transform, never a per-frame layout) and no-ops to the
 * final width on web / reduce-motion. Do NOT set `animated` on list rows.
 *
 * Colour follows the locked design rule: gold is reserved for the primary
 * action and the streak, so progress defaults to saffron and only opts into
 * gold where it is genuinely showing the sankalp.
 */
import React, { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { color, progressBar, space } from "./tokens";
import { duration, easing, useMotion } from "./motion";
import { T } from "./Text";

interface Props {
  /** Completed amount. Values above `max` are clamped — a user who trains past
   *  the end of a program should see a full bar, never an overflowing one. */
  value: number;
  max: number;
  tone?: "saffron" | "gold";
  /** Smoothly grow the fill instead of snapping. For single on-screen bars only. */
  animated?: boolean;
  /** Already-localised caption rendered above the bar (use t()/loc() to build
   *  it — this component never touches the string catalog). */
  label?: string;
  /** Already-localised right-aligned value, e.g. "3/7". */
  trailing?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ value, max, tone = "saffron", animated = false, label, trailing, style }: Props) {
  // max <= 0 would make the fraction NaN or Infinity; treat it as "nothing to
  // show yet" rather than letting it reach the width style.
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const pct = Math.round(fraction * 100);
  const fill = tone === "gold" ? color.gold : color.saffron;

  return (
    <View style={style}>
      {label || trailing ? (
        <View style={styles.head}>
          {label ? (
            <T variant="caption" tone="muted" style={styles.label} numberOfLines={1}>
              {label}
            </T>
          ) : null}
          {trailing ? (
            <T variant="caption" tone="soft" style={styles.trailing}>
              {trailing}
            </T>
          ) : null}
        </View>
      ) : null}
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        {animated ? (
          <AnimatedFill fraction={fraction} color={fill} />
        ) : (
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fill }]} />
        )}
      </View>
    </View>
  );
}

/** The animated fill: a full-width bar scaled from the left edge. scaleX is a
 *  transform, so the grow stays on the UI thread and never triggers layout. */
function AnimatedFill({ fraction, color: fillColor }: { fraction: number; color: string }) {
  const enabled = useMotion();
  const sx = useSharedValue(enabled ? 0 : fraction);

  useEffect(() => {
    if (!enabled) {
      sx.value = fraction;
      return;
    }
    sx.value = withTiming(fraction, { duration: duration.slow, easing: easing.out });
  }, [enabled, fraction, sx]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: sx.value }] }));

  return <Animated.View style={[styles.fill, styles.animatedFill, { backgroundColor: fillColor }, animStyle]} />;
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: space.sm,
    marginBottom: space.xs,
  },
  label: { flex: 1 },
  trailing: { fontVariant: ["tabular-nums"] },
  track: {
    height: progressBar.height,
    borderRadius: progressBar.radius,
    backgroundColor: color.surface2,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: progressBar.radius },
  animatedFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, transformOrigin: "left" },
});
