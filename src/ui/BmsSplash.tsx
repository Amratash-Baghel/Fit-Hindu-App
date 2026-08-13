/**
 * BmsSplash — the chakra-awakening launch screen (redesign, ported from the
 * approved app-native mockup).
 *
 * The sequence: the meditator and his sunrise rise out of the dark → the
 * sushumna channel fills root→crown → the seven chakras land on it one by
 * one, each with a pulse and a spill of light through the body → the crown
 * overflows above the head → the gaze opens, solid white → its light takes
 * the whole screen → cross-fade to Home. A tap anywhere skips.
 *
 * Engineering contract inherited from CeremonySplash (slice 3):
 *  - All motion on the UI thread via Reanimated; app-state transitions on
 *    wall-clock timers so a stalled frame loop can never trap the user.
 *  - No SVG-prop animation (unreliable on web): every animated layer is a
 *    static SVG from bms/art.tsx wrapped in an Animated.View.
 *  - Min beat 1.2 s, 6 s hard timeout, breathing halo while data is slow.
 *  - Reduce-motion / web → the finished awakened composition, cross-fade only.
 *  - Haptic beats ride the chakras (light), the crown and the gaze (heavy) —
 *    through the feedback service, so the settings toggle is honoured.
 */
/* eslint-disable react-hooks/immutability --
   Like CeremonySplash, this component IS a Reanimated driver: its work is
   mutating shared `.value`s. It mounts once, plays, and unmounts itself. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
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
import { useMotion } from "./motion";
import { T, B } from "./Text";
import { feedback } from "../lib/feedback";
import { useI18n } from "../lib/i18n";
import {
  AmbientGlow,
  CHAKRAS,
  ChakraFigure,
  ChakraGlow,
  ChakraSpill,
  CrownFlareArt,
  EYE,
  EyeBurstArt,
  EyeFlareArt,
  EyesArt,
  EYES_VB,
  FaceWashArt,
  FIG_POS,
  FIG_VB,
  FloorPool,
  FRAME,
  HeadHalo,
  HorizonArt,
  MandalaRingA,
  MandalaRingB,
  MoteArt,
  SplashField,
  SUSH_COLORS,
  SUSH_LOCATIONS,
  SUSHUMNA,
} from "./bms/art";
import { LinearGradient } from "expo-linear-gradient";

/** Decorative layers never intercept touches. */
const noHit = { pointerEvents: "none" } as const;

const MIN_BEAT_MS = 1200;
const HARD_TIMEOUT_MS = 6000;
const FADE_MS = 420;

/* ── the beat sheet (ms), straight from the mockup ── */
const RISE_AT = 180; // figure + ambiance rise
const SUSH_AT = 560; // the channel fills ahead of the chakras
const SUSH_MS = 1300;
const CK_AT = 640; // first chakra, then one every CK_STEP
const CK_STEP = 132;
const CROWN_AT = CK_AT + 6 * CK_STEP + 120; // the seventh spills over the head
const EYES_AT = CK_AT + 6 * CK_STEP + 620; // he opens his eyes; words rise
const CK_OUT_AT = EYES_AT + 520; // the chakras hand over to the gaze
const BURST_AT = EYES_AT + 760; // the gaze-light takes the screen
const MOTION_MS = EYES_AT + 1860; // sequence complete

const easeOut = Easing.out(Easing.cubic);

/** Deterministic mote field — no Math.random so every launch composes alike. */
const MOTES = [
  { x: 70, y: 470, size: 4, delay: 0, dur: 7000 },
  { x: 140, y: 505, size: 3, delay: 1800, dur: 8600 },
  { x: 205, y: 480, size: 5, delay: 900, dur: 7600 },
  { x: 268, y: 500, size: 3.5, delay: 2600, dur: 9200 },
  { x: 315, y: 465, size: 4.5, delay: 400, dur: 8200 },
  { x: 105, y: 445, size: 3, delay: 3400, dur: 8800 },
  { x: 240, y: 452, size: 3, delay: 2100, dur: 7200 },
  { x: 175, y: 468, size: 4, delay: 4200, dur: 9600 },
] as const;

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
  const { t } = useI18n();
  const enabled = useMotion();

  // Map the 390×812 design frame into this screen, centred.
  const s = Math.min(width / FRAME.w, height / FRAME.h);
  const offX = (width - FRAME.w * s) / 2;
  const offY = (height - FRAME.h * s) / 2;
  /** figure space → screen (the figure renders 300 design-px wide) */
  const fx = useCallback((x: number) => offX + (FIG_POS.left + x) * s, [offX, s]);
  const fy = useCallback((y: number) => offY + (FIG_POS.top + y) * s, [offY, s]);

  const [motionDone, setMotionDone] = useState(false);
  const [beatElapsed, setBeatElapsed] = useState(false);

  const begun = useRef(false);
  const finishing = useRef(false);
  const completed = useRef(false);
  const nativeHidden = useRef(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  /* ── shared values (UI thread) ── */
  const overlay = useSharedValue(1); // cross-fade out
  const rise = useSharedValue(0); // ambiance + figure entrance
  const sush = useSharedValue(0); // channel fill, bottom→top
  const dim = useSharedValue(0); // channel dims once the gaze opens
  const crown = useSharedValue(0); // crown overflow keyframe
  const eyes = useSharedValue(0); // gaze ignition flicker
  const flare = useSharedValue(0); // the wide flare the gaze throws
  const awake = useSharedValue(0); // halo warm→cool swap
  const words = useSharedValue(0); // wordmark rise
  const burst = useSharedValue(0); // the screen-taking gaze light
  const out = useSharedValue(0); // chakras fade out to the gaze
  const ringA = useSharedValue(0); // ambient mandala, slow turn
  const ringB = useSharedValue(0); // counter-turn
  const breath = useSharedValue(0); // the awakened halo's slow breath

  useEffect(() => {
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
    if (begun.current) return;
    begun.current = true;

    if (!enabled) {
      // The finished composition: awakened, crowned, lit — cross-fade only.
      rise.value = 1;
      sush.value = 1;
      crown.value = 1;
      eyes.value = 1;
      flare.value = 1;
      awake.value = 1;
      words.value = 1;
      later(() => setMotionDone(true), 0);
      return;
    }

    rise.value = withDelay(RISE_AT, withTiming(1, { duration: 1000, easing: easeOut }));
    // withRepeat alone would restart the turn from wherever it ended (1), so
    // each cycle snaps to 0 first — the CoinHalo pattern.
    const turn = (ms: number) =>
      withRepeat(
        withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: ms, easing: Easing.linear })),
        -1,
        false,
      );
    ringA.value = turn(150_000);
    ringB.value = turn(96_000);
    sush.value = withDelay(SUSH_AT, withTiming(1, { duration: SUSH_MS, easing: Easing.inOut(Easing.quad) }));

    // haptic beats ride the chakras: a light tick each, heavier at the crown
    for (let i = 0; i < CHAKRAS.length; i++) {
      later(() => (i === 6 ? feedback.milestone() : feedback.count()), CK_AT + i * CK_STEP);
    }

    crown.value = withDelay(CROWN_AT, withTiming(1, { duration: 1500, easing: easeOut }));

    later(() => {
      // the gaze opens: solid white light, flickering alight like a struck flame
      eyes.value = withSequence(
        withTiming(1, { duration: 160, easing: easeOut }),
        withTiming(0.28, { duration: 120, easing: Easing.linear }),
        withTiming(1, { duration: 160, easing: easeOut }),
        withTiming(0.72, { duration: 160, easing: Easing.linear }),
        withTiming(1, { duration: 400, easing: easeOut }),
      );
      flare.value = withTiming(1, { duration: 1200, easing: easeOut });
      awake.value = withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) });
      dim.value = withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) });
      words.value = withTiming(1, { duration: 650, easing: easeOut });
      breath.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true);
      feedback.milestone();
    }, EYES_AT);

    out.value = withDelay(CK_OUT_AT, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }));

    later(() => {
      burst.value = withTiming(1, { duration: 1200, easing: Easing.in(Easing.quad) });
      feedback.milestone();
    }, BURST_AT);

    later(() => setMotionDone(true), MOTION_MS);
    // shared values are stable refs; `later` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, later]);

  useEffect(() => {
    startMotion();
  }, [startMotion]);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    revealFromNative(); // hard-timeout / tap-to-skip path
    overlay.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
    later(() => {
      if (completed.current) return;
      completed.current = true;
      onFinish();
    }, FADE_MS);
    // overlay is a stable shared value, not a reactive dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish, revealFromNative, later]);

  useEffect(() => {
    if (motionDone && ready && beatElapsed) finish();
    // while data is slow the awakened halo keeps breathing — that IS the idle state
  }, [motionDone, ready, beatElapsed, finish]);

  /* ── animated styles ── */
  const rootStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const riseStyle = useAnimatedStyle(() => ({ opacity: rise.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ scale: interpolate(rise.value, [0, 1], [0.74, 1]) }],
  }));
  const floorStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ scale: interpolate(rise.value, [0, 1], [0.72, 1]) }],
  }));
  const figStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [
      { translateY: interpolate(rise.value, [0, 1], [18 * s, 0]) },
      { scale: interpolate(rise.value, [0, 1], [0.99, 1]) },
    ],
  }));
  const ringsWrapStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ scale: interpolate(rise.value, [0, 1], [0.86, 1]) }],
  }));
  const ringAStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringA.value * 360}deg` }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-ringB.value * 360}deg` }],
  }));
  const haloWarmStyle = useAnimatedStyle(() => ({
    opacity: rise.value * (1 - awake.value),
    transform: [{ scale: interpolate(rise.value, [0, 1], [0.78, 1]) }],
  }));
  const haloCoolStyle = useAnimatedStyle(() => ({
    opacity: awake.value,
    transform: [{ scale: 1 + breath.value * 0.07 }],
  }));
  const crownStyle = useAnimatedStyle(() => ({
    opacity: interpolate(crown.value, [0, 0.3, 1], [0, 0.9, 0.46]),
    transform: [{ scale: interpolate(crown.value, [0, 0.3, 1], [0.4, 1.14, 1]) }],
  }));
  const eyesStyle = useAnimatedStyle(() => ({ opacity: eyes.value }));
  const flareStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flare.value, [0, 0.24, 1], [0, 0.85, 0.42]),
    transform: [{ scale: interpolate(flare.value, [0, 0.24, 1], [0.35, 1.06, 1.42]) }],
  }));
  const faceWashStyle = useAnimatedStyle(() => ({ opacity: awake.value * 0.85 }));
  const wordsStyle = useAnimatedStyle(() => ({
    opacity: words.value,
    transform: [{ translateY: interpolate(words.value, [0, 1], [14, 0]) }],
  }));

  // Sushumna: the channel fills bottom→top (scaleY pinned to the base), then
  // dims once the gaze opens. The glow strip rides the same fill.
  const sushH = (SUSHUMNA.bottom - SUSHUMNA.top) * s;
  const sushLineStyle = useAnimatedStyle(() => ({
    opacity: Math.min(sush.value * 4, 1) * (0.78 - 0.46 * dim.value),
    transform: [{ translateY: ((1 - sush.value) * sushH) / 2 }, { scaleY: Math.max(sush.value, 0.0001) }],
  }));
  const sushGlowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(sush.value * 4, 1) * (0.46 - 0.26 * dim.value),
    transform: [{ translateY: ((1 - sush.value) * sushH) / 2 }, { scaleY: Math.max(sush.value, 0.0001) }],
  }));

  // The gaze-light that takes the screen: scale until it covers every corner.
  const burstBase = 46 * s;
  const burstTarget = useMemo(() => {
    const cx = fx(EYE.x);
    const cy = fy(EYE.y);
    const maxR = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
    return ((maxR * 2) / burstBase) * 1.08;
  }, [fx, fy, width, height, burstBase]);
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.04, 1], [0, 1, 1]),
    transform: [{ scale: burst.value * burstTarget }],
  }));

  /* ── layout constants (design px × s) ── */
  const figW = FIG_VB.w * s;
  const center = offX + (FRAME.w / 2) * s;

  return (
    <Animated.View style={[styles.root, rootStyle]} onLayout={revealFromNative}>
      {/* full-bleed tap-to-skip — the splash must never hold anyone hostage */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("splash_skip")}
        onPress={finish}
        style={StyleSheet.absoluteFill}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <SplashField />
        </View>

        {/* the sunrise horizon — a whisper, not a glare */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: offX - 23 * s,
              right: offX - 23 * s,
              top: offY + 284 * s,
              height: 252 * s,
            },
            noHit,
            riseStyle,
          ]}
        >
          <HorizonArt />
        </Animated.View>

        {/* the warm bloom behind him */}
        <Animated.View
          style={[
            centered(center, offY + 214 * s, 476 * s, 486 * s),
            noHit,
            glowStyle,
          ]}
        >
          <AmbientGlow width={476 * s} height={486 * s} />
        </Animated.View>

        {/* ambient mandala — two rings turning against each other */}
        <Animated.View style={[centered(center, offY + 200 * s, 330 * s, 330 * s), noHit, ringsWrapStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, ringAStyle]}>
            <MandalaRingA size={330 * s} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, ringBStyle]}>
            <MandalaRingB size={330 * s} />
          </Animated.View>
        </Animated.View>

        {/* halo behind the head — warm while he is still, cool once awake */}
        <Animated.View style={[centered(center, offY + 200 * s, 216 * s, 216 * s), noHit, haloWarmStyle]}>
          <HeadHalo size={216 * s} />
        </Animated.View>
        <Animated.View style={[centered(center, offY + 200 * s, 216 * s, 216 * s), noHit, haloCoolStyle]}>
          <HeadHalo size={216 * s} cool />
        </Animated.View>

        {/* the pool of light he is seated in */}
        <Animated.View style={[centered(center, offY + 466 * s, 352 * s, 120 * s), noHit, floorStyle]}>
          <FloorPool width={352 * s} height={120 * s} />
        </Animated.View>

        {/* rising gold motes */}
        {enabled
          ? MOTES.map((m, i) => (
              <Mote key={i} x={offX + m.x * s} y={offY + m.y * s} size={m.size * 2 * s} delay={m.delay} dur={m.dur} rise={300 * s} />
            ))
          : null}

        {/* ── the figure and everything that lives on it ── */}
        <Animated.View
          style={[
            { position: "absolute", left: fx(0), top: fy(0), width: figW, height: (figW * FIG_VB.h) / FIG_VB.w },
            noHit,
            figStyle,
          ]}
        >
          <ChakraFigure width={figW} />

          {/* sushumna: glow strip + the channel line, filling root→crown */}
          <View
            style={{
              position: "absolute",
              left: SUSHUMNA.x * s - 6.5 * s,
              top: SUSHUMNA.top * s,
              width: 13 * s,
              height: sushH,
            }}
          >
            <Animated.View style={[StyleSheet.absoluteFill, sushGlowStyle]}>
              <LinearGradient
                colors={[...SUSH_COLORS]}
                locations={[...SUSH_LOCATIONS]}
                style={{ flex: 1, borderRadius: 6.5 * s, opacity: 0.32 }}
              />
            </Animated.View>
          </View>
          <View
            style={{
              position: "absolute",
              left: SUSHUMNA.x * s - 1.2 * s,
              top: SUSHUMNA.top * s,
              width: 2.4 * s,
              height: sushH,
            }}
          >
            <Animated.View style={[StyleSheet.absoluteFill, sushLineStyle]}>
              <LinearGradient
                colors={[...SUSH_COLORS]}
                locations={[...SUSH_LOCATIONS]}
                style={{ flex: 1, borderRadius: 1.2 * s }}
              />
            </Animated.View>
          </View>

          {/* the seven chakras, root→crown */}
          {CHAKRAS.map((ck, i) => (
            <ChakraNode key={i} y={ck.y} rx={ck.rx} c={ck.c} at={CK_AT + i * CK_STEP} s={s} out={out} enabled={enabled} />
          ))}

          {/* crown overflow — the last chakra spills up over the head */}
          <Animated.View
            style={[
              { position: "absolute", left: (150 - 48) * s, top: (16 - 32) * s, width: 96 * s },
              crownStyle,
            ]}
          >
            <CrownFlareArt width={96 * s} />
          </Animated.View>

          {/* the awakened gaze */}
          <Animated.View style={[{ position: "absolute", left: 110 * s, top: 24 * s, width: 80 * s }, faceWashStyle]}>
            <FaceWashArt width={80 * s} />
          </Animated.View>
          <Animated.View
            style={[
              { position: "absolute", left: (150 - 56) * s, top: (63 - 19) * s, width: 112 * s },
              flareStyle,
            ]}
          >
            <EyeFlareArt width={112 * s} />
          </Animated.View>
          <Animated.View
            style={[
              { position: "absolute", left: EYES_VB.x * s, top: EYES_VB.y * s, width: EYES_VB.w * s },
              eyesStyle,
            ]}
          >
            <EyesArt width={EYES_VB.w * s} />
          </Animated.View>
        </Animated.View>

        {/* the gaze-light opening out of the eyes to take the screen */}
        <Animated.View style={[centered(fx(EYE.x), fy(EYE.y), burstBase, burstBase), noHit, burstStyle]}>
          <EyeBurstArt size={burstBase} />
        </Animated.View>

        {/* wordmark + tagline */}
        <Animated.View style={[styles.wordWrap, { bottom: offY + 88 * s }, noHit, wordsStyle]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                borderWidth: 1.6,
                borderColor: color.gold,
                backgroundColor: "rgba(217,164,65,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <T style={{ fontSize: 16, lineHeight: 22, fontWeight: "700", color: color.goldHi }}>ॐ</T>
            </View>
            <T variant="display" style={styles.wordmark}>
              FIT HINDU
            </T>
          </View>
          <B k="bms_tagline" variant="body" center style={styles.tagline} />
        </Animated.View>

        {/* skip hint */}
        <Animated.View style={[styles.skipWrap, { bottom: offY + 26 * s }, noHit, wordsStyle]}>
          <T variant="caption" style={styles.skip}>
            {t("splash_skip")}
          </T>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Absolute-position a w×h box centred on (cx, cy). */
function centered(cx: number, cy: number, w: number, h: number) {
  return { position: "absolute" as const, left: cx - w / 2, top: cy - h / 2, width: w, height: h };
}

/**
 * One chakra: the halo+core pops in (its ignition), a thin ring pulses
 * outward once, and the light spills sideways through the body — then the
 * whole node settles and finally fades as the gaze takes over (`out`).
 */
function ChakraNode({
  y,
  rx,
  c,
  at,
  s,
  out,
  enabled,
}: {
  y: number;
  rx: number;
  c: string;
  at: number;
  s: number;
  out: SharedValue<number>;
  enabled: boolean;
}) {
  const ig = useSharedValue(enabled ? 0 : 1); // ignition pop
  const st = useSharedValue(enabled ? 1 : 0.62); // settle to "lit"
  const pu = useSharedValue(0); // pulse ring, once
  const sp = useSharedValue(enabled ? 0 : 1); // sideways spill

  useEffect(() => {
    if (!enabled) return;
    ig.value = withDelay(at, withTiming(1, { duration: 720, easing: easeOut }));
    st.value = withDelay(at + 820, withTiming(0.62, { duration: 500, easing: Easing.inOut(Easing.quad) }));
    pu.value = withDelay(at, withTiming(1, { duration: 1300, easing: easeOut }));
    sp.value = withDelay(at, withTiming(1, { duration: 1200, easing: easeOut }));
    // shared values are stable refs; fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, at]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ig.value, [0, 0.42, 1], [0, 1, 0.96]) * st.value * (1 - out.value),
    transform: [{ scale: interpolate(ig.value, [0, 0.42, 1], [0.32, 1.26, 1]) }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pu.value, [0, 0.001, 0.7, 1], [0, 0.6, 0.12, 0]),
    transform: [{ scale: interpolate(pu.value, [0, 1], [0.45, 3.3]) }],
  }));
  const spillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sp.value, [0, 0.001, 0.34, 1], [0, 0, 0.9, 0.5]) * (1 - out.value),
    transform: [{ scaleX: interpolate(sp.value, [0, 1], [0.12, 1]) }],
  }));

  const cx = 150 * s;
  const cy = y * s;
  const glowSize = 38 * s;
  const pulseSize = 20 * s;
  const spillW = 2 * rx * s;
  const spillH = 22 * s;

  return (
    <>
      <Animated.View
        style={[
          { position: "absolute", left: cx - spillW / 2, top: cy - spillH / 2, width: spillW, height: spillH },
          spillStyle,
        ]}
      >
        <ChakraSpill c={c} width={spillW} height={spillH} />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: cx - pulseSize / 2,
            top: cy - pulseSize / 2,
            width: pulseSize,
            height: pulseSize,
            borderRadius: pulseSize / 2,
            borderWidth: 1.4,
            borderColor: c,
          },
          pulseStyle,
        ]}
      />
      <Animated.View
        style={[
          { position: "absolute", left: cx - glowSize / 2, top: cy - glowSize / 2, width: glowSize, height: glowSize },
          glowStyle,
        ]}
      >
        <ChakraGlow c={c} size={glowSize} />
      </Animated.View>
    </>
  );
}

/** One gold mote drifting upward, forever (the splash is short-lived). */
function Mote({
  x,
  y,
  size,
  delay,
  dur,
  rise,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  dur: number;
  rise: number;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: dur, easing: Easing.linear })),
        -1,
        false,
      ),
    );
    // fire once per mount; shared value is a stable ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.16, 0.62, 1], [0, 0.5, 0.28, 0]),
    transform: [
      { translateY: interpolate(v.value, [0, 1], [0, -rise]) },
      { scale: interpolate(v.value, [0, 1], [0.5, 1.15]) },
    ],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y, width: size, height: size }, noHit, style]}>
      <MoteArt size={size} />
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
    backgroundColor: "#0C0805",
    zIndex: 100,
    elevation: 100,
  },
  wordWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 11,
  },
  wordmark: {
    color: color.goldHi,
    letterSpacing: 3.4,
    fontSize: 30,
    lineHeight: 38,
    textShadowColor: "rgba(217,164,65,0.22)",
    textShadowRadius: 26,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    color: color.bodySoft,
  },
  skipWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  skip: {
    color: "rgba(168,145,122,0.42)",
    letterSpacing: 1.6,
    fontSize: 10,
    textTransform: "uppercase",
  },
});
