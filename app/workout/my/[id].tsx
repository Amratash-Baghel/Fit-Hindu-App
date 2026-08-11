import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Chip, Button, FooterAction, T, color, space } from "../../../src/ui";
import { useI18n } from "../../../src/lib/i18n";
import {
  getUserWorkout,
  listPublishedExercises,
  saveUserWorkout,
  type ExerciseWithMedia,
} from "../../../src/lib/content";

/**
 * My Workouts builder (workout spec v2, F&B "add your own workout"):
 * name + ordered exercises from the published library, ↑/↓ reorder,
 * per-item override left to defaults in v2 (sets/reps edits come with the
 * journal UI). Positions rewritten 1..n on save — ordering is reliable.
 * Route: /workout/my/new or /workout/my/<id>.
 */

interface DraftItem {
  exercise_id: string;
  name_hi: string;
  name_en: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
}

export default function MyWorkoutBuilder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const { t, loc, locSub } = useI18n();

  const [name, setName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [library, setLibrary] = useState<ExerciseWithMedia[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : String(id));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const lib = await listPublishedExercises();
        if (!alive) return;
        setLibrary(lib);
        if (!isNew) {
          const w = await getUserWorkout(String(id));
          if (!alive) return;
          if (!w) {
            setStatus("error");
            return;
          }
          setName(w.name);
          setItems(
            w.items.map((it) => ({
              exercise_id: it.exercise.id,
              name_hi: it.exercise.name_hi,
              name_en: it.exercise.name_en,
              sets: it.sets,
              reps: it.reps,
              duration_seconds: it.duration_seconds,
              rest_seconds: it.rest_seconds,
            })),
          );
        }
        setStatus("ok");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isNew]);

  function move(idx: number, dir: -1 | 1) {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const nextItems = [...items];
    [nextItems[idx], nextItems[targetIdx]] = [nextItems[targetIdx], nextItems[idx]];
    setItems(nextItems);
  }

  async function save() {
    if (!name.trim() || items.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const wid = await saveUserWorkout({
        id: savedId ?? undefined,
        name: name.trim(),
        items: items.map((it) => ({
          exercise_id: it.exercise_id,
          sets: it.sets,
          reps: it.reps,
          duration_seconds: it.duration_seconds,
          rest_seconds: it.rest_seconds,
        })),
      });
      setSavedId(wid);
      setMsg(t("saved_ok"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("error_generic"));
    }
    setBusy(false);
  }

  if (status === "loading") {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.saffron} />
        </View>
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
          <T variant="body" tone="muted">
            {t("workout_error")}
          </T>
          <Button k="retry" kind="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: space.sm }}>
        <T variant="eyebrow" tone="gold">
          {t("my_workouts")}
        </T>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("workout_name")}
          placeholderTextColor={color.muted}
          style={{
            marginTop: space.sm,
            borderWidth: 1,
            borderColor: color.line,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            color: color.cream,
            fontSize: 18,
            fontWeight: "700",
          }}
        />
      </View>

      <FlatList
        style={{ marginTop: space.md }}
        data={items}
        keyExtractor={(it, i) => `${it.exercise_id}-${i}`}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <T variant="caption" tone="muted" style={{ textAlign: "center", padding: space.lg }}>
            {t("empty_workout_hint")}
          </T>
        }
        renderItem={({ item, index }) => {
          const sub = locSub(item.name_hi, item.name_en);
          return (
            <Card style={{ paddingVertical: space.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <T variant="caption" tone="muted" style={{ width: 20, textAlign: "center", fontVariant: ["tabular-nums"] }}>
                  {index + 1}
                </T>
                <View style={{ flex: 1 }}>
                  <T variant="bodyBold">{loc(item.name_hi, item.name_en)}</T>
                  {sub ? (
                    <T variant="caption" tone="muted">
                      {sub}
                    </T>
                  ) : null}
                </View>
                <Chip label="↑" onPress={() => move(index, -1)} />
                <Chip label="↓" onPress={() => move(index, 1)} />
                <Chip label="✕" onPress={() => setItems(items.filter((_, i) => i !== index))} />
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          <View style={{ marginTop: space.md }}>
            <T variant="eyebrow" tone="gold" style={{ marginBottom: space.sm }}>
              {t("add_exercise")}
            </T>
            <View style={{ gap: space.sm }}>
              {library.map((ex) => (
                <Card
                  key={ex.id}
                  onPress={() =>
                    setItems([
                      ...items,
                      {
                        exercise_id: ex.id,
                        name_hi: ex.name_hi,
                        name_en: ex.name_en,
                        sets: null,
                        reps: null,
                        duration_seconds: null,
                        rest_seconds: null,
                      },
                    ])
                  }
                  style={{ paddingVertical: space.sm }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                    <T variant="body" style={{ flex: 1 }}>
                      {loc(ex.name_hi, ex.name_en)}
                    </T>
                    <T tone="saffron" variant="bodyBold">
                      +
                    </T>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        }
      />

      <FooterAction>
        {msg ? (
          <T variant="caption" tone={msg.endsWith("✓") ? "ok" : "danger"} style={{ textAlign: "center" }}>
            {msg}
          </T>
        ) : null}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button k="save_word" kind="ghost" onPress={save} disabled={busy || !name.trim() || items.length === 0} />
          </View>
          <View style={{ flex: 2 }}>
            <Button
              k="start_workout"
              disabled={!savedId}
              onPress={() =>
                savedId ? router.push({ pathname: "/workout/session", params: { custom: savedId } }) : undefined
              }
            />
          </View>
        </View>
      </FooterAction>
    </Screen>
  );
}
