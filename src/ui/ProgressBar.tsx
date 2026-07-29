/**
 * ProgressBar — the one bar for all three of slice 6's progress surfaces
 * (in-session sets, plan days, per-body-area) and anything after them.
 *
 * Deliberately NOT animated. These bars move on discrete events — a set is
 * logged, a day completes — not continuously, so a plain width change is both
 * correct and free. Reanimated here would buy nothing and cost a shared value
 * per bar, which matters on the body-area list where several render at once.
 *
 * Colour follows the locked design rule: gold is reserved for the primary
 * action and the streak, so progress defaults to saffron and only opts into
 * gold where it is genuinely showing the sankalp.
 */
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { color, progressBar, space } from "./tokens";
import { T } from "./Text";

interface Props {
  /** Completed amount. Values above `max` are clamped — a user who trains past
   *  the end of a program should see a full bar, never an overflowing one. */
  value: number;
  max: number;
  tone?: "saffron" | "gold";
  /** Already-localised caption rendered above the bar (use t()/loc() to build
   *  it — this component never touches the string catalog). */
  label?: string;
  /** Already-localised right-aligned value, e.g. "3/7". */
  trailing?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ value, max, tone = "saffron", label, trailing, style }: Props) {
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
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fill }]} />
      </View>
    </View>
  );
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
});
