import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Card, Chip, B, T, color, space } from "../../src/ui";
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
      </View>

      {/* sankalp / streak */}
      <StreakCard />

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
          <T variant="display" tone="gold" style={{ fontWeight: "800" }}>
            {count}
          </T>
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
          <DiyaIcon key={i} size={24} dim={i >= lit} />
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
          <T variant="bodyBold" tone="gold">
            {points.total_points}
          </T>
        </View>
        {points.today_points > 0 ? (
          <T variant="caption" tone="saffron">
            {t("points_today").replace("{n}", String(points.today_points))}
          </T>
        ) : null}
      </View>
      <T variant="caption" tone="muted" style={{ marginTop: 4 }}>
        {nextLine}
      </T>
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
