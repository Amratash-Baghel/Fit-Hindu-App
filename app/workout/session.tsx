import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import {
  Screen,
  Card,
  Button,
  FooterAction,
  B,
  T,
  AvatarTile,
  DiyaIcon,
  color,
  space,
} from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { loadSession, type SessionSource, type TemplateItem } from "../../src/lib/content";
import { logActivity } from "../../src/lib/activity";

/**
 * Guided session player (workout spec v2 — F&B structure, Leap execution):
 *   [Exercise · Set k/N] → set done → [Rest: countdown · +20s · Skip ·
 *   next-up preview] → next set / next exercise → [Complete: diya + stats].
 * One player, three sources: ?template=, ?custom=, ?exercise=.
 */

interface SetLogEntry {
  exercise_id: string;
  set_no: number;
  reps?: number;
  seconds?: number;
  weight_kg?: number;
}

interface Target {
  itemIdx: number;
  setNo: number; // 1-based
}

function effective(item: TemplateItem) {
  const ex = item.exercise;
  return {
    sets: item.sets ?? ex.default_sets ?? 1,
    reps: item.reps ?? ex.default_reps,
    duration: item.duration_seconds ?? ex.default_duration_seconds,
    rest: item.rest_seconds ?? ex.default_rest_seconds ?? 30,
  };
}

export default function WorkoutSession() {
  useKeepAwake();
  const router = useRouter();
  const params = useLocalSearchParams<{ template?: string; custom?: string; exercise?: string }>();
  const { t, loc, locSub } = useI18n();

  const [source, setSource] = useState<SessionSource | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const [phase, setPhase] = useState<"work" | "rest" | "done">("work");
  const [target, setTarget] = useState<Target>({ itemIdx: 0, setNo: 1 });
  const [next, setNext] = useState<Target | null>(null);
  const [secLeft, setSecLeft] = useState<number | null>(null); // timed work
  const [restLeft, setRestLeft] = useState(0);
  const [weight, setWeight] = useState("");

  const log = useRef<SetLogEntry[]>([]);
  const startedAt = useRef(Date.now());
  const completed = useRef(false);

  useEffect(() => {
    let alive = true;
    loadSession({ template: params.template, custom: params.custom, exercise: params.exercise })
      .then((s) => {
        if (!alive) return;
        if (!s || s.items.length === 0) {
          setStatus("error");
          return;
        }
        setSource(s);
        const eff = effective(s.items[0]);
        setSecLeft(eff.duration ?? null);
        setStatus("ok");
        startedAt.current = Date.now();
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.template, params.custom, params.exercise]);

  const item = source?.items[target.itemIdx];
  const eff = item ? effective(item) : null;

  const finishSet = useCallback(() => {
    if (!source || !item || !eff) return;
    const entry: SetLogEntry = { exercise_id: item.exercise.id, set_no: target.setNo };
    if (eff.duration) entry.seconds = eff.duration;
    else if (eff.reps) entry.reps = eff.reps;
    const w = parseFloat(weight);
    if (!Number.isNaN(w) && w > 0) entry.weight_kg = w;
    log.current.push(entry);
    setWeight("");

    // where do we go next?
    let n: Target | null = null;
    if (target.setNo < eff.sets) n = { itemIdx: target.itemIdx, setNo: target.setNo + 1 };
    else if (target.itemIdx < source.items.length - 1) n = { itemIdx: target.itemIdx + 1, setNo: 1 };

    if (!n) {
      complete();
      return;
    }
    setNext(n);
    setRestLeft(eff.rest);
    setPhase("rest");
  }, [source, item, eff, target, weight]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (!source || !next) return;
    const nEff = effective(source.items[next.itemIdx]);
    setTarget(next);
    setNext(null);
    setSecLeft(nEff.duration ?? null);
    setPhase("work");
  }, [source, next]);

  function complete() {
    if (completed.current || !source) return;
    completed.current = true;
    setPhase("done");
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    logActivity(
      "workout",
      { source: source.kind, ref_id: source.refId, minutes, sets: log.current },
      source.refId,
    );
  }

  // one ticking interval drives both timed work and rest
  useEffect(() => {
    if (status !== "ok" || phase === "done") return;
    const id = setInterval(() => {
      if (phase === "work") {
        setSecLeft((s) => (s === null ? null : s > 0 ? s - 1 : 0));
      } else if (phase === "rest") {
        setRestLeft((r) => (r > 0 ? r - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [status, phase]);

  // timed set reaching zero completes the set; rest reaching zero advances
  useEffect(() => {
    if (phase === "work" && secLeft === 0) finishSet();
  }, [phase, secLeft, finishSet]);
  useEffect(() => {
    if (phase === "rest" && restLeft === 0) advance();
  }, [phase, restLeft, advance]);

  // ---------- render ----------

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

  if (status === "error" || !source || !item || !eff) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl }}>
          <T variant="body" tone="muted" style={{ textAlign: "center" }}>
            {t("workout_error")}
          </T>
          <Button k="retry" kind="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // completion
  if (phase === "done") {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
          <DiyaIcon size={72} />
          <B k="workout_complete" variant="h1" center />
          <B k="great_work" variant="body" tone="muted" center />
          <View style={{ flexDirection: "row", gap: space.xl, marginTop: space.lg }}>
            <Stat v={String(new Set(log.current.map((s) => s.exercise_id)).size)} label={t("exercises_word")} />
            <Stat v={String(log.current.length)} label={t("sets_total_word")} />
            <Stat v={String(minutes)} label={t("minutes_short")} />
          </View>
        </View>
        <FooterAction>
          <Button k="done" onPress={() => router.dismissTo("/(tabs)/workout")} />
        </FooterAction>
      </Screen>
    );
  }

  // rest screen (Leap pattern)
  if (phase === "rest" && next) {
    const nextItem = source.items[next.itemIdx];
    const nextSub = locSub(nextItem.exercise.name_hi, nextItem.exercise.name_en);
    const nEff = effective(nextItem);
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg }}>
          <T variant="eyebrow" tone="gold">
            {t("rest_now")}
          </T>
          <T variant="display" style={{ fontSize: 64, fontVariant: ["tabular-nums"] }}>
            {String(Math.floor(restLeft / 60)).padStart(2, "0")}:{String(restLeft % 60).padStart(2, "0")}
          </T>

          <Card style={{ width: "100%", maxWidth: 420 }}>
            <T variant="eyebrow" tone="gold" style={{ marginBottom: space.xs }}>
              {t("next_up")}
            </T>
            <T variant="bodyBold">{loc(nextItem.exercise.name_hi, nextItem.exercise.name_en)}</T>
            {nextSub ? (
              <T variant="caption" tone="muted">
                {nextSub}
              </T>
            ) : null}
            <T variant="caption" tone="saffron" style={{ marginTop: 2, fontVariant: ["tabular-nums"] }}>
              {t("set_word")} {next.setNo}/{nEff.sets}
            </T>
          </Card>
        </View>
        <FooterAction>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button k="plus_20s" kind="ghost" onPress={() => setRestLeft((r) => r + 20)} />
            </View>
            <View style={{ flex: 2 }}>
              <Button k="skip_word" onPress={advance} />
            </View>
          </View>
        </FooterAction>
      </Screen>
    );
  }

  // work screen
  const nameSub = locSub(item.exercise.name_hi, item.exercise.name_en);
  const isGym = (item.exercise.modes ?? []).includes("gym");
  const timed = eff.duration != null;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: space.sm, gap: space.md, flex: 1 }}>
        <AvatarTile height={200} playSize={52} silhouetteSize={92} />

        <View>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <T variant="h1" style={{ flex: 1 }} numberOfLines={1}>
              {loc(item.exercise.name_hi, item.exercise.name_en)}
            </T>
            <T variant="caption" tone="muted" style={{ fontVariant: ["tabular-nums"] }}>
              {target.itemIdx + 1}/{source.items.length}
            </T>
          </View>
          {nameSub ? (
            <T variant="caption" tone="muted">
              {nameSub}
            </T>
          ) : null}
        </View>

        {/* set progress + target */}
        <Card style={{ alignItems: "center", paddingVertical: space.lg }}>
          <T variant="eyebrow" tone="gold">
            {t("set_word")} {target.setNo}/{eff.sets}
          </T>
          {timed ? (
            <T variant="display" style={{ fontSize: 56, fontVariant: ["tabular-nums"], marginTop: space.xs }}>
              {String(Math.floor((secLeft ?? 0) / 60)).padStart(2, "0")}:{String((secLeft ?? 0) % 60).padStart(2, "0")}
            </T>
          ) : (
            <T variant="display" style={{ fontSize: 56, fontVariant: ["tabular-nums"], marginTop: space.xs }} tone="saffron">
              ×{eff.reps ?? "—"}
            </T>
          )}
        </Card>

        {/* gym-mode weight input (F&B journal) */}
        {isGym ? (
          <Card style={{ paddingVertical: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <T variant="caption" tone="muted" style={{ flex: 1 }}>
                {t("weight_kg")}
              </T>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor={color.muted}
                style={{
                  minWidth: 90,
                  borderWidth: 1,
                  borderColor: color.line,
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  color: color.cream,
                  fontSize: 17,
                  textAlign: "center",
                }}
              />
            </View>
          </Card>
        ) : null}
      </View>

      <FooterAction>
        {timed ? null : <Button k="set_done" onPress={finishSet} />}
        <Button k="exit_confirm" kind="ghost" onPress={() => router.back()} />
      </FooterAction>
    </Screen>
  );
}

function Stat({ v, label }: { v: string; label: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <T variant="h1" tone="gold" style={{ fontVariant: ["tabular-nums"] }}>
        {v}
      </T>
      <T variant="caption" tone="muted">
        {label}
      </T>
    </View>
  );
}
