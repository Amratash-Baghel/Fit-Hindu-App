import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Chip, Button, FooterAction, B, T, OmGlyph, BellIcon, MuteIcon, Check, color, pillar, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listMeditationSounds, type SoundWithMedia } from "../../src/lib/content";
import { playLoop, stopAudio } from "../../src/lib/audio";
import { audioSourceFor, resolvePlayable } from "../../src/lib/localAudio";
import {
  DEFAULT_MINUTES,
  DEFAULT_PACE,
  getMedPrefs,
  saveMedPrefs,
  SILENT,
  type MedPace,
} from "../../src/lib/medPrefs";

const PRESETS = [5, 10, 15, 20, 30] as const;
const PACES: { key: MedPace; k: "pace_calm" | "pace_even" }[] = [
  { key: "calm", k: "pace_calm" },
  { key: "even", k: "pace_even" },
];

/**
 * Start — sound and duration on ONE screen (UI9 slice C, plate 12: "three
 * screens become one"). The hub's quick start skips even this; what lands here
 * is a deliberate pick.
 *
 * The live preview is unchanged from the retired `sounds.tsx`: the default
 * chant starts the moment the screen opens (arriving is never silent), tapping
 * switches it, and the loop carries into the session without restarting —
 * `_layout` owns the stop at the flow boundary.
 */
export default function MeditationStart() {
  const router = useRouter();
  const { t, loc, locSub } = useI18n();
  // Which practice this screen is setting up (UI9 slice D). The hub's Breath
  // row arrives here with mode=breath; anything else is the timer.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const breathMode = mode === "breath";

  const [sounds, setSounds] = useState<SoundWithMedia[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [minutes, setMinutes] = useState<number>(DEFAULT_MINUTES);
  const [bellOn, setBellOn] = useState(false);
  const [pace, setPace] = useState<MedPace>(DEFAULT_PACE);

  useEffect(() => {
    let alive = true;
    // The remembered setup lands here too — a user who always sits to Temple
    // Bells for 20 minutes should not re-pick both on the deliberate path
    // either. The sound falls back exactly the way the hub's does: saved sound
    // if still published, else the first, else silence.
    void Promise.all([getMedPrefs(), listMeditationSounds()])
      .then(([prefs, rows]) => {
        if (!alive) return;
        setSounds(rows);
        if (prefs) {
          setMinutes(prefs.minutes);
          setBellOn(prefs.bell);
          setPace(prefs.pace);
        }

        const saved = prefs?.soundId;
        const pick = saved === SILENT ? null : resolvePlayable(rows, saved);
        if (!pick) {
          setSelected(SILENT);
          return;
        }
        setSelected(pick.id);
        // Preview-on-land: arriving here is never silent.
        const src = audioSourceFor(pick.audio);
        if (src != null) playLoop(src);
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

  function begin() {
    const sound = selected || SILENT;
    const practice = breathMode ? "breath" : "timer";
    void saveMedPrefs({ soundId: sound, minutes, mode: practice, bell: bellOn, pace });
    router.push({
      pathname: "/meditation/session",
      params: {
        sound,
        min: String(minutes),
        mode: practice,
        bell: bellOn ? "1" : "0",
        ...(breathMode ? { pace } : {}),
      },
    });
  }

  const selectedStyle = { borderColor: pillar.mind, backgroundColor: pillar.mindWash };

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
          <ActivityIndicator color={pillar.mind} />
        </View>
      ) : (
        <ScrollView
          style={{ marginTop: space.md }}
          contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}
          showsVerticalScrollIndicator={false}
        >
          {sounds.map((item) => {
            const active = selected === item.id;
            const sub = locSub(item.name_hi, item.name_en);
            // Published but with no audio uploaded yet. Say so rather than
            // render a dead tap target — the same treatment the sleep list
            // already gives these rows.
            const placeholder = audioSourceFor(item.audio) == null;
            return (
              <Card
                key={item.id}
                onPress={placeholder ? undefined : () => choose(item)}
                haptic="select"
                style={[active ? selectedStyle : null, placeholder ? { opacity: 0.5 } : null]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  {placeholder ? (
                    <MuteIcon color={color.muted} />
                  ) : item.kind === "chant" ? (
                    <OmGlyph size={20} color={active ? pillar.mind : color.gold} />
                  ) : (
                    <BellIcon color={active ? pillar.mind : color.muted} />
                  )}
                  <View style={{ flex: 1 }}>
                    <T variant="bodyBold">{loc(item.name_hi, item.name_en)}</T>
                    {sub ? (
                      <T variant="caption" tone="muted">
                        {sub}
                      </T>
                    ) : null}
                  </View>
                  {placeholder ? (
                    <T variant="caption" tone="muted">
                      {t("soon_badge")}
                    </T>
                  ) : active ? (
                    <Check size={18} color={pillar.mind} />
                  ) : null}
                </View>
              </Card>
            );
          })}

          <Card onPress={() => choose(SILENT)} haptic="select" style={selected === SILENT ? selectedStyle : undefined}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <MuteIcon color={selected === SILENT ? pillar.mind : color.muted} />
              <T variant="bodyBold" style={{ flex: 1 }}>
                {t("silent_mode")}
              </T>
              {selected === SILENT ? <Check size={18} color={pillar.mind} /> : null}
            </View>
          </Card>

          {/* The old setup screen's whole job, now a row on this one. */}
          <View style={{ marginTop: space.md }}>
            <B k="timer_label" variant="bodyBold" noSub />
            <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm, flexWrap: "wrap" }}>
              {PRESETS.map((m) => (
                <Chip
                  key={m}
                  label={`${m} ${t("minutes_short")}`}
                  active={minutes === m}
                  onPress={() => setMinutes(m)}
                />
              ))}
            </View>
          </View>

          {/* Breath practice only — the rhythm the ॐ will keep (slice D). */}
          {breathMode ? (
            <View style={{ marginTop: space.md }}>
              <T variant="bodyBold">{t("pace_label")}</T>
              <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm, flexWrap: "wrap" }}>
                {PACES.map((p) => (
                  <Chip key={p.key} label={t(p.k)} active={pace === p.key} onPress={() => setPace(p.key)} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Off by default: a bell nobody asked for is an interruption. */}
          <View style={{ marginTop: space.md }}>
            <Chip label={t("bell_every_5")} active={bellOn} onPress={() => setBellOn((v) => !v)} />
          </View>
        </ScrollView>
      )}

      <FooterAction>
        <Button k="begin" onPress={begin} />
      </FooterAction>
    </Screen>
  );
}
