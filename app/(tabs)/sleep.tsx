/**
 * Sleep sounds (docs/specs/sleep.md) — night-indigo mood, the one deliberate
 * palette shift in the app.
 *
 * Content-driven: renders whatever `sounds` of kind 'sleep' are published.
 * Publishing a row fills the tab — no code change, no release.
 */
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Screen, Card, B, T, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listSleepSounds, type SoundWithMedia } from "../../src/lib/content";

export default function Sleep() {
  const { loc, t } = useI18n();
  const [sounds, setSounds] = useState<SoundWithMedia[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    listSleepSounds()
      .then((s) => {
        if (!alive) return;
        setSounds(s);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen night>
      <B k="tab_sleep" variant="h1" />

      {status === "loading" ? <B k="loading" variant="body" tone="muted" /> : null}
      {status === "error" ? <B k="sleep_error" variant="body" tone="muted" /> : null}

      {/* The launch state until the content team publishes sleep audio. */}
      {status === "ok" && sounds?.length === 0 ? (
        <Card night>
          <B k="coming_soon" variant="body" tone="muted" />
        </Card>
      ) : null}

      {sounds?.map((s) => (
        <Card key={s.id} night>
          <View style={{ gap: space.xs }}>
            <T variant="bodyBold">{loc(s.name_hi, s.name_en)}</T>
            {/* A sound with no media is a placeholder: it lists, it just can't play. */}
            <T variant="caption" tone="muted">
              {s.audio && s.duration_seconds
                ? `${Math.round(s.duration_seconds / 60)} ${t("minutes_short")}`
                : ""}
            </T>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
