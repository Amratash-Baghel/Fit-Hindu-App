import React, { useCallback, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Card, T, B, Button, BowlIcon, ChevronRight, color, space, radius } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listDietTemplates, getLatestDietRequest } from "../../src/lib/diet";
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
