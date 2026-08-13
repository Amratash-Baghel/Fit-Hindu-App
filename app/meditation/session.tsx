import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { Screen, Button, FooterAction, B, T, CompletionDiya, GoldWash, PointsEarned, useMotion, color, space } from "../../src/ui";
import { pauseAudio, resumeAudio, stopAudio, fadeOutStop } from "../../src/lib/audio";
import { logActivity } from "../../src/lib/activity";
import { earnSince, pointsTodayNow, type ActivityEarn } from "../../src/lib/points";
import { feedback } from "../../src/lib/feedback";

/**
 * Step 3 — the session: pulsing ॐ, ticking countdown, sound looping from the
 * selector (never restarted), gentle completion moment. Partial sessions of
 * ≥3 minutes still count as completed (spec: generosity over strictness).
 */
export default function MeditationSession() {
  useKeepAwake();
  const router = useRouter();
  const { sound, min } = useLocalSearchParams<{ sound: string; min: string }>();
  const totalSeconds = Math.max(1, Number(min ?? 15)) * 60;

  const [left, setLeft] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [earn, setEarn] = useState<ActivityEarn | null>(null);
  const logged = useRef(false);
  /** Today's points before this session is logged, for the earned delta. */
  const pointsBefore = useRef<number | null>(null);

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
    void logActivity(
      "meditation",
      {
        sound_id: sound === "silent" ? null : sound,
        set_min: totalSeconds / 60,
        actual_min: Math.round(actualSeconds / 60),
      },
      sound && sound !== "silent" ? sound : undefined,
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

  if (finished) {
    return (
      <Screen scroll={false} overlay={<GoldWash />}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
          <CompletionDiya diyaSize={72} burstSize={200} rays={10} />
          <B k="session_complete" variant="h1" center />
          <B k="well_done" variant="body" tone="muted" center />
          <PointsEarned earned={earn?.earned ?? null} total={earn?.total ?? null} style={{ marginTop: space.sm }} />
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.xl }}>
        <BreathingOm progress={progress} paused={paused} />
        <T variant="display" style={{ fontVariant: ["tabular-nums"], fontSize: 56, letterSpacing: 2 }}>
          {mm}:{ss}
        </T>
      </View>

      <FooterAction>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              k={paused ? "resume" : "pause"}
              kind="ghost"
              onPress={() => {
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
            <Button k="end_session" kind="ghost" onPress={endEarly} />
          </View>
        </View>
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
function BreathingOm({ progress, paused }: { progress: number; paused: boolean }) {
  const enabled = useMotion();
  const breath = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;
    if (paused) {
      cancelAnimation(breath);
      return;
    }
    // ~4.6s in-and-out — an unhurried, meditative breath.
    breath.value = withRepeat(withTiming(1, { duration: 4600, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(breath);
  }, [enabled, paused, breath]);

  const SIZE = 260;
  const R = 118;
  const CIRC = 2 * Math.PI * R;

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
          { position: "absolute", width: 236, height: 236, borderRadius: 118, backgroundColor: color.saffronDeep },
          haloOuter,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", width: 176, height: 176, borderRadius: 88, backgroundColor: color.gold },
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
          stroke={color.gold}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
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
            color: color.goldHi,
            textShadowColor: "rgba(242,200,121,0.5)",
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
