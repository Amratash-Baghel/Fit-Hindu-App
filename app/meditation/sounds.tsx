import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button, FooterAction, B, T, OmGlyph, BellIcon, MuteIcon, color, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listMeditationSounds, type SoundWithMedia } from "../../src/lib/content";
import { playLoop, stopAudio } from "../../src/lib/audio";
import { audioSourceFor } from "../../src/lib/localAudio";

const SILENT = "silent";

/**
 * Step 1 — sound selector. The default ॐ chant starts playing the moment the
 * screen opens (instant feedback, nothing silent); tapping switches the
 * preview live; the sound carries into the session without restarting.
 */
export default function MeditationSounds() {
  const router = useRouter();
  const { t, loc, locSub } = useI18n();
  const [sounds, setSounds] = useState<SoundWithMedia[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    let alive = true;
    listMeditationSounds()
      .then((rows) => {
        if (!alive) return;
        setSounds(rows);
        const first = rows[0];
        if (first) {
          setSelected(first.id);
          const src = audioSourceFor(first.audio);
          if (src != null) playLoop(src);
        } else {
          setSelected(SILENT);
        }
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  function choose(item: SoundWithMedia | typeof SILENT) {
    // haptic comes from the Card (haptic="select"); no extra call here.
    if (item === SILENT) {
      setSelected(SILENT);
      stopAudio();
      return;
    }
    setSelected(item.id);
    const src = audioSourceFor(item.audio);
    if (src != null) playLoop(src);
    else stopAudio();
  }

  return (
    <Screen scroll={false}>
      <View style={{ paddingTop: space.md }}>
        <B k="choose_sound" variant="h1" />
        <B k="sound_playing_hint" variant="caption" tone="muted" noSub />
      </View>

      {error ? (
        <B k="error_generic" variant="body" tone="danger" />
      ) : sounds === null ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator color={color.saffron} />
        </View>
      ) : (
        <FlatList
          data={sounds}
          keyExtractor={(s) => s.id}
          style={{ marginTop: space.md }}
          contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}
          ListFooterComponent={
            <Card
              onPress={() => choose(SILENT)}
              haptic="select"
              style={
                selected === SILENT
                  ? { borderColor: color.saffron, backgroundColor: "rgba(240,118,30,0.10)" }
                  : undefined
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <MuteIcon color={selected === SILENT ? color.saffron : color.muted} />
                <T variant="bodyBold">{t("silent_mode")}</T>
              </View>
            </Card>
          }
          renderItem={({ item }) => {
            const active = selected === item.id;
            const sub = locSub(item.name_hi, item.name_en);
            return (
              <Card
                onPress={() => choose(item)}
                haptic="select"
                style={active ? { borderColor: color.saffron, backgroundColor: "rgba(240,118,30,0.10)" } : undefined}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  {item.kind === "chant" ? (
                    <OmGlyph size={20} color={active ? color.saffron : color.gold} />
                  ) : (
                    <BellIcon color={active ? color.saffron : color.muted} />
                  )}
                  <View style={{ flex: 1 }}>
                    <T variant="bodyBold">{loc(item.name_hi, item.name_en)}</T>
                    {sub ? (
                      <T variant="caption" tone="muted">
                        {sub}
                      </T>
                    ) : null}
                  </View>
                  {active ? (
                    <T tone="saffron" variant="bodyBold">
                      ✓
                    </T>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}

      <FooterAction>
        <Button
          k="next"
          onPress={() => router.push({ pathname: "/meditation/setup", params: { sound: selected } })}
        />
      </FooterAction>
    </Screen>
  );
}
