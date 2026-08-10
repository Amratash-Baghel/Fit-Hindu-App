import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen, Card, Chip, Button, B, T, MoonIcon, MuteIcon, RewardOverlay, color, radius, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listSleepSounds, type SleepSound } from "../../src/lib/content";
import { isPlaying, playLoop, stopAudio, subscribeAudio } from "../../src/lib/audio";
import { audioSourceFor } from "../../src/lib/localAudio";
import { logActivity } from "../../src/lib/activity";
import { earnSince, pointsTodayNow } from "../../src/lib/points";
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
    const logged = logActivity(
      "sleep_sound",
      { minutes: runTimerRef.current, actual_min: actualMin, timer_completed: timerCompleted },
      runRefIdRef.current ?? undefined,
      // Same id the mirror holds, so a live log and a stale reconcile dedup.
      runEventIdRef.current ?? undefined,
    );
    if (present) {
      void logged.then(async (ok) => {
        // Diff only when the write landed, so a failed log shows the "rest
        // complete" moment without a misleading "already claimed" line.
        const e = await earnSince(ok ? before : null);
        setReward({ earned: e.earned, total: e.total });
      });
    }
  }, []);

  // Auto-stop reached: record it as a completed timer, then stop.
  const finishTimer = useCallback(() => {
    logRunIfQualified(true, true); // timer finished on-screen — reward the user
    stop();
  }, [logRunIfQualified, stop]);

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
        <B k="sleep_tagline" variant="caption" tone="nightMuted" />
        {/* Why 5 minutes and not a tap: points are for real listening, so a user
            who stops early knows why nothing was banked (migration 0020). */}
        <B k="sleep_needs_five" variant="caption" tone="nightMuted" />

        {sounds.length === 0 ? (
          <Card night style={{ marginTop: space.md }}>
            <B k="sleep_empty" variant="body" tone="nightMuted" />
          </Card>
        ) : (
          <>
            {/* auto-stop timer */}
            <View style={{ marginTop: space.sm }}>
              <T variant="eyebrow" tone="nightMuted" style={{ marginBottom: space.sm }}>
                {t("sleep_timer")}
              </T>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                {TIMERS.map((m) => (
                  <Chip
                    key={m}
                    label={m === 0 ? t("timer_off") : `${m} ${t("minutes_short")}`}
                    active={minutes === m}
                    onPress={() => pickTimer(m)}
                  />
                ))}
              </View>
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
  // No playable source (no media, or a local track with no bundled file) =
  // placeholder. Say so rather than render a dead tap target.
  const placeholder = audioSourceFor(sound.audio) == null;

  return (
    <Card
      night
      onPress={placeholder ? undefined : onPress}
      style={[
        { paddingVertical: space.md },
        playing ? { borderColor: color.saffron } : null,
        placeholder ? { opacity: 0.5 } : null,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.button,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: playing ? "rgba(240,118,30,0.16)" : color.nightLine,
          }}
        >
          {placeholder ? (
            <MuteIcon color={color.nightMuted} size={18} />
          ) : (
            <MoonIcon color={playing ? color.saffron : color.nightMuted} size={18} />
          )}
        </View>

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
            <T variant="caption" tone="saffron" style={{ fontVariant: ["tabular-nums"] }}>
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
