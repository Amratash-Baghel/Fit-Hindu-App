/**
 * Diya — the app's lit lamp, exactly as drawn in the approved "What's Next"
 * artifact (owner ask 2026-08-18): a single gold-hi teardrop flame over a
 * gold-deep bowl, in a 24-box, flickering on the artifact's `flick` cycle —
 * 2.7s, pivoted at 50%/82%, keyframes 30%: scale(1.1,1.05) rotate(-3°),
 * 62%: scale(.94,1.02) rotate(3°).
 *
 * `delay` staggers a row so flames never sway in lockstep. `dim` renders the
 * unlit state — faded and static, no loop, no cost. `animate={false}` keeps
 * the lit look but stops the sway (a hidden flip face, a dense row). Web /
 * reduce-motion render one static lit frame (the motion gate), so the icon is
 * never blank.
 *
 * Perf: one animated node per swaying diya, transform-only, on the UI thread,
 * over static SVG. A dim or still diya costs nothing.
 */
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { color, goldGradient } from "./tokens";
import { easing, useMotion } from "./motion";

interface Props {
  size?: number;
  /** unlit: faded + still (the streak days not yet earned) */
  dim?: boolean;
  /** phase offset (ms) so a row of flames never sways in unison */
  delay?: number;
  /** false = lit but still (a hidden flip face, or a dense repeated row) */
  animate?: boolean;
}

/** The artifact's `flick` cycle. */
const FLICK_MS = 2700;
/** The bowl's gold — the deep stop of the app's own gold ramp (#B07E2B). */
const BOWL = goldGradient[2];

export function Diya({ size = 26, dim = false, delay = 0, animate = true }: Props) {
  const enabled = useMotion();
  const t = useSharedValue(0);
  const live = enabled && !dim && animate;

  useEffect(() => {
    if (!live) return;
    t.value = 0;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: FLICK_MS, easing: easing.inOut }), -1, false),
    );
    return () => cancelAnimation(t);
  }, [live, delay, t]);

  // transform-origin 50% 82% of the 24-box: the translate sandwich moves the
  // pivot down to the flame's base so it sways like a flame, never slides.
  const pivotY = (0.82 - 0.5) * size;
  const flameStyle = useAnimatedStyle(() => {
    const rot = interpolate(t.value, [0, 0.3, 0.62, 1], [0, -3, 3, 0]);
    const sx = interpolate(t.value, [0, 0.3, 0.62, 1], [1, 1.1, 0.94, 1]);
    const sy = interpolate(t.value, [0, 0.3, 0.62, 1], [1, 1.05, 1.02, 1]);
    return {
      transform: [
        { translateY: pivotY },
        { rotate: `${rot}deg` },
        { scaleX: sx },
        { scaleY: sy },
        { translateY: -pivotY },
      ],
    };
  });

  // the artifact's two paths, verbatim
  const flame = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3c2 2.2 3 4 3 5.6 0 1.9-1.3 3.2-3 3.2s-3-1.3-3-3.2C9 7 10 5.2 12 3z"
        fill={color.goldHi}
      />
    </Svg>
  );
  const bowl = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 15.5h15c-.6 2.6-3.7 4.2-7.5 4.2s-6.9-1.6-7.5-4.2z" fill={BOWL} />
    </Svg>
  );

  return (
    <View style={{ width: size, height: size, opacity: dim ? 0.3 : 1 }}>
      {/* the bowl — still */}
      <View style={StyleSheet.absoluteFill}>{bowl}</View>
      {/* the flame — alive */}
      {live ? (
        <Animated.View style={[StyleSheet.absoluteFill, flameStyle]}>{flame}</Animated.View>
      ) : (
        <View style={StyleSheet.absoluteFill}>{flame}</View>
      )}
    </View>
  );
}
