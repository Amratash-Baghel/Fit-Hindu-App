import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Chip, T, Button, AvatarTile, ChevronRight, DumbbellIcon, color, space } from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import {
  listExercisesByMode,
  listExercisesByArea,
  listWorkoutTemplates,
  type ExerciseWithMedia,
  type WorkoutTemplateSummary,
} from "../../src/lib/content";
import type { BodyArea, WorkoutMode } from "../../src/types/db";

type Tab = WorkoutMode | "custom";
const MODES: { tab: Tab; k: StringKey }[] = [
  { tab: "home", k: "mode_home" },
  { tab: "gym", k: "mode_gym" },
  { tab: "custom", k: "mode_custom" },
];
const AREAS: { area: BodyArea; k: StringKey }[] = [
  { area: "full_body", k: "area_full_body" },
  { area: "chest", k: "area_chest" },
  { area: "back", k: "area_back" },
  { area: "shoulders", k: "area_shoulders" },
  { area: "arms", k: "area_arms" },
  { area: "core", k: "area_core" },
  { area: "legs", k: "area_legs" },
];
const LEVEL_KEY: Record<string, StringKey> = {
  beginner: "level_beginner",
  intermediate: "level_intermediate",
  advanced: "level_advanced",
};

/**
 * Workout tab. Structure (2026-07-14 owner feedback):
 *  - Home / Gym: composed WORKOUTS (admin Compose area) first, then the
 *    exercise library grid — the admin panel's output is the primary surface.
 *  - Custom: body-area picker over the same library.
 */
export default function Workout() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("home");
  const [area, setArea] = useState<BodyArea>("full_body");
  const [items, setItems] = useState<ExerciseWithMedia[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      if (tab === "custom") {
        setTemplates([]);
        setItems(await listExercisesByArea(area));
      } else {
        const [tpl, ex] = await Promise.all([listWorkoutTemplates(tab), listExercisesByMode(tab)]);
        setTemplates(tpl);
        setItems(ex);
      }
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [tab, area]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen scroll={false}>
      <T variant="h1" style={{ marginTop: space.sm }}>
        {t("tab_workout")}
      </T>

      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
        {MODES.map((m) => (
          <Chip key={m.tab} label={t(m.k)} active={tab === m.tab} onPress={() => setTab(m.tab)} />
        ))}
      </View>

      {status === "loading" ? (
        <Center>
          <ActivityIndicator color={color.saffron} />
        </Center>
      ) : status === "error" ? (
        <Center>
          <T variant="body" tone="muted" style={{ textAlign: "center" }}>
            {t("workout_error")}
          </T>
          <Button k="retry" kind="ghost" onPress={load} />
        </Center>
      ) : (
        <ExerciseGrid
          items={items}
          header={
            <View>
              {tab === "custom" ? (
                <View style={{ marginTop: space.md }}>
                  <T variant="eyebrow" tone="gold" style={{ marginBottom: space.sm }}>
                    {t("pick_area")}
                  </T>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={AREAS}
                    keyExtractor={(a) => a.area}
                    contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}
                    renderItem={({ item }) => (
                      <Chip label={t(item.k)} active={area === item.area} onPress={() => setArea(item.area)} />
                    )}
                  />
                </View>
              ) : templates.length > 0 ? (
                <TemplatesSection templates={templates} />
              ) : null}

              {items.length > 0 ? (
                <T variant="eyebrow" tone="gold" style={{ marginTop: space.lg, marginBottom: space.xs }}>
                  {t("all_exercises")}
                </T>
              ) : null}
            </View>
          }
        />
      )}
    </Screen>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>{children}</View>;
}

/** Composed workouts — full-width premium rows above the library. */
function TemplatesSection({ templates }: { templates: WorkoutTemplateSummary[] }) {
  const router = useRouter();
  const { t, loc, locSub } = useI18n();
  return (
    <View style={{ marginTop: space.lg, gap: space.sm }}>
      <T variant="eyebrow" tone="gold">
        {t("workouts_section")}
      </T>
      {templates.map((tpl) => {
        const sub = locSub(tpl.name_hi, tpl.name_en);
        const meta = [
          tpl.est_minutes ? `${tpl.est_minutes} ${t("minutes_short")}` : null,
          `${tpl.exercise_count} ${t("exercises_word")}`,
          t(LEVEL_KEY[tpl.level]),
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <Card key={tpl.id} onPress={() => router.push(`/workout/template/${tpl.id}`)} style={{ paddingVertical: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(240,118,30,0.13)",
                }}
              >
                <DumbbellIcon color={color.saffron} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyBold">{loc(tpl.name_hi, tpl.name_en)}</T>
                {sub ? (
                  <T variant="caption" tone="muted">
                    {sub}
                  </T>
                ) : null}
                <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {meta}
                </T>
              </View>
              <ChevronRight />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function ExerciseGrid({ items, header }: { items: ExerciseWithMedia[]; header: React.ReactElement }) {
  const { t, loc, locSub } = useI18n();
  const router = useRouter();

  return (
    <FlatList
      data={items}
      keyExtractor={(e) => e.id}
      numColumns={2}
      style={{ marginTop: space.xs }}
      columnWrapperStyle={{ gap: space.md }}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={{ alignItems: "center", padding: space.xl }}>
          <T variant="body" tone="muted" style={{ textAlign: "center" }}>
            {t("workout_empty")}
          </T>
        </View>
      }
      renderItem={({ item }) => {
        const sub = locSub(item.name_hi, item.name_en);
        return (
          <Card onPress={() => router.push(`/workout/${item.id}`)} style={{ flex: 1, padding: space.sm }}>
            <AvatarTile aspectRatio={4 / 3} playSize={30} silhouetteSize={62} />
            <View style={{ paddingHorizontal: space.xs, paddingTop: space.sm, paddingBottom: space.xs }}>
              <T variant="bodyBold" numberOfLines={1}>
                {loc(item.name_hi, item.name_en)}
              </T>
              {sub ? (
                <T variant="caption" tone="muted" numberOfLines={1}>
                  {sub}
                </T>
              ) : null}
              <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {t(LEVEL_KEY[item.level])}
              </T>
            </View>
          </Card>
        );
      }}
    />
  );
}
