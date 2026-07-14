import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { Screen, Button, FooterAction, B, T, DiyaIcon, color, space } from "../../src/ui";
import { pauseAudio, resumeAudio, stopAudio } from "../../src/lib/audio";
import { logActivity } from "../../src/lib/activity";

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
  const logged = useRef(false);

  // pulse animation for the ॐ
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

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
    stopAudio();
    logActivity(
      "meditation",
      {
        sound_id: sound === "silent" ? null : sound,
        set_min: totalSeconds / 60,
        actual_min: Math.round(actualSeconds / 60),
      },
      sound && sound !== "silent" ? sound : undefined,
    );
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
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
          <DiyaIcon size={72} />
          <B k="session_complete" variant="h1" center />
          <B k="well_done" variant="body" tone="muted" center />
        </View>
        <FooterAction>
          <Button k="done" onPress={() => router.dismissTo("/(tabs)/meditation")} />
        </FooterAction>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.xl }}>
        <Animated.Text
          style={{
            fontSize: 110,
            color: color.gold,
            transform: [{ scale: pulse }],
            textShadowColor: "rgba(217,164,65,0.45)",
            textShadowRadius: 30,
          }}
        >
          ॐ
        </Animated.Text>
        <T variant="display" style={{ fontVariant: ["tabular-nums"], fontSize: 56 }}>
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
