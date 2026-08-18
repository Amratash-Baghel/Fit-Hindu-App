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
 * JS-thread timers. The ambient loop is 6 animated nodes per coin (bed + two
 * colour-band blooms + three rings — the mockup's full wave count, raised from
 * the older 2-node budget on the owner's 2026-08-18 ask for the alive pulse).
 * Web and reduce-motion render one faint static frame instead of looping (the
 * `useMotion` gate, same contract as CelebrationBurst).
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
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { GOLD_WASH_RAMP } from "./GoldWash";
import { duration, easing, useMotion } from "./motion";

/* ───────────────────────── ambient halo ───────────────────────── */

interface HaloProps {
  /** the coin's box (the halo fills it and breathes beyond via scale) */
  size: number;
  /** pillar accent */
  tint: string;
}

/**
 * One outward pulse wave on the mockup's 3.9s cycle, phase-shifted by
 * `offset` so a wave is ALWAYS mid-flight (the "very alive" cadence the owner
 * pointed at, 2026-08-18 — mockup .rw/.rg with their staggered delays).
 * `kind: "ring"` is the thin 1.3px line (.rw: scale 1→1.78, opacity .26→0);
 * `kind: "glow"` is the thick colour band (.rg: a radial band that blooms
 * .92→1.62, opacity .5→0). The drive value runs linear and the keyframes live
 * in the interpolations, so each wave eases exactly like the mockup's.
 */
function PulseWave({
  size,
  tint,
  kind,
  offset,
}: {
  size: number;
  tint: string;
  kind: "ring" | "glow";
  offset: number;
}) {
  const enabled = useMotion();
  // Rest at 1 (= faded out). Web/reduce-motion hold one static frame with each
  // wave at its own phase of the cycle, so the still shot reads as a real
  // mid-pulse (staggered waves), not five copies of the same ring.
  const t = useSharedValue(enabled ? 1 : 0.15 + (offset % duration.ripple) / duration.ripple);

  useEffect(() => {
    if (!enabled) return;
    t.value = 1;
    t.value = withDelay(
      offset,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: duration.ripple, easing: easing.linear }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [enabled, offset, t]);

  const style = useAnimatedStyle(() => {
    if (kind === "ring") {
      return {
        opacity: interpolate(t.value, [0, 0.68, 1], [0.26, 0.05, 0]),
        // mid-stop fakes the mockup's ease-out travel on a linear drive
        transform: [{ scale: interpolate(t.value, [0, 0.5, 1], [1, 1.52, 1.78]) }],
      };
    }
    return {
      opacity: interpolate(t.value, [0, 0.62, 1], [0.5, 0.1, 0]),
      transform: [{ scale: interpolate(t.value, [0, 0.5, 1], [0.92, 1.4, 1.62]) }],
    };
  });

  if (kind === "ring") {
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
  // The two phase-shifted glow waves per coin share one tint — id by tint
  // alone (same scheme as BreathingBed), so the byte-identical gradients
  // dedupe instead of pretending to vary per wave.
  const uid = tint.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* the mockup's .rg band: hollow centre, colour band at ~71%, gone by 86% */}
          <RadialGradient id={`gw-${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity="0" />
            <Stop offset="0.5" stopColor={tint} stopOpacity="0" />
            <Stop offset="0.71" stopColor={tint} stopOpacity="0.55" />
            <Stop offset="0.86" stopColor={tint} stopOpacity="0" />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#gw-${uid})`} />
      </Svg>
    </Animated.View>
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
 * The living layer behind one coin, mockup-exact (owner ask 2026-08-18: the
 * circles should pulse like the approved mockup — the thin rings AND the thick
 * colour band, continuously): the constant breathing glow bed, TWO travelling
 * colour-band blooms (.rg, half-cycle apart) and THREE thin rings (.rw, a
 * third-cycle apart) all opening outward on the 3.9s cycle — so a wave is
 * always mid-flight and the coin never sits still. Six animated nodes per coin
 * (18 on Home): a deliberate raise of the old 2-node lag budget, owner-approved
 * for the aliveness; every node is still transform/opacity-only on the UI
 * thread over static SVG, which is what actually keeps Home smooth. Web /
 * reduce-motion render one static mid-pulse frame (no loops).
 */
export function CoinHalo({ size, tint }: HaloProps) {
  const enabled = useMotion();
  const breath = useSharedValue(enabled ? 0 : 0.4);

  useEffect(() => {
    if (!enabled) return;
    // the constant breath — reverses in place (never snaps to 0), so the glow is
    // always visible and always moving, exactly like the jap halo.
    breath.value = withRepeat(withTiming(1, { duration: 2400, easing: easing.inOut }), -1, true);
    return () => cancelAnimation(breath);
  }, [enabled, breath]);

  // Mockup phases: .rg at 0s/1.95s; .rw at 0s/1.3s/2.6s of the 3.9s cycle.
  const half = duration.ripple / 2;
  const third = duration.ripple / 3;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BreathingBed size={size} tint={tint} b={breath} />
      <PulseWave size={size} tint={tint} kind="glow" offset={0} />
      <PulseWave size={size} tint={tint} kind="glow" offset={half} />
      <PulseWave size={size} tint={tint} kind="ring" offset={0} />
      <PulseWave size={size} tint={tint} kind="ring" offset={third} />
      <PulseWave size={size} tint={tint} kind="ring" offset={third * 2} />
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
              {/* the one gold-wash ramp — shared with GoldWash and GoldGlow */}
              {GOLD_WASH_RAMP.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
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
