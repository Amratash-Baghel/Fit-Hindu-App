/**
 * My Path — the reflective progress screen (redesign, docs/specs/redesign-bms.md
 * "My Path"). The sankalp card taps through here; the destination is now the
 * story it promises: the streak and its record, a weekly Body·Mind·Soul grid
 * that shows at a glance which pillar you keep and which one slips, the Fit
 * Points milestone track, and one gentle nudge.
 *
 * Everything is server-computed and IST-anchored (migrations 0012/0013). The
 * screen only RENDERS: the streak comes from streak_state(), the points from
 * points_summary(), and the weekly grid is folded on-device from the same
 * `daily_activity` rows the progress fetch already carries — no new read.
 *
 * Framed gently by rule: a quiet day is quiet, never "missed"; a broken streak
 * reads as a fresh beginning; nudges stay effort-based, never a health claim.
 */
import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import {
  Screen,
  Card,
  Button,
  EmberCard,
  ProgressBar,
  AnimatedNumber,
  B,
  T,
  Diya,
  color,
  pillar,
  space,
  radius,
  type PillarKey,
} from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { useAuth } from "../../src/lib/auth";
import { istDayKey } from "../../src/lib/daypart";
import { useStreak } from "../../src/lib/streak";
import { usePoints } from "../../src/lib/points";
import { useProgress } from "../../src/lib/progress";
import { PILLAR_TYPES, PILLAR_ORDER } from "../../src/lib/pillars";
import type { ActivityType, DailyActivity } from "../../src/types/db";

interface WeekDay {
  date: string;
  letter: string;
  isToday: boolean;
}

const DAY_MS = 86_400_000;

/**
 * The last `n` IST days, oldest first, each with a one-letter weekday.
 * Steps are absolute 24h intervals, NOT local setDate() calendar steps — IST
 * has no DST, so 24h of real time is always exactly one IST day, whereas a
 * local-calendar step is 23/25h across a DST switch (an NRI user's week would
 * duplicate one IST date and skip another). One formatter for all the days.
 */
function lastDays(locale: string, n: number): WeekDay[] {
  const fmt = new Intl.DateTimeFormat(locale, { timeZone: "Asia/Kolkata", weekday: "narrow" });
  const now = Date.now();
  const out: WeekDay[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    out.push({ date: istDayKey(d), letter: fmt.format(d), isToday: i === 0 });
  }
  return out;
}

/** The constellation window: four clean weekday-aligned rows of seven. */
const MONTH_DAYS = 28;

export default function MyPath() {
  const router = useRouter();
  const { t, mode } = useI18n();
  const { session } = useAuth();
  const { data, loading, refresh } = useProgress();
  const { streak, refresh: refreshStreak } = useStreak();
  const { points, refresh: refreshPoints } = usePoints();

  // Coming back from a workout/meditation should show it immediately.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshStreak();
      refreshPoints();
    }, [refresh, refreshStreak, refreshPoints]),
  );

  const header = <Stack.Screen options={{ headerShown: true, title: t("mypath_title") }} />;

  // The whole week block is derived once per data change, not per render —
  // AnimatedNumber ticks and the three focus refreshes would otherwise pay 7
  // formatter constructions + a Map rebuild each. Above the early returns
  // (rules of hooks); null until the progress read lands.
  const locale = mode === "hindi" ? "hi-IN" : "en-IN";
  const weekData = useMemo(() => {
    if (!data) return null;
    const week = lastDays(locale, 7);
    const typesByDate = new Map<string, ActivityType[]>(
      (data.days as DailyActivity[]).map((d) => [d.ist_date, (d.types ?? []) as ActivityType[]]),
    );
    const activeOn = (k: PillarKey, date: string) => {
      const types = typesByDate.get(date);
      return !!types && PILLAR_TYPES[k].some((ty) => types.includes(ty));
    };
    const counts = Object.fromEntries(
      PILLAR_ORDER.map((k) => [k, week.filter((w) => activeOn(k, w.date)).length]),
    ) as Record<PillarKey, number>;
    const quietest = PILLAR_ORDER.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
    const allStrong = Math.min(...PILLAR_ORDER.map((k) => counts[k])) >= 5;

    // The month of diyas (redesign — "a constellation, not a scoreboard"):
    // each of the last 28 IST days becomes a dot — bright gold when all three
    // pillars closed, tinted by the practised pillar on a partial day, dim on
    // a quiet one. Same fetch as everything else (the 30-day window).
    const month = lastDays(locale, MONTH_DAYS).map((d) => ({
      ...d,
      pillars: PILLAR_ORDER.filter((k) => activeOn(k, d.date)),
    }));
    const monthCounts = Object.fromEntries(
      PILLAR_ORDER.map((k) => [k, month.filter((d) => d.pillars.includes(k)).length]),
    ) as Record<PillarKey, number>;
    return { week, activeOn, quietest, allStrong, month, monthCounts };
  }, [data, locale]);

  // Guests bank nothing yet — say why, and make signing in the way out.
  if (!session) {
    return (
      <Screen>
        {header}
        <Empty
          titleKey="progress_empty_title"
          bodyKey="progress_signin_body"
          ctaKey="sign_in"
          onPress={() => router.push("/auth")}
        />
      </Screen>
    );
  }

  if (loading || !data) {
    return (
      <Screen>
        {header}
        <B k="loading" variant="body" tone="muted" center />
      </Screen>
    );
  }

  // Nothing logged yet — meet a brand-new user with encouragement, not zeros.
  if (data.summary.sessions_total === 0) {
    return (
      <Screen>
        {header}
        <Empty
          titleKey="progress_empty_title"
          bodyKey="progress_empty_body"
          ctaKey="progress_empty_cta"
          onPress={() => router.push("/(tabs)/workout")}
        />
      </Screen>
    );
  }

  // weekData is non-null here: data passed the loading/empty gates above.
  const { week, activeOn, quietest, allStrong, month, monthCounts } = weekData!;
  const nudge = allStrong
    ? t("mypath_nudge_all")
    : t("mypath_nudge").replace("{p}", t(`pillar_${quietest}` as StringKey));

  const daysToNext =
    points && points.next_milestone_day != null
      ? Math.max(0, points.next_milestone_day - points.current_streak)
      : null;

  return (
    <Screen>
      {header}

      {/* the screen's promise, under the native title */}
      <B k="mypath_sub" variant="caption" tone="muted" noSub />

      {/* the sankalp — current streak given the hero treatment, its record beside */}
      <EmberCard sheen>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <Diya size={34} dim={(streak?.current_streak ?? 0) === 0} />
          <View style={{ flex: 1 }}>
            <T variant="eyebrow" tone="gold">
              {t("mypath_current")}
            </T>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.xs, marginTop: 2 }}>
              <AnimatedNumber
                value={streak?.current_streak ?? 0}
                variant="display"
                tone="gold"
                style={{ fontSize: 40, fontWeight: "800", fontVariant: ["tabular-nums"] }}
              />
              <T variant="caption" tone="muted">
                {t("mypath_days_word")}
              </T>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T variant="caption" tone="muted">
              {t("progress_longest")}
            </T>
            <AnimatedNumber value={streak?.longest_streak ?? 0} variant="h2" style={{ fontVariant: ["tabular-nums"] }} />
          </View>
        </View>
      </EmberCard>

      {/* the week, Body·Mind·Soul — which pillar you keep, which one slips */}
      <Card style={{ gap: space.sm }}>
        <T variant="eyebrow" tone="gold">
          {t("mypath_week")}
        </T>
        {/* weekday letters, aligned to the cells below */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <View style={{ width: 46 }} />
          <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
            {week.map((w) => (
              <T key={w.date} variant="caption" tone="muted" style={{ flex: 1, textAlign: "center", fontSize: 11 }}>
                {w.letter}
              </T>
            ))}
          </View>
        </View>
        {PILLAR_ORDER.map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <T style={{ width: 46, color: pillar[k], fontWeight: "800", fontSize: 15 }}>{t(`pillar_${k}` as StringKey)}</T>
            <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
              {week.map((w) => {
                const on = activeOn(k, w.date);
                return (
                  <View
                    key={w.date}
                    style={{
                      flex: 1,
                      height: 20,
                      borderRadius: 6,
                      backgroundColor: on ? pillar[k] : color.surface2,
                      opacity: on ? 1 : 0.7,
                      borderWidth: w.isToday ? 1.5 : 0,
                      borderColor: color.goldHi,
                    }}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </Card>

      {/* the month of diyas — a constellation, never a scoreboard. Bright gold
          when all three pillars closed, tinted by the practised pillar on a
          partial day, dim on a quiet one (quiet, never "missed" — no red,
          no guilt, by rule). Reads the same 30-day fetch as everything else. */}
      <Card style={{ gap: space.sm }}>
        <T variant="eyebrow" tone="gold">
          {t("mypath_month")}
        </T>
        {/* weekday letters — columns are weekday-aligned (28 = 4 clean weeks) */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {month.slice(0, 7).map((d) => (
            <T key={d.date} variant="caption" tone="muted" style={{ flex: 1, textAlign: "center", fontSize: 11 }}>
              {d.letter}
            </T>
          ))}
        </View>
        {[0, 1, 2, 3].map((row) => (
          <View key={row} style={{ flexDirection: "row", gap: 6 }}>
            {month.slice(row * 7, row * 7 + 7).map((d) => (
              <DiyaDot key={d.date} pillars={d.pillars} isToday={d.isToday} />
            ))}
          </View>
        ))}
        {/* legend — the constellation's own quiet language */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: 2 }}>
          <LegendItem tint={color.goldHi} label={t("legend_full")} />
          <LegendItem tint={pillar.body} dim label={t("legend_part")} />
          <LegendItem tint={color.surface2} outline label={t("legend_quiet")} />
        </View>
        {/* where the month actually went — three balance bars, leader full */}
        <View style={{ gap: space.sm, marginTop: space.sm, borderTopWidth: 1, borderTopColor: color.line, paddingTop: space.md }}>
          {(() => {
            const max = Math.max(1, ...PILLAR_ORDER.map((p) => monthCounts[p]));
            return PILLAR_ORDER.map((k) => (
              <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <T style={{ width: 46, color: pillar[k], fontWeight: "800", fontSize: 13 }}>
                  {t(`pillar_${k}` as StringKey)}
                </T>
                <View
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: color.surface2,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      borderRadius: 3,
                      width: `${Math.round((monthCounts[k] / max) * 100)}%`,
                      backgroundColor: pillar[k],
                    }}
                  />
                </View>
                <T variant="caption" tone="soft" style={{ width: 22, textAlign: "right", fontVariant: ["tabular-nums"] }}>
                  {monthCounts[k]}
                </T>
              </View>
            ));
          })()}
        </View>
      </Card>

      {/* Fit Points → next milestone (the sankalp's own reward track) */}
      {points ? (
        <Card style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <T variant="eyebrow" tone="gold" style={{ flex: 1 }}>
              {t("mypath_points")}
            </T>
            <AnimatedNumber value={points.total_points} variant="bodyBold" tone="gold" />
          </View>
          {points.next_milestone_day != null ? (
            <ProgressBar value={points.current_streak} max={points.next_milestone_day} tone="gold" animated />
          ) : null}
          <T variant="caption" tone="muted">
            {daysToNext != null && points.next_milestone_bonus != null
              ? t(daysToNext === 1 ? "points_next_milestone_one" : "points_next_milestone")
                  .replace("{d}", String(daysToNext))
                  .replace("{b}", String(points.next_milestone_bonus))
              : t("points_milestone_max")}
          </T>
        </Card>
      ) : null}

      {/* the gentle nudge — a quiet pillar is an invitation, never a scolding */}
      <View style={{ borderLeftWidth: 2, borderLeftColor: pillar[quietest], paddingLeft: space.md, paddingVertical: space.xs }}>
        <T variant="body" tone="soft">
          {nudge}
        </T>
      </View>

      <B k="wellness_disclaimer" variant="caption" tone="muted" />
    </Screen>
  );
}

/**
 * One day of the constellation. All three pillars → bright gold; two → a
 * quieter gold; one → that pillar's own tint; none → a dim, guilt-free dot.
 * Today wears a thin gold outline whatever its state. Opacity does the
 * dimming so every hue stays a design token.
 */
function DiyaDot({ pillars, isToday }: { pillars: PillarKey[]; isToday: boolean }) {
  const n = pillars.length;
  const bg =
    n === 3 ? color.goldHi : n === 2 ? color.gold : n === 1 ? pillar[pillars[0]] : color.surface2;
  const opacity = n === 3 ? 1 : n === 2 ? 0.6 : n === 1 ? 0.75 : 1;
  return (
    <View
      style={{
        flex: 1,
        aspectRatio: 1,
        borderRadius: 999,
        borderWidth: isToday ? 1.5 : 0,
        borderColor: color.goldHi,
        padding: isToday ? 2 : 0,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 999,
          backgroundColor: bg,
          opacity,
          borderWidth: n === 0 ? 1 : 0,
          borderColor: color.line,
        }}
      />
    </View>
  );
}

/** One legend entry — a small dot in the state it names. */
function LegendItem({
  tint,
  label,
  dim,
  outline,
}: {
  tint: string;
  label: string;
  dim?: boolean;
  outline?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: tint,
          opacity: dim ? 0.75 : 1,
          borderWidth: outline ? 1 : 0,
          borderColor: color.line,
        }}
      />
      <T variant="caption" tone="muted" style={{ fontSize: 11 }}>
        {label}
      </T>
    </View>
  );
}

function Empty({
  titleKey,
  bodyKey,
  ctaKey,
  onPress,
}: {
  titleKey: StringKey;
  bodyKey: StringKey;
  ctaKey: StringKey;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        gap: space.md,
        paddingVertical: space.xxl,
        paddingHorizontal: space.lg,
        borderRadius: radius.card,
      }}
    >
      <Diya size={56} />
      <B k={titleKey} variant="h2" center />
      <B k={bodyKey} variant="body" tone="soft" center />
      <Button k={ctaKey} onPress={onPress} style={{ marginTop: space.sm, alignSelf: "stretch" }} />
    </View>
  );
}
