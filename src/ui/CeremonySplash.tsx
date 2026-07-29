/**
 * CeremonySplash — the animated launch screen (slice 3).
 *
 * Sits as a full-bleed overlay above the router. The native splash
 * (expo-splash-screen) is held up in `app/_layout.tsx` until this component has
 * painted its first frame, then hidden, so the native→animated handoff shows no
 * seam (both are the same oxblood field, `tokens.ceremony.field`, mirrored by
 * app.json). It plays its motion, waits for app data if needed, then cross-fades
 * to reveal the home screen already mounted underneath.
 *
 * Performance contract (docs/specs/feature-sprint.md slice 3):
 *  - All motion runs on the UI thread via Reanimated. No JS `Animated` loops.
 *  - The arch stroke-dash reveal is the one effect that genuinely needs the UI
 *    thread (`strokeDashoffset` is not native-driver-able). On web, where
 *    animating an SVG prop is unreliable, the arch instead fades in via opacity
 *    so it never gets stuck hidden — web is only a verification surface.
 *  - The gada bloom is a layered RadialGradient (in art.tsx), never a blur.
 *  - Minimum beat 1.2 s so early data can't cause a stutter; a gentle gold
 *    shimmer holds if data is slow; a 6 s hard timeout never traps the user.
 *  - Reduce-motion → the static composition, cross-fade only.
 */
/* eslint-disable react-hooks/immutability --
   This component IS a Reanimated driver: its work is mutating shared `.value`,
   which is Reanimated's API but which the React-Compiler immutability rule
   doesn't model. The ceremony is self-contained: it mounts once, drives its
   animations, and unmounts itself. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";
import { ceremony as c } from "./tokens";
import { T, B } from "./Text";
import {
  ARCH_DASH,
  ARCH_INNER,
  ARCH_OUTER,
  CEREMONY_VB,
  Emblem,
  FieldVignette,
  SidePanel,
} from "./ceremony/art";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const VB = `0 0 ${CEREMONY_VB.w} ${CEREMONY_VB.h}`;

/** Decorative layers never intercept touches (style, not the web-deprecated prop). */
const noHit = { pointerEvents: "none" } as const;

/** The whole ceremony must feel deliberate, never sluggish. */
const MIN_BEAT_MS = 1200;
const HARD_TIMEOUT_MS = 6000;
/** Wall-clock length of the element motion (last beat: 1320ms delay + 360ms). */
const MOTION_MS = 1700;
/** Cross-fade duration to the home screen. */
const FADE_MS = 360;
const isWeb = Platform.OS === "web";

export function CeremonySplash({
  ready,
  onFinish,
}: {
  /** True once the app's first data (the auth session) has resolved. */
  ready: boolean;
  /** Called after the cross-fade completes; the parent then unmounts us. */
  onFinish: () => void;
}) {
  const { width } = useWindowDimensions();

  // null until AccessibilityInfo answers; we don't start motion before then.
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [motionDone, setMotionDone] = useState(false);
  const [beatElapsed, setBeatElapsed] = useState(false);

  // once-guards
  const begun = useRef(false);
  const finishing = useRef(false);
  const completed = useRef(false);
  const nativeHidden = useRef(false);
  const idleStarted = useRef(false);

  // Every timer goes through here so a mid-ceremony unmount clears them all.
  // The app-state transitions (motion done → cross-fade → onFinish) are driven
  // by these plain timers, NOT by Reanimated callbacks: if the frame loop ever
  // stalls (a backgrounded tab freezes rAF) the user must still never be trapped.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // shared values (UI thread)
  const overlay = useSharedValue(1); // cross-fade out
  const panelL = useSharedValue(0); // 0 = off-edge, 1 = seated
  const panelR = useSharedValue(0);
  const archDraw = useSharedValue(isWeb ? 0 : ARCH_DASH); // strokeDashoffset (native)
  const archFade = useSharedValue(0); // arch opacity (web-safe reveal)
  const gada = useSharedValue(0); // 0 = 0.9×/transparent, 1 = seated
  const spec = useSharedValue(0); // specular sweep progress
  const word = useSharedValue(0); // wordmark fade/rise
  const shimmer = useSharedValue(0); // idle gold shimmer while waiting

  // --- resolve reduce-motion, arm min beat + hard timeout ---
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => setReduceMotion(v))
      .catch(() => setReduceMotion(false));

    later(() => setBeatElapsed(true), MIN_BEAT_MS);
    later(() => finish(), HARD_TIMEOUT_MS); // never trap the user
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // finish/later are stable; deps intentionally empty — arm once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide the native splash once our first frame is up — this is the seam-free
  // moment. Runs on first layout; guarded so it fires exactly once.
  const revealFromNative = useCallback(() => {
    if (nativeHidden.current) return;
    nativeHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const startMotion = useCallback(() => {
    if (begun.current || reduceMotion === null) return;
    begun.current = true;

    if (reduceMotion) {
      // static composition — snap everything to its final state, cross-fade only
      panelL.value = 1;
      panelR.value = 1;
      archDraw.value = 0;
      archFade.value = 1;
      gada.value = 1;
      spec.value = 0; // no sweep
      word.value = 1;
      later(() => setMotionDone(true), 0);
      return;
    }

    const easeOut = Easing.out(Easing.cubic);

    panelL.value = withDelay(60, withTiming(1, { duration: 520, easing: easeOut }));
    panelR.value = withDelay(60, withTiming(1, { duration: 520, easing: easeOut }));

    if (!isWeb) {
      archDraw.value = withDelay(
        320,
        withTiming(0, { duration: 820, easing: Easing.inOut(Easing.quad) }),
      );
    }
    archFade.value = withDelay(320, withTiming(1, { duration: isWeb ? 520 : 300 }));

    gada.value = withDelay(
      880,
      withTiming(1, { duration: 440, easing: Easing.out(Easing.back(1.3)) }),
    );

    spec.value = withDelay(
      1140,
      withTiming(1, { duration: 440, easing: Easing.inOut(Easing.quad) }),
    );

    // wordmark is last. "Motion done" is timed on the wall clock, not on a
    // Reanimated callback, so completion never hinges on the frame loop running.
    word.value = withDelay(1320, withTiming(1, { duration: 360, easing: easeOut }));
    later(() => setMotionDone(true), MOTION_MS);
  }, [reduceMotion, panelL, panelR, archDraw, archFade, gada, spec, word, later]);

  // Begin as soon as reduce-motion is known (first frame is already painted).
  useEffect(() => {
    if (reduceMotion !== null) startMotion();
  }, [reduceMotion, startMotion]);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    revealFromNative(); // in case layout never fired (hard-timeout path)
    cancelAnimation(shimmer);
    // Kick off the visual cross-fade…
    overlay.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
    // …but hand control back to the router on the wall clock, so a stalled frame
    // loop can't strand us faded-but-mounted.
    later(() => {
      if (completed.current) return;
      completed.current = true;
      onFinish();
    }, FADE_MS);
    // overlay + shimmer are stable shared values, not reactive deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish, revealFromNative, later]);

  // Once the motion has played, the min beat has passed AND data is ready,
  // cross-fade out. If data lags, hold on a gentle gold shimmer meanwhile.
  useEffect(() => {
    if (!motionDone) return;
    if (ready && beatElapsed) {
      finish();
      return;
    }
    // waiting on data — idle shimmer (reduce-motion users get a still hold).
    // Start it once: this effect can re-run as `beatElapsed`/`ready` land at
    // different times, and re-assigning would restart the loop from 0 with a
    // visible jump.
    if (!reduceMotion && !idleStarted.current) {
      idleStarted.current = true;
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    }
  }, [motionDone, ready, beatElapsed, reduceMotion, finish, shimmer]);

  // --- animated styles ---
  const rootStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  const panelLStyle = useAnimatedStyle(() => ({
    opacity: panelL.value,
    transform: [
      { translateX: interpolate(panelL.value, [0, 1], [-width * 0.42, 0]) },
      { rotate: `${interpolate(panelL.value, [0, 1], [-7, 0])}deg` },
    ],
  }));
  const panelRStyle = useAnimatedStyle(() => ({
    opacity: panelR.value,
    transform: [
      { translateX: interpolate(panelR.value, [0, 1], [width * 0.42, 0]) },
      { rotate: `${interpolate(panelR.value, [0, 1], [7, 0])}deg` },
    ],
  }));

  const archStyle = useAnimatedStyle(() => ({ opacity: archFade.value }));
  const archProps = useAnimatedProps(() => ({ strokeDashoffset: archDraw.value }));

  const gadaStyle = useAnimatedStyle(() => ({
    opacity: gada.value,
    transform: [{ scale: interpolate(gada.value, [0, 1], [0.9, 1]) }],
  }));

  // specular strip sweeps diagonally across the emblem column, once
  const specStyle = useAnimatedStyle(() => ({
    opacity: interpolate(spec.value, [0, 0.15, 0.85, 1], [0, 0.6, 0.6, 0]),
    transform: [
      { translateX: interpolate(spec.value, [0, 1], [-140, 140]) },
      { rotate: "20deg" },
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: interpolate(word.value, [0, 1], [10, 0]) }],
  }));

  // gentle gold shimmer while holding for slow data
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0, 0.28]),
  }));

  return (
    <Animated.View
      // opaque full-screen overlay: it blocks touches to the home screen
      // underneath until we unmount (pointerEvents defaults to auto).
      style={[styles.root, rootStyle]}
      onLayout={revealFromNative}
      accessible
      accessibilityLabel="Fit Hindu"
    >
      {/* base oxblood field + vignette + corners + base band */}
      <View style={StyleSheet.absoluteFill}>
        <FieldVignette />
      </View>

      {/* side filigree panels sweeping in from each edge */}
      <Animated.View style={[StyleSheet.absoluteFill, noHit, panelLStyle]}>
        <SidePanel side="left" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, noHit, panelRStyle]}>
        <SidePanel side="right" />
      </Animated.View>

      {/* the ogee arch, drawn in gold */}
      <Animated.View style={[StyleSheet.absoluteFill, noHit, archStyle]}>
        <Svg width="100%" height="100%" viewBox={VB} preserveAspectRatio="xMidYMid slice">
          <AnimatedPath
            d={ARCH_OUTER}
            stroke={c.gold}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={ARCH_DASH}
            animatedProps={archProps}
          />
          <AnimatedPath
            d={ARCH_INNER}
            stroke={c.goldHi}
            strokeWidth={1.3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={ARCH_DASH}
            animatedProps={archProps}
          />
        </Svg>
      </Animated.View>

      {/* the emblem: ring + bloom + gada */}
      <Animated.View style={[StyleSheet.absoluteFill, noHit, gadaStyle]}>
        <Emblem />
      </Animated.View>

      {/* specular highlight sweep, clipped to the emblem column */}
      <View style={[styles.specClip, noHit]}>
        <Animated.View style={[styles.specBand, specStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* idle gold shimmer overlay while waiting on slow data */}
      <Animated.View style={[styles.shimmer, noHit, shimmerStyle]} />

      {/* wordmark + tagline */}
      <Animated.View style={[styles.wordWrap, noHit, wordStyle]}>
        <T variant="display" style={styles.wordmark}>
          Fit Hindu
        </T>
        <B k="splash_tagline" variant="caption" center style={styles.tagline} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.field,
    zIndex: 100,
    elevation: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  specClip: {
    position: "absolute",
    top: "16%",
    height: "48%",
    width: 130,
    left: "50%",
    marginLeft: -65,
    overflow: "hidden",
  },
  specBand: {
    position: "absolute",
    top: -40,
    bottom: -40,
    width: 46,
    left: 42,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.goldHi,
  },
  wordWrap: {
    position: "absolute",
    bottom: "13%",
    alignItems: "center",
  },
  wordmark: {
    color: c.goldHi,
    letterSpacing: 1.5,
  },
  tagline: {
    color: c.cream,
    marginTop: 6,
    opacity: 0.85,
  },
});
