/**
 * Progress — the "look how far you've come" screen.
 * Spec: docs/specs/feature-sprint.md slice 6.
 *
 * A stack route behind the Home sankalp card, not a sixth tab: there are
 * already five, and Hindi tab labels are wide at 360dp (the same reasoning that
 * put Settings on a stack route in slice 1b).
 *
 * Every number here comes from an aggregate computed in Postgres (migration
 * 0013). The screen issues one batch of reads and renders; it never counts
 * anything itself.
 *
 * Charts are hand-rolled Views. A 30-day strip is 30 rectangles — a charting
 * library would be a bundle and a frame-rate cost on the low-end Android this
 * app targets, for a bar chart.
 */
import React, { useCallback } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Screen,
  Card,
  Button,
  ProgressBar,
  AnimatedNumber,
  Shimmer,
  B,
  T,
  DiyaIcon,
  color,
  space,
  radius,
} from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { useAuth } from "../../src/lib/auth";
import { useStreak } from "../../src/lib/streak";
import { activityStrip, useProgress } from "../../src/lib/progress";
import type { BodyArea } from "../../src/types/db";
import type { StringKey } from "../../src/lib/i18n";

/** Body areas are an enum, so their labels are already in the catalog. */
const AREA_KEY: Record<BodyArea, StringKey> = {
  full_body: "area_full_body",
  chest: "area_chest",
  back: "area_back",
  shoulders: "area_shoulders",
  arms: "area_arms",
  core: "area_core",
  legs: "area_legs",
};

const STRIP_DAYS = 30;

export default function Progress() {
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useAuth();
  const { data, loading, refresh } = useProgress();
  const { streak, refresh: refreshStreak } = useStreak();

  // Coming back from a workout should show it immediately.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshStreak();
    }, [refresh, refreshStreak]),
  );

  const header = (
    <Stack.Screen options={{ headerShown: true, title: t("progress_title") }} />
  );

  // Guests bank nothing yet (activity.ts no-ops without a session), so there is
  // genuinely nothing to show them. Say why, and make signing in the way out —
  // never a screen of zeros implying they trained nothing.
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

  const { summary, areas, plan, days } = data;

  // Nothing logged yet. The encouraging state is the point (spec: "a brand-new
  // user must see something encouraging, not zeros on a blank screen").
  if (summary.sessions_total === 0) {
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

  const strip = activityStrip(days, STRIP_DAYS);
  const maxArea = areas.length ? areas[0].sets_done : 0; // RPC orders desc

  return (
    <Screen>
      {header}

      {/* sankalp — the server-computed streak, given the hero treatment (owner:
          the tracker felt sloppy). Ember gradient + a faint gold sheen, like
          Home's day card, so the streak reads as the screen's centrepiece. */}
      <View style={{ borderRadius: radius.card, overflow: "hidden", borderWidth: 1, borderColor: "#4a3416" }}>
        <LinearGradient colors={["#241407", "#1C1510"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg }}>
            <DiyaIcon size={34} dim={(streak?.current_streak ?? 0) === 0} />
            <View style={{ flex: 1 }}>
              <T variant="eyebrow" tone="gold">
                {t("progress_streak")}
              </T>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.xs, marginTop: 2 }}>
                <AnimatedNumber
                  value={streak?.current_streak ?? 0}
                  variant="display"
                  tone="gold"
                  style={{ fontSize: 40, fontWeight: "800", fontVariant: ["tabular-nums"] }}
                />
                <T variant="caption" tone="muted">
                  {t("progress_plan_days")}
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
        </LinearGradient>
        <Shimmer mode="sheen" tint={color.goldHi} peak={0.08} />
      </View>

      {/* this week vs all time */}
      <Card style={{ gap: space.md }}>
        <T variant="eyebrow" tone="gold">
          {t("progress_this_week")}
        </T>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Stat v={summary.sessions_week} label={t("progress_sessions")} />
          <StatDivider />
          <Stat v={summary.minutes_week} label={t("progress_minutes")} />
        </View>
        <View style={{ height: 1, backgroundColor: color.line }} />
        <T variant="eyebrow" tone="gold">
          {t("progress_all_time")}
        </T>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Stat v={summary.sessions_total} label={t("progress_sessions")} />
          <StatDivider />
          <Stat v={summary.minutes_total} label={t("progress_minutes")} />
          <StatDivider />
          <Stat v={summary.active_days} label={t("progress_days_trained")} />
        </View>
      </Card>

      {/* plan progress — absent entirely when no plan is assigned, which is a
          real state the rules engine produces by design */}
      {plan ? (
        <Card style={{ gap: space.sm }}>
          <ProgressBar
            value={plan.days_done}
            max={plan.duration_days}
            tone="gold"
            animated
            label={t("progress_plan")}
            trailing={`${plan.days_done}/${plan.duration_days} ${t("progress_plan_days")}`}
          />
        </Card>
      ) : null}

      {/* per-body-area. Bars are scaled against the user's own best area, not
          against a target: there is no "correct" number of sets for a body
          part, and inventing one would be a health claim. */}
      {areas.length ? (
        <Card style={{ gap: space.md }}>
          <T variant="eyebrow" tone="gold">
            {t("progress_areas")}
          </T>
          {areas.map((a) => (
            <ProgressBar
              key={a.area}
              value={a.sets_done}
              max={maxArea}
              label={t(AREA_KEY[a.area])}
              trailing={String(a.sets_done)}
            />
          ))}
        </Card>
      ) : null}

      {/* 30-day activity strip — 30 Views, no charting library */}
      <Card style={{ gap: space.md }}>
        <T variant="eyebrow" tone="gold">
          {t("progress_activity")}
        </T>
        <View style={{ flexDirection: "row", gap: 3, alignItems: "flex-end", height: 38 }}>
          {strip.map((d, i) => {
            const today = i === strip.length - 1;
            return (
              <View
                key={d.date}
                style={{
                  flex: 1,
                  height: d.active ? (today ? 38 : 32) : 6,
                  borderRadius: 3,
                  backgroundColor: d.active ? (today ? color.goldHi : color.saffron) : color.surface2,
                }}
              />
            );
          })}
        </View>
      </Card>

      <B k="wellness_disclaimer" variant="caption" tone="muted" />
    </Screen>
  );
}

function Stat({ v, label }: { v: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <AnimatedNumber value={v} variant="h1" style={{ fontVariant: ["tabular-nums"] }} />
      <T variant="caption" tone="muted">
        {label}
      </T>
    </View>
  );
}

/** Hairline between stats — structure without a heavy box. */
function StatDivider() {
  return <View style={{ width: 1, height: 30, backgroundColor: color.line }} />;
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
      <DiyaIcon size={56} />
      <B k={titleKey} variant="h2" center />
      <B k={bodyKey} variant="body" tone="soft" center />
      <Button k={ctaKey} onPress={onPress} style={{ marginTop: space.sm, alignSelf: "stretch" }} />
    </View>
  );
}
