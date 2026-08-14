import React, { useCallback, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Card, T, B, Button, Diya, IconSlot, RewardOverlay, BowlIcon, ChevronRight, color, space, radius } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listDietTemplates, getLatestDietRequest } from "../../src/lib/diet";
import { usePillars } from "../../src/lib/pillars";
import { logActivity } from "../../src/lib/activity";
import { earnSince, pointsTodayNow } from "../../src/lib/points";
import { feedback } from "../../src/lib/feedback";
import { istDayKey } from "../../src/lib/daypart";
import type { DietTemplate, DietPlanRequest } from "../../src/types/db";

export default function DietTab() {
  const { t, loc, locSub } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [latest, setLatest] = useState<DietPlanRequest | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setStatus("loading");
    Promise.all([listDietTemplates(), getLatestDietRequest().catch(() => null)])
      .then(([tpls, req]) => {
        if (!alive) return;
        setTemplates(tpls);
        setLatest(req);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(load);

  return (
    <Screen>
      <B k="tab_diet" variant="h1" />

      {/* Today's meal — the diet pillar's daily completion (logs the "meal"
          activity that closes the Body ring's diet half + fires the reward) */}
      <TodayMealCard />

      {/* Generate-your-custom-plan hero */}
      <View style={{ borderRadius: radius.card, overflow: "hidden", borderWidth: 1, borderColor: "#4a3416" }}>
        <LinearGradient colors={["#241407", "#1C1510"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <View style={{ position: "absolute", right: -6, top: -18, opacity: 0.09 }}>
              <BowlIcon size={86} color={color.gold} />
            </View>
            <T variant="eyebrow" tone="gold">
              {t("your_custom_plan")}
            </T>
            <B k="diet_generate_title" variant="h2" />
            <B k="diet_generate_sub" variant="body" tone="soft" />
            <View style={{ marginTop: space.sm }}>
              <Button k="diet_generate_cta" onPress={() => router.push("/diet/questionnaire")} />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Existing custom plan, if any */}
      {latest && latest.status === "ready" ? (
        <Card onPress={() => router.push({ pathname: "/diet/plan", params: { request: latest.id } })}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T variant="bodyBold" tone="saffron">
                {t("your_custom_plan")}
              </T>
              <B k="view_plan" variant="caption" tone="muted" />
            </View>
            <ChevronRight color={color.muted} />
          </View>
        </Card>
      ) : null}

      {/* Admin-authored diet templates (rule-based) */}
      <B k="diet_templates_title" variant="h2" style={{ marginTop: space.sm }} />
      {status === "loading" ? (
        <ActivityIndicator color={color.saffron} style={{ marginTop: space.lg }} />
      ) : status === "error" ? (
        <View style={{ gap: space.md, marginTop: space.sm }}>
          <B k="diet_error" variant="body" tone="muted" />
          <Button k="retry" kind="ghost" onPress={load} />
        </View>
      ) : templates.length === 0 ? (
        <B k="diet_empty" variant="body" tone="muted" />
      ) : (
        templates.map((tpl) => (
          <Card key={tpl.id}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <T variant="bodyBold">{loc(tpl.name_hi, tpl.name_en)}</T>
                {locSub(tpl.name_hi, tpl.name_en) ? (
                  <T variant="caption" tone="muted">
                    {locSub(tpl.name_hi, tpl.name_en)}
                  </T>
                ) : null}
                {tpl.total_kcal ? (
                  <T variant="caption" tone="muted">
                    {tpl.total_kcal} kcal
                  </T>
                ) : null}
              </View>
            </View>
          </Card>
        ))
      )}

      <B k="wellness_disclaimer" variant="caption" tone="muted" style={{ marginTop: space.md }} />
    </Screen>
  );
}

/**
 * Today's meal — the diet pillar's once-a-day completion. Logging one "meal"
 * activity is what closes the Body ring's diet half (without it, Body could
 * never fully complete and Purna could never fire). Tracking adherence, never
 * medical advice (the disclaimer stays below). Once kept today, it shows a lit
 * diya + "Kept today" instead of the button — the same done-grammar as the
 * pillar tiles.
 */
function TodayMealCard() {
  const { t } = useI18n();
  const { todayTypes, refresh } = usePillars();
  // `loggedLocal` is the optimistic twin of the server `done`: pillars.refresh()
  // is an async network read, so without it there is a window after the tap
  // where done is still false and the button re-enables — a fast second tap.
  const [loggedLocal, setLoggedLocal] = useState(false);
  const done = todayTypes.includes("meal") || loggedLocal;
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState<{ earned: number | null; total: number | null } | null>(null);

  const keepPlan = useCallback(async () => {
    if (busy || done) return;
    setBusy(true);
    setLoggedLocal(true); // close the double-tap window immediately (before the refetch lands)
    // Snapshot points before, log the meal, then diff — same honest earn grammar
    // as the other completions (a failed/guest write shows the reward with no
    // number, never a false "already claimed"). The stable per-IST-day
    // client_event_id makes the write idempotent (upsert on user_id+event id),
    // so even a replay/retry collapses to ONE meal row for the day.
    const before = await pointsTodayNow();
    const ok = await logActivity("meal", { source: "plan_kept" }, undefined, `meal-${istDayKey()}`);
    feedback.completeChime(); // the completion sound; the overlay's diya supplies the haptic
    const e = await earnSince(ok ? before : null);
    setReward({ earned: e.earned, total: e.total });
    refresh(); // light the Body ring the moment they return Home
    setBusy(false);
  }, [busy, done, refresh]);

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <IconSlot>
          <BowlIcon size={24} color={color.gold} />
        </IconSlot>
        <View style={{ flex: 1 }}>
          <T variant="bodyBold">{t("diet_today_title")}</T>
          <T variant="caption" tone={done ? "gold" : "muted"}>
            {done ? t("diet_meal_done") : t("diet_today_sub")}
          </T>
        </View>
        {done ? <Diya size={26} /> : null}
      </View>
      {!done ? (
        <Button k="diet_mark_meal" onPress={keepPlan} disabled={busy} style={{ marginTop: space.md }} />
      ) : null}

      <RewardOverlay
        visible={reward != null}
        titleKey="meal_reward_title"
        bodyKey="meal_reward_body"
        earned={reward?.earned ?? null}
        total={reward?.total ?? null}
        onDone={() => setReward(null)}
      />
    </Card>
  );
}
