/**
 * Diya — the ceremony diya from the approved native artifact
 * (docs/mockups/bms-next-ideas.html `.cere-in .diya`, owner ask 2026-08-18:
 * "the exact diya, with its glow"): a gold teardrop flame with a cream-hot
 * core, over a wide bowl that ramps goldHi → deep gold with a solid rim.
 * The artifact wraps it in a soft gold drop-shadow — here that glow is a
 * static radial bloom behind the lamp, so a lit diya always sits in its own
 * light.
 *
 * The flame keeps the mockup's `flick` sway (2.6s loop, pivoted at the base;
 * 30%: scale 1.12/1.06 rotate -3°, 60%: .93/1.03 +3°). `delay` staggers a
 * row so flames never sway in lockstep; `dim` renders the unlit state —
 * static, faded, glowless, no loop, no cost. Web / reduce-motion render the
 * lit diya as one static frame (the motion gate), so the icon is never blank.
 *
 * Perf: one animated node per lit diya, transform-only, UI thread; the glow
 * and lamp are static SVG. A dim diya costs nothing.
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
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Circle,
  Stop,
} from "react-native-svg";
import { color, goldGradient } from "./tokens";
import { easing, useMotion } from "./motion";

interface Props {
  size?: number;
  /** unlit: faded + still + glowless (the streak days not yet earned) */
  dim?: boolean;
  /** phase offset (ms) so a row of flames never sways in unison */
  delay?: number;
  /** Set false to render a still flame — for a face that is currently hidden
   *  (the blessing flip) or dense rows where a loop would burn frames unseen.
   *  Lit visuals stay identical; only the sway stops. */
  animate?: boolean;
}

/** One full sway of the flame — the mockup's `flick` 2.6s cycle. */
const FLICK_MS = 2600;

/** The artifact's flame-core cream (#FFF3D6) — warmer than text cream, used
 *  nowhere else; the bowl deep is goldGradient's own deep stop. */
const FLAME_CORE = "#FFF3D6";
const BOWL_DEEP = goldGradient[2];

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

  // The artifact is a 60×46 lamp; it sits centred in this square icon box.
  const w = size;
  const h = (size * 46) / 60;
  const top = (size - h) / 2;

  // The flame pivots at its base (y≈17 of the 46-box): the translate sandwich
  // moves the rotation/scale origin down from the layer's centre to the base,
  // so the flame sways like a flame and never slides off the wick.
  const pivotY = ((17 - 23) / 46) * h;
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

  // the artifact's drop-shadow glow, as a radial bloom the lamp rests in
  const glow = (
    <Svg width={size * 2} height={size * 2} viewBox="0 0 100 100" style={{ position: "absolute", left: -size / 2, top: -size / 2 }}>
      <Defs>
        <RadialGradient id="diyaGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color.goldHi} stopOpacity="0.5" />
          <Stop offset="0.55" stopColor={color.goldHi} stopOpacity="0.14" />
          <Stop offset="1" stopColor={color.goldHi} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill="url(#diyaGlow)" />
    </Svg>
  );

  // the artifact's flame: gold teardrop + cream-hot core
  const flame = (
    <Svg width={w} height={h} viewBox="0 0 60 46">
      <Path d="M30 4c1.6 5 1.6 9 0 13-1.6-4-1.6-8 0-13Z" fill={color.goldHi} />
      <Path d="M30 6c1 3.4 1 6 0 9-1-3-1-5.6 0-9Z" fill={FLAME_CORE} />
    </Svg>
  );

  // the artifact's bowl: goldHi → deep-gold ramp with the solid rim ellipse
  const bowl = (
    <Svg width={w} height={h} viewBox="0 0 60 46">
      <Defs>
        <SvgLinearGradient id="diyaBowl" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color.goldHi} />
          <Stop offset="1" stopColor={BOWL_DEEP} />
        </SvgLinearGradient>
      </Defs>
      <Path d="M8 26c4 8 40 8 44 0 2 6-6 12-22 12S6 32 8 26Z" fill="url(#diyaBowl)" />
      <Ellipse cx="30" cy="26" rx="22" ry="5" fill={BOWL_DEEP} />
    </Svg>
  );

  return (
    <View style={{ width: size, height: size, opacity: dim ? 0.3 : 1 }}>
      {/* the glow the artifact gives every lit diya — never on a dim one */}
      {!dim ? glow : null}
      <View style={{ position: "absolute", left: 0, top, width: w, height: h }}>
        {/* the bowl — still */}
        <View style={StyleSheet.absoluteFill}>{bowl}</View>
        {/* the flame — alive */}
        {live ? (
          <Animated.View style={[StyleSheet.absoluteFill, flameStyle]}>{flame}</Animated.View>
        ) : (
          <View style={StyleSheet.absoluteFill}>{flame}</View>
        )}
      </View>
    </View>
  );
}
