import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Button, FooterAction, B, T, color, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { getDietRequest } from "../../src/lib/diet";
import type { DietPlanRequest, DietPlan } from "../../src/types/db";

export default function DietPlanScreen() {
  const { request } = useLocalSearchParams<{ request: string }>();
  const { mode } = useI18n();
  const router = useRouter();
  const [req, setReq] = useState<DietPlanRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!request) return;
    let alive = true;

    async function poll() {
      try {
        const r = await getDietRequest(request);
        if (!alive) return;
        setReq(r);
        setLoading(false);
        // stop polling once terminal
        if (r && (r.status === "ready" || r.status === "failed") && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
      } catch {
        if (alive) setLoading(false);
      }
    }

    poll();
    timer.current = setInterval(poll, 4000);
    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [request]);

  const pick = (hi?: string, en?: string) => (mode === "english" ? en : hi) ?? en ?? hi ?? "";

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.saffron} />
        </View>
      </Screen>
    );
  }

  // preparing (pending / generating) or no row yet
  if (!req || req.status === "pending" || req.status === "generating") {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg }}>
          <ActivityIndicator color={color.saffron} size="large" />
          <B k="plan_preparing_title" variant="h1" center />
          <B k="plan_preparing_sub" variant="body" tone="muted" center />
        </View>
        <FooterAction>
          <Button k="done" kind="ghost" onPress={() => router.replace("/(tabs)/diet")} />
        </FooterAction>
      </Screen>
    );
  }

  if (req.status === "failed") {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg }}>
          <B k="plan_failed" variant="h1" center />
          {req.error ? (
            <T variant="caption" tone="muted">
              {req.error}
            </T>
          ) : null}
        </View>
        <FooterAction>
          <Button k="plan_failed_retry" onPress={() => router.replace("/diet/questionnaire")} />
        </FooterAction>
      </Screen>
    );
  }

  // ready
  const plan: DietPlan = req.plan ?? {};
  return (
    <Screen>
      <B k="your_custom_plan" variant="h1" />
      {pick(plan.summary_hi, plan.summary_en) ? (
        <T variant="body" tone="soft">
          {pick(plan.summary_hi, plan.summary_en)}
        </T>
      ) : null}
      {plan.daily_kcal ? (
        <T variant="caption" tone="muted">
          {plan.daily_kcal} kcal / day
        </T>
      ) : null}

      {(plan.days ?? []).map((day, di) => (
        <View key={di} style={{ gap: space.sm, marginTop: space.md }}>
          <T variant="h2" tone="saffron">
            {pick(day.label_hi, day.label_en) || `Day ${di + 1}`}
          </T>
          {(day.meals ?? []).map((meal, mi) => (
            <Card key={mi}>
              <T variant="bodyBold">{pick(meal.title_hi, meal.title_en) || String(meal.meal_time ?? "")}</T>
              {(mode === "english" ? meal.items_en : meal.items_hi)?.map((it, ii) => (
                <T key={ii} variant="body" tone="soft">
                  • {it}
                </T>
              ))}
              {meal.kcal ? (
                <T variant="caption" tone="muted">
                  {meal.kcal} kcal
                </T>
              ) : null}
            </Card>
          ))}
        </View>
      ))}

      <B k="diet_ai_disclaimer" variant="caption" tone="muted" style={{ marginTop: space.md }} />
    </Screen>
  );
}
