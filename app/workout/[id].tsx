import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, T, Button, FooterAction, color, radius, space } from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { getExercise, type ExerciseWithMedia } from "../../src/lib/content";

const LEVEL_KEY: Record<string, StringKey> = {
  beginner: "level_beginner",
  intermediate: "level_intermediate",
  advanced: "level_advanced",
};

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, loc, locSub } = useI18n();
  const router = useRouter();
  const [ex, setEx] = useState<ExerciseWithMedia | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getExercise(String(id));
        if (alive) {
          setEx(data);
          setStatus("ok");
        }
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.saffron} />
        </View>
      </Screen>
    );
  }

  if (status === "error" || !ex) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl }}>
          <T variant="body" tone="muted" style={{ textAlign: "center" }}>
            {t("workout_error")}
          </T>
          <Button k="retry" kind="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const nameSub = locSub(ex.name_hi, ex.name_en);
  const instructions = loc(ex.instructions_hi ?? "", ex.instructions_en ?? "");
  const stats: { k: StringKey; v: string }[] = [];
  if (ex.default_sets != null) stats.push({ k: "sets", v: String(ex.default_sets) });
  if (ex.default_reps != null) stats.push({ k: "reps", v: `×${ex.default_reps}` });
  if (ex.default_duration_seconds != null) stats.push({ k: "hold", v: fmt(ex.default_duration_seconds) });
  stats.push({ k: "rest", v: fmt(ex.default_rest_seconds) });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      {/* video hero — avatar demo (placeholder until real Bunny media) */}
      <View
        style={{
          height: 220,
          borderRadius: radius.media,
          borderWidth: 1,
          borderColor: "#4a3416",
          backgroundColor: color.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: "rgba(15,11,7,0.6)",
            borderWidth: 1,
            borderColor: "#4a3416",
          }}
        >
          <T variant="eyebrow" tone="gold" style={{ fontSize: 10, letterSpacing: 1.4 }}>
            {t("our_avatar")}
          </T>
        </View>
        <T style={{ fontSize: 56 }}>🧘</T>
        <View
          style={{
            position: "absolute",
            width: 66,
            height: 66,
            borderRadius: 999,
            backgroundColor: color.gold,
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.92,
          }}
        >
          <T style={{ fontSize: 24, color: "#241503" }}>▶</T>
        </View>
      </View>

      <T variant="h1" style={{ marginTop: space.lg }}>
        {loc(ex.name_hi, ex.name_en)}
      </T>
      {nameSub ? (
        <T variant="caption" tone="muted">
          {nameSub} · {t(LEVEL_KEY[ex.level])}
        </T>
      ) : (
        <T variant="caption" tone="muted">
          {t(LEVEL_KEY[ex.level])}
        </T>
      )}

      {/* stat chips */}
      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
        {stats.map((s) => (
          <Card key={s.k} style={{ flex: 1, alignItems: "center", padding: space.md }}>
            <T variant="h2" tone="saffron">
              {s.v}
            </T>
            <T variant="caption" tone="muted">
              {t(s.k)}
            </T>
          </Card>
        ))}
      </View>

      {/* instructions */}
      {instructions ? (
        <View style={{ marginTop: space.lg }}>
          <T variant="eyebrow" tone="gold" style={{ marginBottom: space.sm }}>
            {t("instructions")}
          </T>
          <T variant="body" tone="soft">
            {instructions}
          </T>
        </View>
      ) : null}

      <FooterAction>
        <Button k="start_workout" onPress={() => {}} />
        <T variant="caption" tone="muted" style={{ textAlign: "center", marginTop: space.xs }}>
          {t("workout_safety")}
        </T>
      </FooterAction>
    </Screen>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}
