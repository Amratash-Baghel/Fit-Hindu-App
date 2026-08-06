import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen, Card, Chip, B, T, AnimatedNumber, Reveal, ProgressBar, Shimmer, PressableScale, color, radius, space } from "../../src/ui";
import { feedback } from "../../src/lib/feedback";
import {
  DumbbellIcon,
  BowlIcon,
  LotusIcon,
  OmGlyph,
  MoonIcon,
  ChevronRight,
  DiyaIcon,
  SettingsIcon,
} from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { getTodayDevotional, type DevotionalToday } from "../../src/lib/content";
import { useStreak } from "../../src/lib/streak";
import { usePoints } from "../../src/lib/points";
import type { PointsSummary } from "../../src/types/db";

/**
 * Daily Home — the habit surface (most polished screen in the app).
 * Greeting + deity-of-the-day + today's shloka + sankalp/streak + the day's
 * cards. Devotional content is live from the DB (scheduled row → weekday
 * fallback). Ticks/streak numbers light up once app auth ships.
 */
export default function Home() {
  const router = useRouter();
  const { t, loc, mode } = useI18n();
  const [dev, setDev] = useState<DevotionalToday | null>(null);

  useEffect(() => {
    let alive = true;
    getTodayDevotional()
      .then((d) => alive && setDev(d))
      .catch(() => alive && setDev({ deity: null, shloka: null }));
    return () => {
      alive = false;
    };
  }, []);

  const dateLine = new Intl.DateTimeFormat(mode === "english" ? "en-IN" : "hi-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <Screen>
      {/* greeting + deity of the day */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <B k="greeting" variant="h1" noSub />
          <T variant="caption" tone="muted">
            {dateLine}
          </T>
        </View>
        {dev?.deity ? <Chip label={loc(dev.deity.name_hi, dev.deity.name_en)} active /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings_title")}
          onPress={() => router.push("/settings")}
          hitSlop={10}
          style={{ padding: space.xs, marginLeft: space.sm }}
        >
          <SettingsIcon color={color.muted} />
        </Pressable>
      </View>

      {/* today's shloka — ember card with ॐ watermark (mockup) */}
      <View style={{ borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#4a3416" }}>
        <LinearGradient colors={["#241407", "#1C1510"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}>
          <View style={{ padding: space.lg }}>
            <View style={{ position: "absolute", right: -6, top: -26, opacity: 0.08 }}>
              <OmGlyph size={86} color={color.gold} />
            </View>
            <T variant="eyebrow" tone="gold">
              {t("todays_shloka")}
            </T>
            {dev === null ? (
              <T variant="body" tone="muted" style={{ marginTop: space.sm }}>
                {t("loading")}
              </T>
            ) : dev.shloka ? (
              <>
                <T variant="body" style={{ color: color.goldHi, marginTop: space.sm, fontWeight: "600", lineHeight: 26 }}>
                  {dev.shloka.text_hi}
                </T>
                {mode !== "hindi" && dev.shloka.text_en ? (
                  <T variant="caption" tone="muted" style={{ marginTop: space.sm }}>
                    {dev.shloka.text_en}
                  </T>
                ) : null}
                {dev.shloka.source ? (
                  <T variant="caption" tone="muted" style={{ marginTop: 4, fontStyle: "italic" }}>
                    — {dev.shloka.source}
                  </T>
                ) : null}
              </>
            ) : (
              <T variant="body" tone="muted" style={{ marginTop: space.sm }}>
                ॐ
              </T>
            )}
          </View>
        </LinearGradient>
        {/* a slow, faint gold sheen so the day's hero card feels alive */}
        <Shimmer mode="sheen" tint={color.goldHi} peak={0.09} />
      </View>

      {/* sankalp / streak */}
      <StreakCard />

      {/* today's blessing — the gentle come-back-tomorrow reveal */}
      <DailyBlessing />

      {/* today's cards */}
      <TodayCard
        icon={<DumbbellIcon color={color.saffron} />}
        titleHi="आज का व्यायाम"
        titleEn="Today's workout"
        onPress={() => router.push("/(tabs)/workout")}
      />
      <TodayCard
        icon={<BowlIcon color={color.gold} />}
        gold
        titleHi="आज का आहार"
        titleEn="Today's diet"
        onPress={() => router.push("/(tabs)/diet")}
      />
      <TodayCard
        icon={<LotusIcon color={color.saffron} />}
        titleHi="ध्यान"
        titleEn="Meditation"
        onPress={() => router.push("/(tabs)/meditation")}
      />
      <TodayCard
        icon={<OmGlyph size={20} color={color.gold} />}
        gold
        titleHi="मंत्र जप"
        titleEn="Mantra jap"
        onPress={() => router.push("/(tabs)/jap")}
      />
      <TodayCard
        icon={<MoonIcon color={color.saffron} />}
        titleHi="नींद की ध्वनियाँ"
        titleEn="Sleep sounds"
        onPress={() => router.push("/(tabs)/sleep")}
      />
    </Screen>
  );
}

/**
 * Sankalp / streak card — live from streak_state() (migration 0012), which
 * computes the streak server-side in IST with the one-freeze-per-week rule.
 * Framing stays gentle: a broken streak reads as an invitation to begin again,
 * never as loss (docs/specs/tracking-streaks.md — "no streak-loss guilt").
 *
 * Guests (streak === null) see the invitation, which is also the pitch to sign
 * in. Diyas count the sankalp in the design's own metaphor; the row shows a
 * week of seven, and the headline number carries the true count past seven.
 */
const WEEK_DIYAS = 7;

function StreakCard() {
  const router = useRouter();
  const { t } = useI18n();
  const { streak, loading, refresh } = useStreak();
  const { points, refresh: refreshPoints } = usePoints();

  // An activity logged elsewhere (workout, meditation) should be reflected the
  // moment the user lands back on Home — re-read on focus, not just on mount.
  // A refresh keeps the previous streak visible (loading stays false), so only
  // the very first signed-in read shows the resting state below. Points read
  // from the same activity_log, so they refresh on the same focus.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshPoints();
    }, [refresh, refreshPoints]),
  );

  const count = streak?.current_streak ?? 0;
  const active = count > 0;
  const lit = Math.min(count, WEEK_DIYAS);

  // While a signed-in user's first read is in flight, streak is still null —
  // show a neutral resting line, never the "start your sankalp" invitation, so
  // an established streak-holder is not briefly told to begin again on a slow
  // network (matches the no-streak-loss-guilt framing).
  let title: string;
  let sub: string | null;
  if (loading) {
    title = t("loading");
    sub = null;
  } else if (!active) {
    title = t("sankalp_start");
    sub = t("sankalp_hint");
  } else {
    title = t("sankalp_days").replace("{n}", String(count));
    if (streak?.at_risk) sub = t("sankalp_at_risk");
    else if ((streak?.freezes_used ?? 0) > 0) sub = t("sankalp_freeze_saved");
    else sub = t("sankalp_longest").replace("{n}", String(streak?.longest_streak ?? count));
  }

  return (
    // The sankalp card is the way into the full progress screen (slice 6) —
    // "my streak" and "how far I've come" are the same question, and it keeps
    // Progress off the tab bar, which is already full at five.
    <Card onPress={() => router.push("/progress")}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <DiyaIcon size={30} dim={!active} />
        <View style={{ flex: 1 }}>
          <T variant="bodyBold">{title}</T>
          {sub ? (
            <T variant="caption" tone="muted">
              {sub}
            </T>
          ) : null}
        </View>
        {active ? (
          <AnimatedNumber value={count} variant="display" tone="gold" style={{ fontWeight: "800" }} />
        ) : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: space.md,
        }}
      >
        {Array.from({ length: WEEK_DIYAS }).map((_, i) => (
          // a lit-up-in-sequence stagger when Home first appears; a fade-pop
          // (distance 0), never a rise, so the diya row reads as igniting.
          <Reveal key={i} delay={i * 70} distance={0}>
            <DiyaIcon size={24} dim={i >= lit} />
          </Reveal>
        ))}
      </View>
      <PointsRow points={points} />
    </Card>
  );
}

/**
 * Fit Points line inside the sankalp card (slice 5). Shown only to a signed-in
 * user whose read has landed (points != null) — a guest already sees the
 * sign-in invitation above, so a zero here would be noise. Points come from the
 * same activity_log as the streak, so the two never disagree about who is in.
 */
function PointsRow({ points }: { points: PointsSummary | null }) {
  const { t } = useI18n();
  if (!points) return null;

  const daysToNext =
    points.next_milestone_day != null
      ? Math.max(0, points.next_milestone_day - points.current_streak)
      : null;
  const nextLine =
    daysToNext != null && points.next_milestone_bonus != null
      ? t("points_next_milestone")
          .replace("{d}", String(daysToNext))
          .replace("{b}", String(points.next_milestone_bonus))
      : t("points_milestone_max");

  return (
    <View style={{ marginTop: space.md, borderTopWidth: 1, borderTopColor: color.line, paddingTop: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <T variant="caption" tone="muted">
            {t("points_label")}
          </T>
          <AnimatedNumber value={points.total_points} variant="bodyBold" tone="gold" />
        </View>
        {points.today_points > 0 ? (
          <T variant="caption" tone="saffron">
            {t("points_today").replace("{n}", String(points.today_points))}
          </T>
        ) : null}
      </View>
      {/* momentum toward the next milestone — the bar the "{d} more days" line
          describes, made visible (gold: this is the sankalp's own reward track). */}
      {points.next_milestone_day != null ? (
        <ProgressBar
          value={points.current_streak}
          max={points.next_milestone_day}
          tone="gold"
          animated
          style={{ marginTop: space.sm }}
        />
      ) : null}
      <T variant="caption" tone="muted" style={{ marginTop: 4 }}>
        {nextLine}
      </T>
    </View>
  );
}

const BLESSING_KEYS = [
  "blessing_1",
  "blessing_2",
  "blessing_3",
  "blessing_4",
  "blessing_5",
  "blessing_6",
  "blessing_7",
] as const;
const BLESSING_STORAGE = "fithindu.blessing.revealed";

/** IST calendar day (YYYY-MM-DD) — the blessing's once-per-day key. */
function istDayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Daily blessing (docs/specs/ui-polish.md slice E) — a once-per-IST-day
 * tap-to-reveal well-wish; the gentle come-back-tomorrow loop. The blessing
 * itself is the reward (no fabricated points the client can't honestly source),
 * it is never gated (a blessing is worship-adjacent), and the day's line is
 * picked deterministically from the IST date so it's stable all day. The
 * revealed state is persisted per IST day, so returning to Home shows it opened.
 */
function DailyBlessing() {
  const { t } = useI18n();
  const [todayKey, setTodayKey] = useState(istDayKey);
  // null = still reading the persisted state; don't flash the closed face first.
  const [revealed, setRevealed] = useState<boolean | null>(null);

  // Re-evaluate the IST day + persisted state on every focus, so returning to
  // Home after the midnight boundary shows the new day's blessing (Home stays
  // mounted as a tab, so a one-time mount read would go stale — review finding).
  useFocusEffect(
    useCallback(() => {
      const key = istDayKey();
      setTodayKey(key);
      let alive = true;
      AsyncStorage.getItem(BLESSING_STORAGE)
        .then((v) => alive && setRevealed(v === key))
        .catch(() => alive && setRevealed(false));
      return () => {
        alive = false;
      };
    }, []),
  );

  const blessingKey = useMemo(() => {
    let h = 0;
    for (let i = 0; i < todayKey.length; i++) h = (h + todayKey.charCodeAt(i)) % 100000;
    return BLESSING_KEYS[h % BLESSING_KEYS.length];
  }, [todayKey]);

  const reveal = () => {
    setRevealed(true);
    void AsyncStorage.setItem(BLESSING_STORAGE, todayKey).catch(() => {});
    feedback.success(); // a once-a-day earned moment — a small warm chime
  };

  if (revealed === null) return null;

  return (
    <View style={{ borderRadius: radius.card, overflow: "hidden", borderWidth: 1, borderColor: "#4a3416" }}>
      <LinearGradient colors={["#241407", "#1C1510"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}>
        {revealed ? (
          <Reveal distance={6} style={{ padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md }}>
            <DiyaIcon size={30} />
            <View style={{ flex: 1 }}>
              <T variant="bodyBold" style={{ color: color.goldHi }}>
                {t(blessingKey)}
              </T>
              <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {t("daily_blessing_footer")}
              </T>
            </View>
          </Reveal>
        ) : (
          <PressableScale
            onPress={reveal}
            haptic={false}
            scaleTo={0.98}
            accessibilityLabel={t("daily_blessing_title")}
            style={{ padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md }}
          >
            <DiyaIcon size={30} dim />
            <View style={{ flex: 1 }}>
              <T variant="eyebrow" tone="gold">
                {t("daily_blessing_title")}
              </T>
              <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {t("daily_blessing_tap")}
              </T>
            </View>
            <ChevronRight />
          </PressableScale>
        )}
      </LinearGradient>
      {/* faint sheen so the blessing card reads as something special */}
      <Shimmer mode="sheen" tint={color.goldHi} peak={0.1} />
    </View>
  );
}

function TodayCard({
  icon,
  titleHi,
  titleEn,
  onPress,
  gold,
  soon,
}: {
  icon: React.ReactNode;
  titleHi: string;
  titleEn: string;
  onPress?: () => void;
  gold?: boolean;
  soon?: string;
}) {
  const { loc, locSub } = useI18n();
  const sub = locSub(titleHi, titleEn);
  return (
    <Card onPress={onPress} style={{ paddingVertical: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: gold ? "rgba(217,164,65,0.13)" : "rgba(240,118,30,0.13)",
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <T variant="bodyBold">{loc(titleHi, titleEn)}</T>
          {sub ? (
            <T variant="caption" tone="muted">
              {sub}
            </T>
          ) : null}
        </View>
        {soon ? <Chip label={soon} /> : onPress ? <ChevronRight /> : null}
      </View>
    </Card>
  );
}
