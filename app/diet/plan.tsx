import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Button, FooterAction, GoldWash, B, T, color, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { getDietRequest } from "../../src/lib/diet";
import { feedback } from "../../src/lib/feedback";
import type { DietPlanRequest, DietPlan } from "../../src/types/db";

const POLL_MS = 4000;
/** The n8n workflow (docs/specs/diet-custom-plan.md) has no SLA, but a screen
 *  left open on a stuck run must not poll forever — 5 minutes of silence reads
 *  as "generation failed", not "keep waiting", so it stops here and hands the
 *  user a manual re-check instead of burning battery/data unattended. */
const MAX_POLL_MS = 5 * 60 * 1000;

export default function DietPlanScreen() {
  const { request } = useLocalSearchParams<{ request: string }>();
  const { mode } = useI18n();
  const router = useRouter();
  const [req, setReq] = useState<DietPlanRequest | null>(null);
  const [loading, setLoading] = useState(true);
  // True once polling has given up without a terminal status — the preparing
  // screen swaps its silent spinner for a "check again" the user controls.
  const [stalled, setStalled] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedMs = useRef(0);
  // Celebrate the plan landing (gold wash + completion haptic/sound) ONLY on a
  // real pending/generating -> ready TRANSITION — never when the screen opens on
  // a plan that was already generated earlier, which would replay the whole
  // "your plan just generated" moment on every View-plan tap (review finding).
  // prevStatus tracks the last-seen status; `celebrate` drives the one-shot wash.
  const prevStatus = useRef<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const startPolling = useCallback((id: string) => {
    // Guard against a second interval stacking on the first: the mount effect
    // below is the only caller React guarantees a cleanup between (it reruns
    // only when `request` changes, and React runs the previous cleanup
    // first). `checkAgain` calls this directly from a button tap, where no
    // such guarantee exists — a fast double-tap before the button disappears
    // on re-render would otherwise leave two intervals racing on the same
    // `timer` ref, each polling and able to fire the completion celebration.
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    let alive = true;

    async function poll() {
      try {
        const r = await getDietRequest(id);
        if (!alive) return;
        setReq(r);
        setLoading(false);
        if (r && r.status === "ready" && prevStatus.current != null && prevStatus.current !== "ready") {
          setCelebrate(true);
          feedback.complete();
        }
        if (r) prevStatus.current = r.status;
        // stop polling once terminal
        if (r && (r.status === "ready" || r.status === "failed") && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
      } catch {
        if (alive) setLoading(false);
      }
    }

    void poll();
    elapsedMs.current = 0;
    timer.current = setInterval(() => {
      elapsedMs.current += POLL_MS;
      if (elapsedMs.current >= MAX_POLL_MS && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
        setStalled(true);
        return;
      }
      void poll();
    }, POLL_MS);

    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    return startPolling(request);
  }, [request, startPolling]);

  const checkAgain = useCallback(() => {
    if (!request) return;
    setStalled(false); // a plain event handler, not an effect body — fine to set directly
    startPolling(request);
  }, [request, startPolling]);

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
          <B k={stalled ? "plan_taking_longer" : "plan_preparing_sub"} variant="body" tone="muted" center />
        </View>
        <FooterAction>
          {stalled ? (
            <Button k="plan_check_again" onPress={checkAgain} />
          ) : (
            <Button k="done" kind="ghost" onPress={() => router.replace("/(tabs)/diet")} />
          )}
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
    <Screen overlay={celebrate ? <GoldWash /> : null}>
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
