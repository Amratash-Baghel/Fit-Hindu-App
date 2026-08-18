import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import {
  Screen,
  Card,
  Button,
  B,
  T,
  IconSlot,
  PressableScale,
  MoonIcon,
  MuteIcon,
  RewardOverlay,
  useMotion,
  color,
  pillar,
  pressScale,
  radius,
  scrim,
  space,
} from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listSleepSounds, type SleepSound } from "../../src/lib/content";
import { fadeOutStop, isPlaying, playLoop, stopAudio, subscribeAudio } from "../../src/lib/audio";
import { audioSourceFor } from "../../src/lib/localAudio";
import { logActivityDurable } from "../../src/lib/activity";
import { earnSince, pointsTodayNow } from "../../src/lib/points";
import { feedback } from "../../src/lib/feedback";
import { beginSleepRun, markSleepAlive, clearSleepRun } from "../../src/lib/sleepRun";
import { uuidv4 } from "../../src/lib/ids";

/** Auto-stop options in minutes. 0 = off (explicit user choice, never default). */
const TIMERS = [15, 30, 60, 0] as const;
const DEFAULT_MINUTES = 30;

/**
 * Sleep sounds (docs/specs/sleep.md) — night-indigo mood, looping audio with
 * a mandatory-by-default auto-stop so nothing plays all night.
 */
export default function Sleep() {
  const { t, loc } = useI18n();
  const [sounds, setSounds] = useState<SleepSound[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [minutes, setMinutes] = useState<number>(DEFAULT_MINUTES);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [secLeft, setSecLeft] = useState<number | null>(null); // null = no timer running
  /** The reward shown when a qualifying run ends while the user is watching. */
  const [reward, setReward] = useState<{ earned: number | null; total: number | null } | null>(null);
  const motion = useMotion();

  useEffect(() => {
    let alive = true;
    listSleepSounds()
      .then((rows) => {
        if (!alive) return;
        setSounds(rows);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const stop = useCallback(() => {
    stopAudio();
    setPlayingId(null);
    setSecLeft(null);
  }, []);

  // Timer-end fade (UI9 slice A): the auto-stop softens the sound out over ~1.2s
  // instead of a hard cut — the same gentle ending meditation has. UI state is
  // reset SYNCHRONOUSLY (so the countdown interval tears down and the dim clears
  // at once); fadeOutStop ramps the now-detached player's volume and calls
  // stopAudio itself when the ramp lands, at which point the subscribeAudio sync
  // is a no-op. Only the sound's exit changes — the run is already logged by the
  // time finishTimer calls this, so the logging math never sees the difference.
  const stopFaded = useCallback(() => {
    void fadeOutStop(1200);
    setPlayingId(null);
    setSecLeft(null);
  }, []);

  // What the current listening run is — set when a sound starts, read when it
  // ends. Sleep is only recorded AFTER real listening: logging on the play tap
  // (the old behaviour) banked a point per tap and recorded nothing about
  // whether anyone actually listened, so the points rule (actual_min >= 5,
  // migration 0020) could never be evaluated honestly.
  const runStartRef = useRef<number | null>(null); // ms at play, null = nothing playing
  const runRefIdRef = useRef<string | null>(null); // the sound id, for ref_id
  const runTimerRef = useRef<number>(0); // the chosen auto-stop, for meta.minutes
  const runEventIdRef = useRef<string | null>(null); // shared with the crash-recovery mirror
  const loggedRef = useRef(false); // one row per run — guards the multi-path stop
  const runPointsBeforeRef = useRef<number | null>(null); // today's points at play-start, for the earn delta

  // Log the run that is ending, once, iff it heard >= 5 real minutes. Stable
  // (reads refs only), so every stop path — user tap, timer, blur, the global
  // pill — can call it and the guards make repeat calls no-ops.
  // `present` = the user is on the screen to see a reward (the timer finished,
  // or they tapped the playing row to stop). Blur / sound-switch / external-stop
  // pass false: they still LOG the run, but showing a modal while the user is
  // leaving (or a modal that pops mid sound-switch) would be wrong.
  const logRunIfQualified = useCallback((timerCompleted: boolean, present = false) => {
    const startedAt = runStartRef.current;
    runStartRef.current = null;
    if (startedAt === null || loggedRef.current) return;
    const actualMin = Math.floor((Date.now() - startedAt) / 60000);
    // The run ended in-app: drop the crash-recovery mirror either way, so the
    // launch reconcile never re-logs a run the user already finished short.
    void clearSleepRun();
    if (actualMin < 5) return; // too little listening to count as sleep
    loggedRef.current = true;
    const before = runPointsBeforeRef.current;
    const logged = logActivityDurable(
      "sleep_sound",
      { minutes: runTimerRef.current, actual_min: actualMin, timer_completed: timerCompleted },
      runRefIdRef.current ?? undefined,
      // Same id the mirror holds, so a live log and a stale reconcile dedup —
      // and now also the id an offline retry reuses, so it can't double-log.
      // Always set by the time a run can qualify (stamped at play-start).
      runEventIdRef.current ?? uuidv4(),
    );
    if (present) {
      // the completion SOUND (the reward overlay's diya supplies the haptic) —
      // so a finished rest rings like every other completion (audit 2026-08-14:
      // sleep was the one reward with no sound).
      feedback.completeChime();
      void logged.then(async (ok) => {
        // Diff only when the write landed, so a failed log shows the "rest
        // complete" moment without a misleading "already claimed" line.
        const e = await earnSince(ok ? before : null);
        setReward({ earned: e.earned, total: e.total });
      });
    }
  }, []);

  // Auto-stop reached: record it as a completed timer, then fade out.
  const finishTimer = useCallback(() => {
    logRunIfQualified(true, true); // timer finished on-screen — reward the user
    stopFaded(); // gentle fade rather than a hard cut (spec v2)
  }, [logRunIfQualified, stopFaded]);

  // Leaving the Sleep tab must silence the sound it started. This is a FOCUS
  // effect, not an unmount effect: a bottom tab stays mounted when you switch
  // away from it, so an unmount cleanup would never fire on a tab switch and the
  // loop would keep playing across the whole app (the leak this fixes). The
  // blur cleanup fires on every navigation away and on real unmount, and — key
  // for sleep — locking the phone is an AppState background, NOT a navigation
  // blur, so it does NOT fire then: the sound keeps playing as you fall asleep,
  // which is the entire point of the surface. Record the run first.
  useFocusEffect(
    useCallback(
      () => () => {
        logRunIfQualified(false);
        stopAudio();
      },
      [logRunIfQualified],
    ),
  );

  // Stay in sync with an external stop (the global AudioStopPill hard-stops the
  // singleton): record the run if it qualifies, then reset this screen's
  // row/timer state so it never shows "playing" over silence. On our own stop
  // paths the run is already logged, so this call is a no-op.
  useEffect(
    () =>
      subscribeAudio(() => {
        if (!isPlaying()) {
          logRunIfQualified(false);
          setPlayingId(null);
          setSecLeft(null);
        }
      }),
    [logRunIfQualified],
  );

  // Latest-value mirror so the 1s tick reads current state and can end
  // playback without the interval being torn down every second.
  const latest = useRef({ secLeft, finishTimer });
  useEffect(() => {
    latest.current = { secLeft, finishTimer };
  });

  useEffect(() => {
    if (playingId === null || minutes === 0) return;
    const id = setInterval(() => {
      const { secLeft: s, finishTimer: end } = latest.current;
      if (s === null) return;
      if (s <= 1) {
        end(); // auto-stop reached — logs a completed timer, clears state
        return;
      }
      setSecLeft(s - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [playingId, minutes]);

  // Heartbeat for crash recovery — bump the mirror's last-alive stamp while a
  // sound plays, regardless of the timer (the countdown above only runs with a
  // timer set). This stamp is the ceiling on the minutes the launch reconcile
  // may claim, so we never count a backgrounded/killed stretch as listening.
  useEffect(() => {
    if (playingId === null) return;
    const id = setInterval(() => void markSleepAlive(), 30000);
    return () => clearInterval(id);
  }, [playingId]);

  const play = useCallback(
    (s: SleepSound) => {
      const src = audioSourceFor(s.audio);
      if (src == null) return; // placeholder row — not tappable
      if (playingId === s.id) {
        logRunIfQualified(false, true); // tapping the playing row stops it — reward if it qualified
        stop();
        return;
      }
      // Switching straight from another sound ends that run first (no reward
      // mid-switch — the user is starting another sound, not finishing).
      if (runStartRef.current !== null) logRunIfQualified(false);
      void playLoop(src, { background: true });
      setPlayingId(s.id);
      // Open a fresh listening run. The event id is generated here (synchronously
      // available to the live log path) and shared with the crash-recovery
      // mirror so a launch reconcile of this run dedups against a live log.
      const eventId = uuidv4();
      runStartRef.current = Date.now();
      runRefIdRef.current = s.id;
      runTimerRef.current = minutes;
      runEventIdRef.current = eventId;
      loggedRef.current = false;
      // Snapshot today's points at play-start — the "before" for this run's earn
      // delta, captured well before the run is logged at stop/timer.
      void pointsTodayNow().then((v) => {
        runPointsBeforeRef.current = v;
      });
      void beginSleepRun(eventId, s.id, minutes);
      // Mirror bumped synchronously for the same reason as pickTimer: switching
      // straight from a playing sound to another leaves the previous interval
      // alive until commit, and its tick would clobber this fresh countdown.
      const next = minutes > 0 ? minutes * 60 : null;
      latest.current.secLeft = next;
      setSecLeft(next);
    },
    [playingId, minutes, stop, logRunIfQualified],
  );

  const pickTimer = useCallback(
    (m: number) => {
      setMinutes(m);
      // Changing the timer mid-play restarts the countdown (spec). The mirror
      // is bumped synchronously: the tick writes an absolute value derived
      // from the last commit, so a tick landing in the window between this
      // press and the next render would otherwise overwrite the new duration
      // with the old one and silently discard the user's choice.
      if (playingId) {
        const next = m > 0 ? m * 60 : null;
        latest.current.secLeft = next;
        setSecLeft(next);
      }
    },
    [playingId],
  );

  if (status === "loading") {
    return (
      <Screen night scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.nightMuted} />
        </View>
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen night scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
          <B k="sleep_error" variant="body" tone="nightMuted" center />
          <Button k="retry" kind="ghost" onPress={() => { setStatus("loading"); setReloadKey((n) => n + 1); }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen night scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <MoonIcon color={color.nightMuted} size={26} />
          <B k="sleep_title" variant="h1" />
        </View>
        {/* Wind-down framing up front — the sound stops itself, so no one has to
            stay awake to turn it off (spec v2). */}
        <B k="sleep_winddown" variant="caption" tone="nightMuted" />
        {/* Why 5 minutes and not a tap: points are for real listening, so a user
            who stops early knows why nothing was banked (migration 0020). */}
        <B k="sleep_needs_five" variant="caption" tone="nightMuted" />

        {sounds.length === 0 ? (
          <Card night style={{ marginTop: space.md }}>
            <B k="sleep_empty" variant="body" tone="nightMuted" />
          </Card>
        ) : (
          <>
            {/* auto-stop timer — one segmented dial, not four loose chips */}
            <View style={{ marginTop: space.sm }}>
              <T variant="eyebrow" tone="nightMuted" style={{ marginBottom: space.sm }}>
                {t("sleep_timer")}
              </T>
              <SegmentedDial value={minutes} onPick={pickTimer} />
              {/* the dim only happens with motion on, so only mention it there */}
              {motion ? (
                <T variant="caption" tone="nightMuted" style={{ marginTop: space.sm, opacity: 0.8 }}>
                  {t("sleep_dim_hint")}
                </T>
              ) : null}
            </View>

            <View style={{ gap: space.sm, marginTop: space.sm }}>
              {sounds.map((s) => (
                <SoundRow
                  key={s.id}
                  sound={s}
                  playing={playingId === s.id}
                  secLeft={playingId === s.id ? secLeft : null}
                  onPress={() => play(s)}
                  label={loc(s.name_hi, s.name_en)}
                  deityLabel={s.deity ? loc(s.deity.name_hi, s.deity.name_en) : null}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Screen dims 30s into playback so a lit phone doesn't keep you up; any
          tap wakes it. Cleared the moment playback stops (keyed on playingId).
          Gated on motion inside the component. */}
      <SleepDim playing={playingId !== null} label={secLeft != null ? mmss(secLeft) : t("sleep_playing")} />

      <RewardOverlay
        visible={reward != null}
        titleKey="sleep_reward_title"
        bodyKey="sleep_reward_body"
        earned={reward?.earned ?? null}
        total={reward?.total ?? null}
        onDone={() => setReward(null)}
      />
    </Screen>
  );
}

/**
 * The auto-stop control as a single segmented dial (UI9 slice A) — same
 * TIMERS / pickTimer, tokens only: night-steel track, indigo active segment.
 */
function SegmentedDial({ value, onPick }: { value: number; onPick: (m: number) => void }) {
  const { t } = useI18n();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: space.xs,
        padding: space.xs,
        borderRadius: radius.chip,
        borderWidth: 1,
        borderColor: color.nightLine,
        backgroundColor: color.nightSurface,
      }}
    >
      {TIMERS.map((m) => {
        const active = value === m;
        return (
          <PressableScale key={m} onPress={() => onPick(m)} haptic="select" scaleTo={pressScale.button} style={{ flex: 1 }}>
            <View
              style={{
                paddingVertical: space.sm,
                alignItems: "center",
                borderRadius: radius.chip,
                borderWidth: 1,
                borderColor: active ? pillar.mind : "transparent",
                backgroundColor: active ? pillar.mindWash : "transparent",
              }}
            >
              <T variant="caption" tone={active ? "cream" : "nightMuted"} style={active ? { fontWeight: "700" } : undefined}>
                {m === 0 ? t("timer_off") : String(m)}
              </T>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/**
 * The breathing indigo ring on the playing row — one shared value, opacity only,
 * on the UI thread (low-end-Android rule). Rendered only while playing AND motion
 * is on; sits over the card's static border as a soft ~3.8s pulse.
 */
function PlayingGlow() {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withRepeat(withTiming(0.85, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(v);
  }, [v]);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius.card, borderWidth: 1.5, borderColor: pillar.mind }, st]}
    />
  );
}

/**
 * SleepDim — a full-screen scrim that fades in 30s after playback starts so a lit
 * phone doesn't keep the user awake; any tap wakes it and re-arms the timer. It
 * clears the moment playback stops (keyed on `playing`) or the tab blurs (this
 * whole tab unmounts-in-place then). Opacity only, on the UI thread, and gated on
 * useMotion — reduce-motion and web never auto-dim.
 */
function SleepDim({ playing, label }: { playing: boolean; label: string }) {
  const enabled = useMotion();
  const op = useSharedValue(0);
  const [dimmed, setDimmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const arm = useCallback(() => {
    clear();
    timer.current = setTimeout(() => setDimmed(true), 30000);
  }, [clear]);

  useEffect(() => {
    if (!playing || !enabled) {
      clear();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: a one-shot reset of a UI-only flag when the external "playing" signal drops, so the next playback starts un-dimmed. Not a cascade.
      setDimmed(false);
      return;
    }
    arm();
    return clear;
  }, [playing, enabled, arm, clear]);

  useEffect(() => {
    op.value = withTiming(dimmed ? 1 : 0, { duration: dimmed ? 1400 : 420 });
  }, [dimmed, op]);

  const st = useAnimatedStyle(() => ({ opacity: op.value }));
  if (!enabled) return null;
  return (
    <Animated.View
      pointerEvents={dimmed ? "auto" : "none"}
      style={[StyleSheet.absoluteFill, { backgroundColor: scrim, alignItems: "center", justifyContent: "center" }, st]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          setDimmed(false);
          arm();
        }}
      />
      <T variant="display" tone="nightMuted" style={{ fontVariant: ["tabular-nums"], opacity: 0.55 }}>
        {label}
      </T>
    </Animated.View>
  );
}

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SoundRow({
  sound,
  playing,
  secLeft,
  onPress,
  label,
  deityLabel,
}: {
  sound: SleepSound;
  playing: boolean;
  secLeft: number | null;
  onPress: () => void;
  label: string;
  deityLabel: string | null;
}) {
  const { t } = useI18n();
  const motion = useMotion();
  // No playable source (no media, or a local track with no bundled file) =
  // placeholder. Say so rather than render a dead tap target.
  const placeholder = audioSourceFor(sound.audio) == null;

  return (
    <Card
      night
      onPress={placeholder ? undefined : onPress}
      style={[
        { paddingVertical: space.md },
        playing ? { borderColor: pillar.mind } : null,
        placeholder ? { opacity: 0.5 } : null,
      ]}
    >
      {playing && motion ? <PlayingGlow /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <IconSlot size={42} radius={radius.button} tone="night">
          {placeholder ? (
            <MuteIcon color={color.nightMuted} size={18} />
          ) : (
            <MoonIcon color={playing ? pillar.mind : color.nightMuted} size={18} />
          )}
        </IconSlot>

        <View style={{ flex: 1 }}>
          <T variant="bodyBold">{label}</T>
          {deityLabel ? (
            <T variant="caption" tone="nightMuted">
              {deityLabel}
            </T>
          ) : null}
        </View>

        {placeholder ? (
          <T variant="caption" tone="nightMuted">
            {t("soon_badge")}
          </T>
        ) : playing ? (
          <View style={{ alignItems: "flex-end" }}>
            {/* indigo is the accent of night — style color wins over tone */}
            <T variant="caption" style={{ color: pillar.mind, fontVariant: ["tabular-nums"], fontWeight: "700" }}>
              {secLeft === null ? t("sleep_playing") : mmss(secLeft)}
            </T>
            <T variant="caption" tone="nightMuted">
              {t("sleep_stop")}
            </T>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
