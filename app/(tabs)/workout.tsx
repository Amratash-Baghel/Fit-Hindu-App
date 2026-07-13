import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Chip, T, Button, color, space } from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { listExercisesByMode, listExercisesByArea, type ExerciseWithMedia } from "../../src/lib/content";
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

export default function Workout() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("home");
  const [area, setArea] = useState<BodyArea>("full_body");
  const [items, setItems] = useState<ExerciseWithMedia[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = tab === "custom" ? await listExercisesByArea(area) : await listExercisesByMode(tab);
      setItems(data);
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
      <T variant="h1">{t("tab_workout")}</T>

      {/* mode switcher */}
      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
        {MODES.map((m) => (
          <Chip key={m.tab} label={t(m.k)} active={tab === m.tab} onPress={() => setTab(m.tab)} />
        ))}
      </View>

      {/* body-area picker (custom only) */}
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
      ) : null}

      <Body status={status} items={items} onRetry={load} levelKey={LEVEL_KEY} />
    </Screen>
  );
}

function Body({
  status,
  items,
  onRetry,
  levelKey,
}: {
  status: "loading" | "ok" | "error";
  items: ExerciseWithMedia[];
  onRetry: () => void;
  levelKey: Record<string, StringKey>;
}) {
  const { t, loc, locSub } = useI18n();
  const router = useRouter();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
        <ActivityIndicator color={color.saffron} />
        <T variant="caption" tone="muted">
          {t("loading")}
        </T>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl }}>
        <T variant="body" tone="muted" style={{ textAlign: "center" }}>
          {t("workout_error")}
        </T>
        <Button k="retry" kind="ghost" onPress={onRetry} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl }}>
        <T variant="body" tone="muted" style={{ textAlign: "center" }}>
          {t("workout_empty")}
        </T>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(e) => e.id}
      numColumns={2}
      style={{ marginTop: space.md }}
      columnWrapperStyle={{ gap: space.md }}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const sub = locSub(item.name_hi, item.name_en);
        return (
          <Card
            onPress={() => router.push(`/workout/${item.id}`)}
            style={{ flex: 1, padding: space.sm }}
          >
            {/* media tile — avatar demo placeholder until the real Bunny
                video is uploaded via the admin panel */}
            <View
              style={{
                aspectRatio: 4 / 3,
                borderRadius: 13,
                backgroundColor: color.surface2,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <T style={{ fontSize: 40 }}>🧘</T>
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: "rgba(15,11,7,0.6)",
                  borderWidth: 1,
                  borderColor: "#4a3416",
                }}
              >
                <T variant="eyebrow" tone="gold" style={{ fontSize: 9, letterSpacing: 1 }}>
                  {t("our_avatar")}
                </T>
              </View>
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 6,
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: color.gold,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <T style={{ fontSize: 12, color: "#241503" }}>▶</T>
              </View>
            </View>
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
                {t(levelKey[item.level])}
              </T>
            </View>
          </Card>
        );
      }}
    />
  );
}
