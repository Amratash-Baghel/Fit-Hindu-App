import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Button, FooterAction, T, AvatarTile, ChevronRight, color, space } from "../../../src/ui";
import { useI18n, type StringKey } from "../../../src/lib/i18n";
import { getWorkoutTemplate, type WorkoutTemplateFull } from "../../../src/lib/content";

const LEVEL_KEY: Record<string, StringKey> = {
  beginner: "level_beginner",
  intermediate: "level_intermediate",
  advanced: "level_advanced",
};

/**
 * Composed workout detail — the admin Compose area's output, rendered for
 * the user: ordered exercises with effective sets/reps (per-slot override ??
 * the exercise object's default). Start opens the first exercise; the
 * auto-advancing session player is the next workout cycle.
 */
export default function WorkoutTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, loc, locSub } = useI18n();
  const [tpl, setTpl] = useState<WorkoutTemplateFull | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await getWorkoutTemplate(String(id));
      setTpl(data);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.saffron} />
        </View>
      </Screen>
    );
  }

  if (status === "error" || !tpl) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl }}>
          <T variant="body" tone="muted" style={{ textAlign: "center" }}>
            {t("workout_error")}
          </T>
          <Button k="retry" kind="ghost" onPress={load} />
        </View>
      </Screen>
    );
  }

  const sub = locSub(tpl.name_hi, tpl.name_en);
  const meta = [
    tpl.est_minutes ? `${tpl.est_minutes} ${t("minutes_short")}` : null,
    `${tpl.exercise_count} ${t("exercises_word")}`,
    t(LEVEL_KEY[tpl.level]),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Screen scroll={false}>
      <FlatList
        data={tpl.items}
        keyExtractor={(it) => String(it.position)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.sm, marginBottom: space.sm }}>
            <AvatarTile height={170} playSize={54} silhouetteSize={92} />
            <View>
              <T variant="h1">{loc(tpl.name_hi, tpl.name_en)}</T>
              {sub ? (
                <T variant="caption" tone="muted">
                  {sub}
                </T>
              ) : null}
              <T variant="caption" tone="muted" style={{ marginTop: 4 }}>
                {meta}
              </T>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const ex = item.exercise;
          const exSub = locSub(ex.name_hi, ex.name_en);
          const sets = item.sets ?? ex.default_sets;
          const reps = item.reps ?? ex.default_reps;
          const dur = item.duration_seconds ?? ex.default_duration_seconds;
          const detail = [
            sets ? `${sets} × ${reps ?? "—"}` : null,
            !sets && dur ? `${dur}s` : null,
            sets && dur ? `${dur}s` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <Card onPress={() => router.push(`/workout/${ex.id}`)} style={{ paddingVertical: space.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    backgroundColor: color.surface2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <T variant="caption" tone="muted" style={{ fontVariant: ["tabular-nums"] }}>
                    {item.position}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="bodyBold">{loc(ex.name_hi, ex.name_en)}</T>
                  {exSub ? (
                    <T variant="caption" tone="muted">
                      {exSub}
                    </T>
                  ) : null}
                </View>
                {detail ? (
                  <T variant="caption" tone="saffron" style={{ fontVariant: ["tabular-nums"] }}>
                    {detail}
                  </T>
                ) : null}
                <ChevronRight size={16} />
              </View>
            </Card>
          );
        }}
      />
      {tpl.items.length > 0 ? (
        <FooterAction>
          <Button k="start_workout" onPress={() => router.push(`/workout/${tpl.items[0].exercise.id}`)} />
        </FooterAction>
      ) : null}
    </Screen>
  );
}
