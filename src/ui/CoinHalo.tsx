/**
 * CoinHalo + CoinSplash — the living layer of the Home medallions, ported from
 * the approved mockup (docs/mockups/bms-redesign-v2.html: .ripples, .tapripple,
 * .goldwash). Each coin sits in a slow ambient pulse of its own pillar color —
 * a soft radial bloom and two thin rings breathing outward — and answers a tap
 * with a pillar-colored ripple opening over a gold wash before the pillar page
 * takes over.
 *
 * Perf contract (low-end Android rule): everything animates transform/opacity
 * ONLY, on the UI thread, over static SVG gradients — no layout work, no
 * JS-thread timers. The ambient loop is 3 animated nodes per coin (the mockup
 * runs 5). Web and reduce-motion render one faint static frame instead of
 * looping (the `useMotion` gate, same contract as CelebrationBurst).
 */
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { color } from "./tokens";
import { duration, easing, useMotion } from "./motion";

/* ───────────────────────── ambient halo ───────────────────────── */

interface HaloProps {
  /** the coin's box (the halo fills it and breathes beyond via scale) */
  size: number;
  /** pillar accent */
  tint: string;
}

/** One thin ring breathing outward: scale 1→1.78, opacity .26→0. */
function AmbientRing({ size, tint, t }: { size: number; tint: string; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.68, 1], [0.26, 0.05, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.78]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: size / 2, borderWidth: 1.3, borderColor: tint },
        style,
      ]}
    />
  );
}

/** The soft color bloom under the rings (the mockup's .rg radial ring). */
function AmbientBloom({ size, tint, t }: { size: number; tint: string; t: SharedValue<number> }) {
  const uid = tint.replace(/[^a-zA-Z0-9]/g, "");
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.62, 1], [0.5, 0.1, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.92, 1.62]) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`halo-${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity="0" />
            <Stop offset="0.5" stopColor={tint} stopOpacity="0" />
            <Stop offset="0.71" stopColor={tint} stopOpacity="0.3" />
            <Stop offset="0.86" stopColor={tint} stopOpacity="0" />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#halo-${uid})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The ambient pulse behind one coin. Rings are staggered a third of a cycle
 * apart so the halo always has one wave mid-breath, like the mockup.
 */
export function CoinHalo({ size, tint }: HaloProps) {
  const enabled = useMotion();
  const t1 = useSharedValue(enabled ? 0 : 0.3);
  const t2 = useSharedValue(0);
  const tb = useSharedValue(enabled ? 0 : 0.2);

  useEffect(() => {
    if (!enabled) return;
    // withRepeat alone would restart from wherever the value ended (1), so each
    // cycle snaps to 0 first — the mockup's infinite CSS loop, worklet-style.
    const cycle = () =>
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: duration.ripple, easing: easing.out }),
        ),
        -1,
        false,
      );
    t1.value = cycle();
    t2.value = withDelay(duration.ripple / 3, cycle());
    tb.value = cycle();
  }, [enabled, t1, t2, tb]);

  // Static faint frame on web / reduce-motion: one mid-breath ring + bloom, no
  // loops — the coin still reads as haloed in a screenshot.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AmbientBloom size={size} tint={tint} t={tb} />
      <AmbientRing size={size} tint={tint} t={t1} />
      {enabled ? <AmbientRing size={size} tint={tint} t={t2} /> : null}
    </View>
  );
}

/* ───────────────────────── tap splash ───────────────────────── */

interface SplashProps {
  size: number;
  /** pillar accent — the opening ripple ring */
  tint: string;
  /** fire once each time this increments past 0 (keep 0 = rest) */
  trigger: number;
}

/**
 * One tap's splash: a pillar-colored ring opens out (mockup .tapripple) while
 * a gold wash blooms and dies underneath (mockup .goldwash). Fired by
 * incrementing `trigger`; rests invisible before the first tap and after each
 * play. No-op under the motion gate — navigation is immediate there anyway.
 */
export function CoinSplash({ size, tint, trigger }: SplashProps) {
  const enabled = useMotion();
  const t = useSharedValue(1); // 1 = at rest (invisible)
  const uid = tint.replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    if (!enabled || trigger === 0) return;
    t.value = 0;
    t.value = withTiming(1, { duration: duration.splash, easing: easing.out });
  }, [enabled, trigger, t]);

  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.85, 1], [0.62, 0.08, 0]),
    // The mockup's .tapripple opens right out across the screen — the ripple
    // should feel like it leaves the coin and takes the page with it.
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 3.4]) }],
  }));
  const wash = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 1], [0, 0.55, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.9, 1.5]) }],
  }));

  if (!enabled) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, wash]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id={`gwash-${uid}`} cx="50%" cy="46%" r="50%">
              <Stop offset="0" stopColor={color.goldHi} stopOpacity="0.4" />
              <Stop offset="0.48" stopColor={color.saffron} stopOpacity="0.12" />
              <Stop offset="0.78" stopColor={color.saffron} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#gwash-${uid})`} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, borderWidth: 2, borderColor: tint },
          ring,
        ]}
      />
    </View>
  );
}
