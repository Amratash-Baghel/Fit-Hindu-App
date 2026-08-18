import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Screen,
  Card,
  Chip,
  CoinHalo,
  EmberCard,
  Button,
  Reveal,
  IconSlot,
  AvatarTile,
  PressableScale,
  B,
  T,
  ChevronRight,
  LotusIcon,
  OmGlyph,
  BellIcon,
  color,
  pillar,
  radius,
  space,
} from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { listMeditationSounds, type SoundWithMedia } from "../../src/lib/content";
import { playLoop, stopAudio } from "../../src/lib/audio";
import { audioSourceFor, resolvePlayable } from "../../src/lib/localAudio";
import {
  DEFAULT_MINUTES,
  DEFAULT_MODE,
  DEFAULT_PACE,
  getMedPrefs,
  saveMedPrefs,
  SILENT,
  type MedPrefs,
} from "../../src/lib/medPrefs";
import { fetchMeditationWeek, type MeditationWeek } from "../../src/lib/progress";
import { useAuth } from "../../src/lib/auth";

/** The hall's halo — the hero mark at the top of Mind. */
const HERO = 148;

/**
 * The Mind hub (UI9 slice C — docs/specs/meditation.md v2).
 *
 * "A practice has a room of its own, with your seat still warm in it." This tab
 * used to be one glyph and one button opening a three-screen corridor — the
 * emptiest room in the app, for the pillar the redesign is named after. It now
 * opens on Begin (your last sound and duration, remembered locally), with the
 * practices as first-class rows, your week of minutes in the Mind indigo, and
 * the instructions moved into a fold you open when you want them.
 */
export default function Meditation() {
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useAuth();
  const [sounds, setSounds] = useState<SoundWithMedia[] | null>(null);
  const [prefs, setPrefs] = useState<MedPrefs | null>(null);
  const [loadedPrefs, setLoadedPrefs] = useState(false);
  const [week, setWeek] = useState<MeditationWeek | null>(null);
  const [howOpen, setHowOpen] = useState(false);

  // Everything the hub shows is re-read on focus: coming back from a session is
  // exactly when prefs and the week change, and re-reading the sound list means
  // one failed query (a tunnel on first open) doesn't leave quick start stuck
  // on silence until the app restarts.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      // The sound list is what turns a saved id into a NAME, and what the quick
      // start plays — one read, not one per concern.
      listMeditationSounds()
        .then((rows) => alive && setSounds(rows))
        .catch(() => alive && setSounds((prev) => prev ?? []));
      void getMedPrefs().then((p) => {
        if (!alive) return;
        setPrefs(p);
        setLoadedPrefs(true);
      });
      const uid = session?.user.id;
      if (uid) {
        void fetchMeditationWeek(uid).then((w) => alive && setWeek(w));
      } else {
        setWeek(null);
      }
      return () => {
        alive = false;
      };
    }, [session?.user.id]),
  );

  /**
   * The resolved sound for the quick start: the saved one while it is still
   * published, else the first published sound, else silence. A sound the
   * content team unpublished must never strand the one-tap path.
   */
  const savedId = prefs?.soundId;
  const quickSound = savedId === SILENT ? null : resolvePlayable(sounds ?? [], savedId);
  // Silent when it was chosen, and when there is simply nothing playable.
  const quickSilent = savedId === SILENT || quickSound === null;
  const quickMinutes = prefs?.minutes ?? DEFAULT_MINUTES;

  function quickStart() {
    const soundId = quickSilent ? SILENT : (quickSound?.id ?? SILENT);
    // Quick start resumes the PRACTICE, not just the sound — whatever was run
    // last, on the same pace and bell setting.
    const practice = prefs?.mode ?? DEFAULT_MODE;
    const bell = prefs?.bell === true;
    const pace = prefs?.pace ?? DEFAULT_PACE;
    // The session screen has never started audio — the sound selector did, and
    // it carried across unrestarted. The starting point moves here; the rule
    // (and `_layout`'s stop at the flow boundary) is unchanged.
    if (quickSound && !quickSilent) {
      const src = audioSourceFor(quickSound.audio);
      if (src != null) playLoop(src);
      else stopAudio();
    } else {
      stopAudio();
    }
    void saveMedPrefs({ soundId, minutes: quickMinutes, mode: practice, bell, pace });
    router.push({
      pathname: "/meditation/session",
      params: {
        sound: soundId,
        min: String(quickMinutes),
        mode: practice,
        bell: bell ? "1" : "0",
        ...(practice === "breath" ? { pace } : {}),
      },
    });
  }

  return (
    <Screen>
      {/* the hall itself — a breathing indigo halo around the ॐ, the room's
          own light before a word is read (owner 2026-08-18: make Mind feel
          premium). The halo is the same living layer as Home's coins, so the
          two surfaces breathe in one language. */}
      <Reveal>
        <View style={{ alignItems: "center", paddingTop: space.md, paddingBottom: space.lg }}>
          <View style={{ width: HERO, height: HERO, alignItems: "center", justifyContent: "center" }}>
            <CoinHalo size={HERO} tint={pillar.mind} />
            <View
              style={{
                width: HERO * 0.66,
                height: HERO * 0.66,
                borderRadius: HERO,
                borderWidth: 1,
                borderColor: pillar.mindWash,
                backgroundColor: color.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <OmGlyph size={44} color={pillar.mind} />
            </View>
          </View>
          <B
            k="tab_meditation"
            variant="h1"
            noSub
            center
            style={{ color: pillar.mind, marginTop: space.lg }}
          />
          <B k="med_tagline" variant="caption" tone="muted" noSub center style={{ marginTop: 2 }} />
        </View>
      </Reveal>

      <Reveal lift delay={80}>
        <QuickStart
          returning={prefs != null}
          ready={loadedPrefs && sounds !== null}
          minutes={quickMinutes}
          soundLabel={quickSilent ? null : quickSound}
          practiceK={prefs?.mode === "breath" ? "practice_breath" : null}
          onBegin={quickStart}
        />
      </Reveal>

      <Reveal lift delay={160}>
        <View style={{ marginTop: space.xl, gap: space.sm }}>
          <T variant="eyebrow" style={{ color: pillar.mind }}>
            {t("practices_title")}
          </T>
          <PracticeRow
            titleK="practice_timer"
            subK="practice_timer_sub"
            icon={<LotusIcon size={18} color={pillar.mind} />}
            onPress={() => router.push("/meditation/start")}
          />
          {/* Breath went live with slice D; Guided is still a Chapter 3
              content type, and says so rather than routing nowhere. */}
          <PracticeRow
            titleK="practice_breath"
            subK="practice_breath_sub"
            icon={<OmGlyph size={18} color={pillar.mind} />}
            onPress={() => router.push({ pathname: "/meditation/start", params: { mode: "breath" } })}
          />
          <PracticeRow
            titleK="practice_guided"
            subK="practice_guided_sub"
            icon={<BellIcon size={18} color={pillar.mind} />}
            soon
          />
        </View>
      </Reveal>

      {week && week.totalMinutes > 0 ? (
        <Reveal lift delay={240}>
          <WeekStrip week={week} />
        </Reveal>
      ) : null}

      <Reveal lift delay={320}>
        <HowToSit open={howOpen} onToggle={() => setHowOpen((v) => !v)} />
      </Reveal>
    </Screen>
  );
}

/**
 * One tap to a sit. New users see the same card on defaults, so the card is
 * never the thing standing between someone and their first practice.
 */
function QuickStart({
  returning,
  ready,
  minutes,
  soundLabel,
  practiceK,
  onBegin,
}: {
  returning: boolean;
  ready: boolean;
  minutes: number;
  /** null = a silent sit */
  soundLabel: SoundWithMedia | null;
  /** Named only when it is not the plain timer — the card should say which
   *  practice one tap is about to resume. */
  practiceK: StringKey | null;
  onBegin: () => void;
}) {
  const { t, loc } = useI18n();
  // Until the sound list lands the card must not name a sound — claiming
  // "Silent" for the length of a query is a claim about what Begin will do,
  // and it is wrong at exactly the moment it is read.
  const facts = [
    `${minutes} ${t("minutes_short")}`,
    ready ? (soundLabel ? loc(soundLabel.name_hi, soundLabel.name_en) : t("silent_mode")) : null,
    practiceK ? t(practiceK) : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <EmberCard sheen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <IconSlot size={44} radius={14}>
          <LotusIcon size={22} color={pillar.mind} />
        </IconSlot>
        <View style={{ flex: 1 }}>
          <T variant="bodyBold">{t(returning ? "med_quick_title" : "med_quick_title_new")}</T>
        </View>
      </View>
      {/* the sit at a glance — each fact its own chip, so the line never wraps
          into a mid-word break the way the old joined string did */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md }}>
        {facts.map((f) => (
          <Chip key={f} label={f} />
        ))}
      </View>
      <View style={{ marginTop: space.lg }}>
        {/* Disabled only until the list lands — the label must never promise a
            sound the tap would not actually play. */}
        <Button k="begin" disabled={!ready} onPress={onBegin} />
      </View>
    </EmberCard>
  );
}

/** A practice as a first-class row: what it is, one line on what it does. */
function PracticeRow({
  titleK,
  subK,
  icon,
  onPress,
  soon,
}: {
  titleK: StringKey;
  subK: StringKey;
  icon: React.ReactNode;
  onPress?: () => void;
  soon?: boolean;
}) {
  const { t } = useI18n();
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, opacity: soon ? 0.55 : 1 }}>
      <IconSlot size={38} radius={12}>
        {icon}
      </IconSlot>
      <View style={{ flex: 1 }}>
        <T variant="bodyBold">{t(titleK)}</T>
        <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {t(subK)}
        </T>
      </View>
      {soon ? <Chip label={t("soon_badge")} /> : <ChevronRight size={18} color={color.muted} />}
    </View>
  );

  if (soon || !onPress) return <Card style={{ paddingVertical: space.md }}>{body}</Card>;
  return (
    <Card onPress={onPress} style={{ paddingVertical: space.md }}>
      {body}
    </Card>
  );
}

/**
 * Your week — seven days of minutes in the pillar's own indigo. Rendered only
 * when there is a week worth reflecting (the MirrorCard rule: never open on a
 * wall of zeros), so guests and brand-new users simply do not see it.
 */
function WeekStrip({ week }: { week: MeditationWeek }) {
  const { t } = useI18n();
  const peak = Math.max(...week.days.map((d) => d.minutes), 1);

  return (
    <View style={{ marginTop: space.lg }}>
      <T variant="eyebrow" style={{ color: pillar.mind, marginBottom: space.sm }}>
        {t("your_week")}
      </T>
      <Card>
        <View style={{ flexDirection: "row", gap: space.xs, alignItems: "flex-end", height: 56 }}>
          {week.days.map((d) => (
            <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: radius.chip,
                  backgroundColor: color.surface2,
                  borderWidth: 1,
                  borderColor: color.line,
                  justifyContent: "flex-end",
                  overflow: "hidden",
                }}
              >
                {d.minutes > 0 ? (
                  <View
                    style={{
                      // A day with any practice always shows something — a
                      // 4-minute sit next to a 40-minute one must not round to
                      // an empty bar.
                      height: Math.max(4, Math.round((d.minutes / peak) * 38)),
                      backgroundColor: pillar.mind,
                      opacity: 0.75,
                    }}
                  />
                ) : null}
              </View>
              <T variant="caption" tone="muted" style={{ fontSize: 10 }}>
                {new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "narrow" })}
              </T>
            </View>
          ))}
        </View>
        <T variant="caption" tone="muted" style={{ marginTop: space.sm }}>
          {week.totalMinutes} {t("minutes_short")} {t("week_this_week")} · {t("week_longest")}{" "}
          {week.longestMinutes} {t("minutes_short")}
        </T>
      </Card>
    </View>
  );
}

/**
 * "How to meditate", folded. It used to be a card every session had to scroll
 * past; here it is read when wanted. The demo-video slot keeps the
 * upload-into-placeholder pattern for when the content team publishes one.
 */
function HowToSit({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  return (
    <View style={{ marginTop: space.lg, marginBottom: space.lg }}>
      <PressableScale onPress={onToggle} haptic="select">
        <Card style={{ paddingVertical: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <T variant="bodyBold" style={{ flex: 1 }}>
              {t("how_to_meditate")}
            </T>
            <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
              <ChevronRight size={18} color={color.muted} />
            </View>
          </View>
        </Card>
      </PressableScale>

      {open ? (
        <Reveal>
          <View style={{ marginTop: space.sm, gap: space.sm }}>
            <AvatarTile height={150} playSize={44} silhouetteSize={76} />
            <Card>
              <B k="med_instructions" variant="body" />
            </Card>
          </View>
        </Reveal>
      ) : null}
    </View>
  );
}
