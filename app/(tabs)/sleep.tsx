import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Screen, Card, Chip, Button, B, T, MoonIcon, MuteIcon, color, radius, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listSleepSounds, type SleepSound } from "../../src/lib/content";
import { playLoop, stopAudio } from "../../src/lib/audio";
import { logActivity } from "../../src/lib/activity";

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

  // Leaving the tab must not leave audio running forever with no visible
  // control — the screen owns the player it started.
  useEffect(() => stop, [stop]);

  // Latest-value mirror so the 1s tick reads current state and can end
  // playback without the interval being torn down every second.
  const latest = useRef({ secLeft, stop });
  useEffect(() => {
    latest.current = { secLeft, stop };
  });

  useEffect(() => {
    if (playingId === null || minutes === 0) return;
    const id = setInterval(() => {
      const { secLeft: s, stop: end } = latest.current;
      if (s === null) return;
      if (s <= 1) {
        end(); // auto-stop reached — clears playingId and secLeft together
        return;
      }
      setSecLeft(s - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [playingId, minutes]);

  const play = useCallback(
    (s: SleepSound) => {
      const url = s.audio?.playback_url;
      if (!url) return; // placeholder row — not tappable
      if (playingId === s.id) {
        stop();
        return;
      }
      void playLoop(url);
      setPlayingId(s.id);
      // Mirror bumped synchronously for the same reason as pickTimer: switching
      // straight from a playing sound to another leaves the previous interval
      // alive until commit, and its tick would clobber this fresh countdown.
      const next = minutes > 0 ? minutes * 60 : null;
      latest.current.secLeft = next;
      setSecLeft(next);
      logActivity("sleep_sound", { minutes }, s.id);
    },
    [playingId, minutes, stop],
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
  // No media yet = placeholder. Say so rather than render a dead tap target.
  const placeholder = !sound.audio?.playback_url;

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
