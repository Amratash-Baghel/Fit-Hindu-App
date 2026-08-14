/**
 * Diya — the living diya: the mockup's `.flame` flicker (bms-redesign-v2 +
 * the what's-next plan both animate every lit diya), ported as a two-layer
 * icon. The clay bowl is static SVG; the flame rides its own Animated layer,
 * swaying and breathing on a 2.6s loop pivoted at the flame's base — exactly
 * the mockup keyframes (30%: scale 1.12/1.06 rotate -3°, 60%: .93/1.03 +3°).
 *
 * `delay` staggers a row of diyas so they never sway in lockstep (the mockup
 * gives every diya its own phase). `dim` renders the unlit state — static,
 * faded, no loop, no cost. Web / reduce-motion renders the lit diya as one
 * static frame (the motion gate), so the icon is never blank.
 *
 * Perf: one animated node per lit diya, transform-only, UI thread. A dim diya
 * costs nothing.
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
import { color } from "./tokens";
import { easing, useMotion } from "./motion";

interface Props {
  size?: number;
  /** unlit: faded + still (the streak days not yet earned) */
  dim?: boolean;
  /** phase offset (ms) so a row of flames never sways in unison */
  delay?: number;
}

/** One full sway of the flame — the mockup's `flick` 2.6s cycle. */
const FLICK_MS = 2600;

export function Diya({ size = 26, dim = false, delay = 0 }: Props) {
  const enabled = useMotion();
  const t = useSharedValue(0);
  const live = enabled && !dim;

  useEffect(() => {
    if (!live) return;
    t.value = 0;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: FLICK_MS, easing: easing.inOut }), -1, false),
    );
    return () => cancelAnimation(t);
  }, [live, delay, t]);

  // The flame pivots at its base (y≈11 of the 24-box): the translate sandwich
  // moves the rotation/scale origin down from the layer's centre to the base,
  // so the flame sways like a flame and never slides off the wick.
  const pivotY = ((11 - 12) / 24) * size;
  const flameStyle = useAnimatedStyle(() => {
    const rot = interpolate(t.value, [0, 0.3, 0.6, 1], [0, -3, 3, 0]);
    const sx = interpolate(t.value, [0, 0.3, 0.6, 1], [1, 1.12, 0.93, 1]);
    const sy = interpolate(t.value, [0, 0.3, 0.6, 1], [1, 1.06, 1.03, 1]);
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

  const flame = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3c1.8 2 1.4 3.8 0 5-1.4-1.2-1.8-3 0-5z" fill={color.goldHi} />
      <Path d="M12 8.5c.9 1 .7 1.9 0 2.5-.7-.6-.9-1.5 0-2.5z" fill={color.saffron} />
    </Svg>
  );

  return (
    <View style={{ width: size, height: size, opacity: dim ? 0.3 : 1 }}>
      {/* the clay bowl — still */}
      <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
        <Path d="M4 13h16c0 3.3-3.6 6-8 6s-8-2.7-8-6z" fill={color.saffronDeep} />
      </Svg>
      {/* the flame — alive */}
      {live ? (
        <Animated.View style={[StyleSheet.absoluteFill, flameStyle]}>{flame}</Animated.View>
      ) : (
        <View style={StyleSheet.absoluteFill}>{flame}</View>
      )}
    </View>
  );
}
