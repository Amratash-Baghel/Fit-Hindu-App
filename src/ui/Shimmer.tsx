/**
 * Shimmer — a diagonal shine that sweeps across its parent. This is the
 * "glinting loader" for the workout video surface (docs/specs/ui-polish.md
 * slice C) and, at a lower intensity, a premium sheen for hero cards.
 *
 * Drop it inside a positioned, `overflow:hidden` parent (AvatarTile already is
 * one) — it fills the parent as a non-interactive overlay and clips the sweep to
 * the parent's rounded box.
 *
 *   "sheen"   — a faint sweep over existing content; the app-is-alive polish.
 *   "loading" — a brighter sweep over a faint skeleton base; the
 *               media-is-loading affordance. When a real Bunny player lands
 *               later, this is its buffering state — play it until first frame.
 *
 * Technique (same as the splash's specular sweep): a LinearGradient band, tall
 * and narrow, rotated ~18° and translated left→right on a Reanimated loop with a
 * rest gap between passes. On web / reduce-motion (the motion gate is false;
 * Reanimated is inert on web here) it renders one static mid-sweep frame instead
 * — enough to verify the look in the preview, no stuck-at-zero band.
 */
import React, { useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { color } from "./tokens";
import { easing, useMotion } from "./motion";

interface Props {
  mode?: "sheen" | "loading";
  /** Shine colour. A warm cream by default so it reads as light, not a grey wash. */
  tint?: string;
  /** Sweep angle in degrees — diagonal by default. */
  angle?: number;
  /** Override the peak opacity of the sweep (per-surface tuning). */
  peak?: number;
  style?: StyleProp<ViewStyle>;
}

const SWEEP_MS = { sheen: 1200, loading: 900 } as const;
const REST_MS = { sheen: 1400, loading: 650 } as const;
const PEAK = { sheen: 0.16, loading: 0.5 } as const;

export function Shimmer({ mode = "sheen", tint = color.cream, angle = 18, peak: peakProp, style }: Props) {
  const enabled = useMotion();
  const sweepMs = SWEEP_MS[mode];
  const restMs = REST_MS[mode];
  const peak = peakProp ?? PEAK[mode];
  const loopMs = sweepMs + restMs;
  const sweepFrac = sweepMs / loopMs;

  const [size, setSize] = useState({ w: 0, h: 0 });
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const p = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    w.value = width;
    h.value = height;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  useEffect(() => {
    if (!enabled) return; // static frame; nothing to loop
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: loopMs, easing: easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [enabled, loopMs, p]);

  const bandStyle = useAnimatedStyle(() => {
    const width = w.value;
    const height = h.value;
    const bandW = Math.min(200, Math.max(60, width * 0.35));
    const from = -bandW * 1.4;
    const to = width + bandW * 1.4;
    const x = interpolate(p.value, [0, sweepFrac], [from, to], Extrapolation.CLAMP);
    const o = interpolate(
      p.value,
      [0, sweepFrac * 0.15, sweepFrac * 0.85, sweepFrac],
      [0, peak, peak, 0],
      Extrapolation.CLAMP,
    );
    return {
      width: bandW,
      height: height * 1.8,
      top: -height * 0.4,
      opacity: o,
      transform: [{ translateX: x }, { rotate: `${angle}deg` }],
    };
  });

  const gradient = (
    <LinearGradient
      colors={["transparent", tint, "transparent"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={StyleSheet.absoluteFill}
    />
  );

  // Static mid-sweep frame for web / reduce-motion (Reanimated won't tween here).
  const bandW = Math.min(200, Math.max(60, size.w * 0.35));

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, style]} pointerEvents="none" onLayout={onLayout}>
      {mode === "loading" ? <View style={[StyleSheet.absoluteFill, styles.base]} /> : null}
      {enabled ? (
        <Animated.View style={[styles.band, bandStyle]}>{gradient}</Animated.View>
      ) : size.w > 0 ? (
        <View
          style={[
            styles.band,
            {
              width: bandW,
              height: size.h * 1.8,
              top: -size.h * 0.4,
              opacity: peak,
              transform: [{ translateX: (size.w - bandW) / 2 }, { rotate: `${angle}deg` }],
            },
          ]}
        >
          {gradient}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  base: { backgroundColor: "rgba(255,255,255,0.045)" },
  band: { position: "absolute", left: 0 },
});
