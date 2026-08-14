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
 * JS-thread timers. The ambient loop is kept to 2 animated nodes per coin (a
 * ring over a bloom), so Home stays smooth on mid/low-end devices. Web and
 * reduce-motion render one faint static frame instead of looping (the
 * `useMotion` gate, same contract as CelebrationBurst).
 */
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
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

/** One thin ring rippling outward: scale 1→1.8, opacity .3→0. */
function AmbientRing({ size, tint, t }: { size: number; tint: string; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.66, 1], [0.3, 0.06, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.8]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: size / 2, borderWidth: 1.4, borderColor: tint },
        style,
      ]}
    />
  );
}

/**
 * The breathing glow bed — the coin's living layer, borrowed from the jap
 * button's halo/bed (which is what makes it feel alive at rest). Unlike the old
 * bloom, this NEVER fades to nothing: it oscillates between two visible states
 * (opacity .36↔.16, scale 1↔1.12) on a slow ~2.4s breath, so every coin always
 * reads as lit and breathing rather than dead-between-pulses. A rim-weighted
 * radial (brightest just outside the coin face) so it glows AROUND the coin.
 */
function BreathingBed({ size, tint, b }: { size: number; tint: string; b: SharedValue<number> }) {
  const uid = tint.replace(/[^a-zA-Z0-9]/g, "");
  // Geometry matters: the coin is opaque and fills ~0.95 of this box, so a glow
  // band inside that radius is HIDDEN behind it. The band sits at offset .82 and
  // the whole bed rests at scale ≥1.16, so .82×1.16 ≈ 0.95 lands the glow right
  // at the coin's rim and the breath swells it outward — a halo that hugs each
  // coin at ALL times, never hidden, never fully faded (floor opacity .18).
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(b.value, [0, 1], [0.38, 0.18]),
    transform: [{ scale: interpolate(b.value, [0, 1], [1.16, 1.3]) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`bed-${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity="0" />
            <Stop offset="0.5" stopColor={tint} stopOpacity="0" />
            <Stop offset="0.82" stopColor={tint} stopOpacity="0.52" />
            <Stop offset="0.94" stopColor={tint} stopOpacity="0.12" />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#bed-${uid})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The living layer behind one coin: a constant breathing glow bed (the jap-like
 * "alive at rest" quality the owner asked for) under one outward ripple ring.
 * TWO animated nodes per coin (6 on Home) — the budget the lag-cutting commit
 * deliberately set; the aliveness comes from the bed *breathing* (a constant
 * reverse-yoyo that never fades to nothing) rather than from more nodes. All
 * transform/opacity on the UI thread. Web / reduce-motion render one static
 * mid-breath frame (no loops), so the coin still reads as haloed in a shot.
 */
export function CoinHalo({ size, tint }: HaloProps) {
  const enabled = useMotion();
  const breath = useSharedValue(enabled ? 0 : 0.4);
  const t1 = useSharedValue(enabled ? 0 : 0.32);

  useEffect(() => {
    if (!enabled) return;
    // the constant breath — reverses in place (never snaps to 0), so the glow is
    // always visible and always moving, exactly like the jap halo.
    breath.value = withRepeat(withTiming(1, { duration: 2400, easing: easing.inOut }), -1, true);
    // one ripple that snaps to 0 then opens out
    t1.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: duration.ripple, easing: easing.out }),
      ),
      -1,
      false,
    );
  }, [enabled, breath, t1]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BreathingBed size={size} tint={tint} b={breath} />
      <AmbientRing size={size} tint={tint} t={t1} />
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
    // The ripple opens out from the coin — a single clean wave (the second wave
    // and the screen-wide colour fill are now the smooth CoinExpand overlay).
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 3.6]) }],
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
