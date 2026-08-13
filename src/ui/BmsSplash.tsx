/**
 * BmsSplash — the redesigned launch screen (docs/specs/redesign-bms.md).
 *
 * A fit man sits in meditation at the centre of the warm-black field; a golden
 * glow blooms behind him (the enlightenment moment) and lotus petals unfold
 * one by one into an arc around him. The wordmark and the BMS tagline
 * ("Unlock your Body, Mind & Soul") rise last, then the whole overlay
 * cross-fades into Home, already mounted underneath.
 *
 * Engineering contract inherited from CeremonySplash (slice 3):
 *  - All motion on the UI thread via Reanimated; app-state transitions on
 *    wall-clock timers so a stalled frame loop can never trap the user.
 *  - No SVG-prop animation (unreliable on web): petals/glow/figure animate as
 *    plain opacity/transform on Animated.Views wrapping static SVG.
 *  - Min beat 1.2 s, 6 s hard timeout, gentle glow pulse while data is slow.
 *  - Reduce-motion → the finished composition, cross-fade only.
 *  - The field is the app's own ink (app.json splash background mirrors it) so
 *    both the native→animated and animated→Home handoffs are seamless.
 */
/* eslint-disable react-hooks/immutability --
   Like CeremonySplash, this component IS a Reanimated driver: its work is
   mutating shared `.value`s. It mounts once, plays, and unmounts itself. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { color } from "./tokens";
import { T, B } from "./Text";
import {
  BMS_VB,
  BmsField,
  BmsGlow,
  MeditatingMan,
  Petal,
  PETAL_ANGLES,
  PETAL_COUNT,
  PETAL_LEN,
  PETAL_ORBIT,
  PETAL_W,
} from "./bms/art";

/** Decorative layers never intercept touches. */
const noHit = { pointerEvents: "none" } as const;

const MIN_BEAT_MS = 1200;
const HARD_TIMEOUT_MS = 6000;
/** figure 100+600 · glow 450+700 · petals 800+1150 · wordmark 1950+360 */
const MOTION_MS = 2310;
const FADE_MS = 360;

/** Petals bloom centre-out: rank by distance from the arc's apex. */
const PETAL_RANKS = PETAL_ANGLES.map(
  (a) => PETAL_ANGLES.filter((b) => Math.abs(b) < Math.abs(a)).length,
);

export function BmsSplash({
  ready,
  onFinish,
}: {
  /** True once the app's first data (the auth session) has resolved. */
  ready: boolean;
  /** Called after the cross-fade completes; the parent then unmounts us. */
  onFinish: () => void;
}) {
  const { width, height } = useWindowDimensions();

  // The SVG layers use preserveAspectRatio slice; petals are RN views, so we
  // reproduce the same mapping to keep them glued to the figure.
  const s = Math.max(width / BMS_VB.w, height / BMS_VB.h);
  const offX = (width - BMS_VB.w * s) / 2;
  const offY = (height - BMS_VB.h * s) / 2;
  const orbit = {
    x: offX + PETAL_ORBIT.cx * s,
    y: offY + PETAL_ORBIT.cy * s,
    r: PETAL_ORBIT.r * s,
  };

  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [motionDone, setMotionDone] = useState(false);
  const [beatElapsed, setBeatElapsed] = useState(false);

  const begun = useRef(false);
  const finishing = useRef(false);
  const completed = useRef(false);
  const nativeHidden = useRef(false);
  const idleStarted = useRef(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // shared values (UI thread)
  const overlay = useSharedValue(1); // cross-fade out
  const figure = useSharedValue(0); // silhouette fade + rise
  const glow = useSharedValue(0); // bloom behind the figure
  const petals = useSharedValue(0); // master petal progress (windowed per petal)
  const word = useSharedValue(0); // wordmark fade/rise
  const pulse = useSharedValue(0); // idle glow pulse while waiting on data

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
    // finish/later are stable; arm once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealFromNative = useCallback(() => {
    if (nativeHidden.current) return;
    nativeHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const startMotion = useCallback(() => {
    if (begun.current || reduceMotion === null) return;
    begun.current = true;

    if (reduceMotion) {
      figure.value = 1;
      glow.value = 1;
      petals.value = 1;
      word.value = 1;
      later(() => setMotionDone(true), 0);
      return;
    }

    const easeOut = Easing.out(Easing.cubic);

    // The beats resolve one at a time: the man settles, the glow blooms behind
    // him, the petals unfold centre-out into the arc, the words rise.
    figure.value = withDelay(100, withTiming(1, { duration: 600, easing: easeOut }));
    glow.value = withDelay(450, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }));
    petals.value = withDelay(800, withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) }));
    word.value = withDelay(1950, withTiming(1, { duration: 360, easing: easeOut }));
    later(() => setMotionDone(true), MOTION_MS);
  }, [reduceMotion, figure, glow, petals, word, later]);

  useEffect(() => {
    if (reduceMotion !== null) startMotion();
  }, [reduceMotion, startMotion]);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    revealFromNative(); // hard-timeout path
    pulse.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
    overlay.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
    later(() => {
      if (completed.current) return;
      completed.current = true;
      onFinish();
    }, FADE_MS);
    // overlay + pulse are stable shared values, not reactive deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish, revealFromNative, later]);

  useEffect(() => {
    if (!motionDone) return;
    if (ready && beatElapsed) {
      finish();
      return;
    }
    // waiting on data — the glow breathes gently (still hold on reduce-motion)
    if (!reduceMotion && !idleStarted.current) {
      idleStarted.current = true;
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    }
  }, [motionDone, ready, beatElapsed, reduceMotion, finish, pulse]);

  // --- animated styles ---
  const rootStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const figureStyle = useAnimatedStyle(() => ({
    opacity: figure.value,
    transform: [{ translateY: interpolate(figure.value, [0, 1], [14, 0]) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.72, 1]) }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0, 0.35]),
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: interpolate(word.value, [0, 1], [10, 0]) }],
  }));

  return (
    <Animated.View
      // opaque overlay: blocks touches to Home underneath until we unmount
      style={[styles.root, rootStyle]}
      onLayout={revealFromNative}
      accessible
      accessibilityLabel="Fit Hindu"
    >
      <View style={StyleSheet.absoluteFill}>
        <BmsField />
      </View>

      {/* the glow blooms behind everything else; the idle pulse rides on it */}
      <Animated.View style={[StyleSheet.absoluteFill, noHit, glowStyle]}>
        <BmsGlow />
        <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]}>
          <BmsGlow />
        </Animated.View>
      </Animated.View>

      {/* lotus petals unfolding into the arc (RN views so no SVG-prop motion) */}
      <View style={[StyleSheet.absoluteFill, noHit]}>
        {PETAL_ANGLES.map((angle, i) => (
          <ArcPetal key={i} angle={angle} rank={PETAL_RANKS[i]} master={petals} orbit={orbit} scale={s} />
        ))}
      </View>

      {/* the meditating man, above the petal bases */}
      <Animated.View style={[StyleSheet.absoluteFill, noHit, figureStyle]}>
        <MeditatingMan />
      </Animated.View>

      {/* wordmark + BMS tagline */}
      <Animated.View style={[styles.wordWrap, noHit, wordStyle]}>
        <T variant="display" style={styles.wordmark}>
          Fit Hindu
        </T>
        <B k="bms_tagline" variant="caption" center style={styles.tagline} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * One petal seated on the orbit. The wrapper is a tall thin view whose centre
 * is the orbit centre, rotated so the petal (pinned at the wrapper's top)
 * lands at its angle; the inner view then fades/emerges outward inside its
 * own centre-out window of the master value.
 */
function ArcPetal({
  angle,
  rank,
  master,
  orbit,
  scale,
}: {
  angle: number;
  rank: number;
  master: SharedValue<number>;
  orbit: { x: number; y: number; r: number };
  scale: number;
}) {
  const w = PETAL_W * scale;
  const reach = orbit.r + PETAL_LEN * scale; // orbit centre → petal tip
  const start = rank / (PETAL_COUNT + 1.6);
  const end = Math.min(1, start + 2.6 / (PETAL_COUNT + 1.6));

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(master.value, [start, end], [0, 1], "clamp"),
    transform: [
      { translateY: interpolate(master.value, [start, end], [18 * scale, 0], "clamp") },
      { scale: interpolate(master.value, [start, end], [0.55, 1], "clamp") },
    ],
  }));

  return (
    <View
      style={{
        position: "absolute",
        left: orbit.x - w / 2,
        top: orbit.y - reach,
        width: w,
        height: reach * 2,
        transform: [{ rotate: `${angle}deg` }],
      }}
    >
      <Animated.View style={style}>
        <Petal scale={scale} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.ink,
    zIndex: 100,
    elevation: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  wordWrap: {
    position: "absolute",
    bottom: "11%",
    alignItems: "center",
  },
  wordmark: {
    color: color.goldHi,
    letterSpacing: 1.5,
  },
  tagline: {
    color: color.cream,
    marginTop: 6,
    opacity: 0.85,
  },
});
