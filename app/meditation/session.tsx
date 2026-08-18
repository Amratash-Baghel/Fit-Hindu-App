import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { Screen, Button, FooterAction, Reveal, B, T, CompletionDiya, GoldWash, PointsEarned, useMotion, color, duration, pillar, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { pauseAudio, resumeAudio, stopAudio, fadeOutStop } from "../../src/lib/audio";
import { logActivityDurable } from "../../src/lib/activity";
import { earnSince, pointsTodayNow, type ActivityEarn } from "../../src/lib/points";
import { feedback } from "../../src/lib/feedback";
import { uuidv4 } from "../../src/lib/ids";

/** The two breath rhythms (UI9 slice D). `even` is a plain even breath — NOT
 *  "box", which is four phases with holds; naming a practice wrongly is not a
 *  copy detail. */
const PACES = {
  calm: { inhaleMs: 4000, exhaleMs: 6000 },
  even: { inhaleMs: 4000, exhaleMs: 4000 },
} as const;

/** The unhurried breath the timer practice has always used, both legs equal. */
const TIMER_BREATH_MS = 4600;

/** Interval-bell spacing, in seconds. */
const BELL_EVERY = 300;

/** How long the controls stay lit before the screen settles into the practice. */
const DIM_AFTER_MS = 6000;
const CONTROLS_DIM = 0.16;

/**
 * Step 3 — the session: pulsing ॐ, ticking countdown, sound looping from the
 * selector (never restarted), gentle completion moment. Partial sessions of
 * ≥3 minutes still count as completed (spec: generosity over strictness).
 *
 * UI9 slice D adds the BREATH practice on top of the same machinery: the phase
 * labels read the turn of the ॐ's existing shared value rather than running a
 * second animation, the pace presets only change its timing config, and the
 * optional bell rides the countdown that already ticks. Timer mode is
 * deliberately left exactly as it was — palette, animation and all.
 */
export default function MeditationSession() {
  useKeepAwake();
  const router = useRouter();
  const { t } = useI18n();
  const { sound, min, mode, bell, pace } = useLocalSearchParams<{
    sound: string;
    min: string;
    mode?: string;
    bell?: string;
    pace?: string;
  }>();
  const totalSeconds = Math.max(1, Number(min ?? 15)) * 60;

  // Anything unrecognised falls back to the default practice rather than
  // rendering an empty one.
  const breathMode = mode === "breath";
  const bellOn = bell === "1";
  const paceCfg = breathMode
    ? pace === "even"
      ? PACES.even
      : PACES.calm
    : { inhaleMs: TIMER_BREATH_MS, exhaleMs: TIMER_BREATH_MS };

  const [left, setLeft] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [earn, setEarn] = useState<ActivityEarn | null>(null);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const logged = useRef(false);
  /** Today's points before this session is logged, for the earned delta. */
  const pointsBefore = useRef<number | null>(null);
  /** The last 5-minute mark the bell rang on — makes the ring idempotent no
   *  matter how often the effect re-runs for the same second. */
  const lastBell = useRef(0);

  const motion = useMotion();

  /** The phase label, flipped by the breath animation itself (see BreathingOm's
   *  useAnimatedReaction). Stable so the worklet's dependency never churns. */
  const onPhase = useCallback((p: "in" | "out") => setPhase(p), []);

  /**
   * Ambient dim — the controls settle out of the way a few seconds in, and any
   * tap brings them back. Opacity only, on the UI thread. They stay tappable at
   * all times, so nothing is ever trapped behind the dim. Breath practice only:
   * the timer session is left exactly as it was.
   */
  const controls = useSharedValue(1);
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useCallback(
    (settle = true) => {
      if (!motion || !breathMode) return;
      controls.value = withTiming(1, { duration: duration.base });
      if (dimTimer.current) clearTimeout(dimTimer.current);
      // `settle: false` holds them lit — used while paused, when the user is
      // deliberately out of the practice and needs to find Resume.
      if (!settle) return;
      dimTimer.current = setTimeout(() => {
        controls.value = withTiming(CONTROLS_DIM, { duration: duration.slow * 2 });
      }, DIM_AFTER_MS);
    },
    [motion, breathMode, controls],
  );

  // Lit on arrival, lit for as long as the session is paused, settling again
  // once the practice resumes.
  useEffect(() => {
    wake(!paused);
    return () => {
      if (dimTimer.current) clearTimeout(dimTimer.current);
    };
  }, [wake, paused]);

  const controlsStyle = useAnimatedStyle(() => ({ opacity: controls.value }));

  useEffect(() => {
    void pointsTodayNow().then((v) => {
      pointsBefore.current = v;
    });
  }, []);

  // countdown
  useEffect(() => {
    if (paused || finished) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, finished]);

  // completion
  useEffect(() => {
    if (left === 0 && !finished) complete(totalSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  // The interval bell rides the countdown that is already ticking — one `if`,
  // no scheduler. Never at 0 (nothing has happened yet) and never at the end,
  // where the completion chime already rings.
  useEffect(() => {
    if (!bellOn || finished) return;
    const elapsed = totalSeconds - left;
    if (elapsed <= 0 || left <= 0) return;
    if (elapsed % BELL_EVERY !== 0 || lastBell.current === elapsed) return;
    lastBell.current = elapsed;
    feedback.chime();
  }, [bellOn, finished, left, totalSeconds]);

  function complete(actualSeconds: number) {
    if (logged.current) return;
    logged.current = true;
    setFinished(true);
    // Gentle end: fade the ambient loop out (rather than a hard cut) and let a
    // soft bell ring over the fade — the "timer sound", deliberately quieter
    // than the shared reward chime. fadeOutStop still ends in a real stop +
    // audio-mode reset, so it never leaks into later UI chirps.
    void fadeOutStop();
    feedback.chime();
    void logActivityDurable(
      "meditation",
      {
        sound_id: sound === "silent" ? null : sound,
        set_min: totalSeconds / 60,
        actual_min: Math.round(actualSeconds / 60),
        // Which practice this was. Points, streak and the Mind ring read none
        // of this — they see the same `meditation` row they always did.
        mode: breathMode ? "breath" : "timer",
        ...(breathMode ? { pace: pace === "even" ? "even" : "calm" } : {}),
        bell: bellOn,
      },
      sound && sound !== "silent" ? sound : undefined,
      uuidv4(),
    ).then(async (ok) => {
      // Diff only when the write landed — otherwise the completion screen would
      // show a false "already claimed today" instead of a plain celebration.
      setEarn(await earnSince(ok ? pointsBefore.current : null));
    });
  }

  function endEarly() {
    const actual = totalSeconds - left;
    if (actual >= 180) {
      complete(actual); // ≥3 min counts as done
    } else {
      stopAudio();
      router.back();
    }
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  // With motion on, the phase comes from the ॐ's own breath (the animation IS
  // the instruction, so the word must match the swell exactly). With motion
  // off nothing animates, so it is derived from the countdown already ticking —
  // still no second timer, and no crossfade: adding motion for the people who
  // asked for less would be the wrong reading of the ask.
  const cycleSec = (paceCfg.inhaleMs + paceCfg.exhaleMs) / 1000;
  const derivedPhase = (totalSeconds - left) % cycleSec < paceCfg.inhaleMs / 1000 ? "in" : "out";
  const shownPhase = motion ? phase : derivedPhase;
  const phaseSeconds = Math.round((shownPhase === "in" ? paceCfg.inhaleMs : paceCfg.exhaleMs) / 1000);

  if (finished) {
    return (
      <Screen scroll={false} overlay={<GoldWash />}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
          {/* the diya lights + spark/star burst radiate (calm variant — no
              reward-burst haptic, the soft chime already rang), then the copy +
              points LIFT in, so meditation reads as the same reward family as
              the workout screen (audit 2026-08-14: the two 'complete' screens
              should be one system). */}
          <CompletionDiya diyaSize={72} burstSize={200} rays={10} />
          <Reveal lift delay={640}>
            <B k="session_complete" variant="h1" center />
          </Reveal>
          <Reveal lift delay={760}>
            <B k="well_done" variant="body" tone="muted" center />
          </Reveal>
          <Reveal lift delay={920} style={{ alignItems: "center" }}>
            <PointsEarned earned={earn?.earned ?? null} total={earn?.total ?? null} style={{ marginTop: space.sm }} />
          </Reveal>
        </View>
        <FooterAction>
          <Button k="done" onPress={() => router.dismissTo("/(tabs)/meditation")} />
        </FooterAction>
      </Screen>
    );
  }

  const progress = Math.min(1, Math.max(0, (totalSeconds - left) / totalSeconds));

  return (
    <Screen scroll={false}>
      {/* a soft warm backdrop so the screen has depth instead of flat black */}
      <LinearGradient
        colors={["#16100A", "#0F0B07", "#0A0910"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Any tap on the practice area brings the controls back. */}
      <Pressable
        onPress={() => wake()}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.xl }}
      >
        <BreathingOm
          progress={progress}
          paused={paused}
          breath={breathMode}
          inhaleMs={paceCfg.inhaleMs}
          exhaleMs={paceCfg.exhaleMs}
          onPhase={breathMode ? onPhase : undefined}
          bellMarks={bellOn ? Math.floor((totalSeconds - 1) / BELL_EVERY) : 0}
          markEvery={BELL_EVERY / totalSeconds}
        />

        {breathMode ? (
          <View style={{ alignItems: "center", gap: 2 }}>
            {/* the practice's own words, with their meaning underneath */}
            <T variant="h2" style={{ color: pillar.mind }}>
              {t(shownPhase === "in" ? "breath_phase_in" : "breath_phase_out")}
            </T>
            <T variant="caption" tone="muted">
              {t(shownPhase === "in" ? "breath_in" : "breath_out")} · {phaseSeconds}
            </T>
          </View>
        ) : null}

        <T variant="display" style={{ fontVariant: ["tabular-nums"], fontSize: 56, letterSpacing: 2 }}>
          {mm}:{ss}
        </T>
      </Pressable>

      <FooterAction>
        <Animated.View style={[{ flexDirection: "row", gap: space.sm }, controlsStyle]}>
          <View style={{ flex: 1 }}>
            <Button
              k={paused ? "resume" : "pause"}
              kind="ghost"
              onPress={() => {
                // Touching a control is an interaction like any other — the
                // controls must never answer a tap from behind the dim.
                wake();
                setPaused((p) => {
                  const next = !p;
                  if (next) pauseAudio();
                  else resumeAudio();
                  return next;
                });
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              k="end_session"
              kind="ghost"
              onPress={() => {
                wake();
                endEarly();
              }}
            />
          </View>
        </Animated.View>
      </FooterAction>
    </Screen>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * BreathingOm — the meditation focal point, rebuilt for calm depth (owner
 * feedback 2026-08-08: the old single-pulse ॐ read as bland). Layers, from back
 * to front: two soft halos breathing gently out of phase, a thin progress ring
 * that fills over the session (so the screen quietly shows how far you are), and
 * the ॐ itself breathing in a warm glow. All on the Reanimated UI thread; a
 * single slow breath value drives everything so it stays cheap.
 */
function BreathingOm({
  progress,
  paused,
  breath: breathMode = false,
  inhaleMs = 4600,
  exhaleMs = 4600,
  onPhase,
  bellMarks = 0,
  markEvery = 0,
}: {
  progress: number;
  paused: boolean;
  /** Breath practice: indigo, and the phase is reported back. */
  breath?: boolean;
  inhaleMs?: number;
  exhaleMs?: number;
  /** Called on each turn of the breath — never per frame. */
  onPhase?: (p: "in" | "out") => void;
  /** How many 5-minute marks fit in the session (0 = bell off). */
  bellMarks?: number;
  /** One mark's share of the ring, as a fraction of the whole. */
  markEvery?: number;
}) {
  const enabled = useMotion();
  const breath = useSharedValue(0);
  /** Which way the breath is currently travelling: 1 in, -1 out. Lives on the
   *  UI thread so the reaction below never touches JS except on a turn. */
  const dir = useSharedValue(1);

  useEffect(() => {
    if (!enabled) return;
    if (paused) {
      cancelAnimation(breath);
      return;
    }
    const easingCfg = Easing.inOut(Easing.quad);
    // Equal legs keep the reversing repeat the timer practice has always run.
    // Only an asymmetric pace needs the two-timing sequence.
    breath.value =
      inhaleMs === exhaleMs
        ? withRepeat(withTiming(1, { duration: inhaleMs, easing: easingCfg }), -1, true)
        : withRepeat(
            withSequence(
              withTiming(1, { duration: inhaleMs, easing: easingCfg }),
              withTiming(0, { duration: exhaleMs, easing: easingCfg }),
            ),
            -1,
          );
    return () => cancelAnimation(breath);
  }, [enabled, paused, breath, inhaleMs, exhaleMs]);

  // The words ride the animation that already exists: the label flips on the
  // TURN of the same shared value, so it can never drift from the swell, and
  // JS hears from it twice a breath rather than sixty times a second.
  useAnimatedReaction(
    () => breath.value,
    (cur, prev) => {
      if (prev === null || !onPhase) return;
      if (cur === prev) return;
      const next = cur > prev ? 1 : -1;
      if (next === dir.value) return;
      dir.value = next;
      runOnJS(onPhase)(next === 1 ? "in" : "out");
    },
  );

  const SIZE = 260;
  const R = 118;
  const CIRC = 2 * Math.PI * R;

  // Indigo is the practice's accent; gold stays for the completion moment.
  const accent = breathMode ? pillar.mind : color.gold;
  const haloOuterColor = breathMode ? pillar.mind : color.saffronDeep;
  const haloInnerColor = breathMode ? pillar.mind : color.gold;
  const omColor = breathMode ? pillar.mind : color.goldHi;

  const haloOuter = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.1, 0.26]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [0.9, 1.12]) }],
  }));
  const haloInner = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.28, 0.12]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [1.06, 0.92]) }],
  }));
  const omStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [0.98, 1.1]) }],
  }));

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
      {/* breathing halos */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", width: 236, height: 236, borderRadius: 118, backgroundColor: haloOuterColor },
          haloOuter,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", width: 176, height: 176, borderRadius: 88, backgroundColor: haloInnerColor },
          haloInner,
        ]}
      />

      {/* progress ring — fills over the session */}
      <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={color.line} strokeWidth={3} fill="none" opacity={0.6} />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={accent}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        {/* where the bell will ring — static dots, no animation cost */}
        {Array.from({ length: bellMarks }, (_, i) => {
          const angle = (i + 1) * markEvery * 2 * Math.PI - Math.PI / 2;
          return (
            <Circle
              key={i}
              cx={SIZE / 2 + R * Math.cos(angle)}
              cy={SIZE / 2 + R * Math.sin(angle)}
              r={3}
              fill={color.gold}
              opacity={0.85}
            />
          );
        })}
      </Svg>

      {/* the ॐ */}
      <Animated.Text
        allowFontScaling={false}
        style={[
          {
            fontSize: 104,
            lineHeight: 150,
            textAlign: "center",
            paddingHorizontal: space.xxl,
            color: omColor,
            textShadowColor: breathMode ? pillar.mind : "rgba(242,200,121,0.5)",
            textShadowRadius: 28,
            textShadowOffset: { width: 0, height: 0 },
          },
          omStyle,
        ]}
      >
        ॐ
      </Animated.Text>
    </View>
  );
}
