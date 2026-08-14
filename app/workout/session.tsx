/**
 * Guided session player (workout spec v2 — F&B structure, Leap execution):
 *   [Exercise · Set k/N] → set done → [Rest: countdown · +20s · Skip ·
 *   next-up preview] → next set / next exercise → [Complete: diya + stats].
 * One player, three sources: ?template=, ?custom=, ?exercise=.
 *
 * Slice 6 changed what this file does with the work it records. It used to keep
 * every set in a `useRef` and write a single activity_log row at the very end —
 * kill the app at set 9 of 10 and all of it was gone. Now each set goes to
 * `src/lib/session.ts` as it happens (local mirror first, network second), and
 * an interrupted session is closed out on the next launch.
 *
 * The countdown drives its own transitions from inside the interval callback
 * rather than from an effect watching the counter. That is not a style choice:
 * an effect that fires `finishSet()` when `secLeft` hits 0 is a setState
 * cascade, and it double-fired if a re-render landed on the same zero.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import {
  Screen,
  Card,
  Button,
  FooterAction,
  ProgressBar,
  Reveal,
  B,
  T,
  VideoHero,
  CompletionDiya,
  GoldWash,
  PointsEarned,
  AnimatedNumber,
  Shimmer,
  color,
  radius,
  space,
} from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { loadSession, type SessionSource, type TemplateItem } from "../../src/lib/content";
import { finishSession, flushQueue, logSet, startSession } from "../../src/lib/session";
import { earnSince, pointsTodayNow, type ActivityEarn } from "../../src/lib/points";
import { feedback } from "../../src/lib/feedback";
import { markPushOffered, requestPushPermission, shouldOfferPush } from "../../src/lib/push";

interface Target {
  itemIdx: number;
  setNo: number; // 1-based
}

/** Stats for the completion screen, captured when the session ends so the
 *  render never has to read a ref (and never recomputes minutes on re-render). */
interface Summary {
  exercises: number;
  sets: number;
  minutes: number;
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
  const [setsDone, setSetsDone] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  /** The Fit-Points this workout earned, read after the finish lands. null =
   *  not yet read / guest / offline → the reward block simply shows no number. */
  const [earn, setEarn] = useState<ActivityEarn | null>(null);

  /** Server session id; null for a guest, who still gets the whole player. */
  const sessionId = useRef<string | null>(null);
  /** Set at load, never during render (Date.now() in a ref initialiser is an
   *  impure call on every render, not just the first). */
  const startedAtMs = useRef(0);
  const exercisesSeen = useRef(new Set<string>());
  /** Synchronous twin of `setsDone`. The last set completes the workout in the
   *  same call that records it, and the `setsDone` state update has not been
   *  applied yet at that point — reading the state there undercounts the
   *  summary by exactly one, every time. */
  const setsLogged = useRef(0);
  /** "itemIdx:setNo" of the last set recorded — the double-tap guard. */
  const lastLogged = useRef<string | null>(null);
  const completed = useRef(false);
  /** Today's Fit-Points total captured at session start, so the completion
   *  screen can show the honest per-workout delta (see complete()). */
  const pointsBefore = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    loadSession({ template: params.template, custom: params.custom, exercise: params.exercise })
      .then(async (s) => {
        if (!alive) return;
        if (!s || s.items.length === 0) {
          setStatus("error");
          return;
        }
        setSource(s);
        setSecLeft(effective(s.items[0]).duration ?? null);
        startedAtMs.current = Date.now();
        setStatus("ok");

        // Open the server-side session after painting: a slow network must not
        // hold up the first exercise. Sets logged before this resolves are
        // no-ops (logSet checks the mirror), which is why the very first set
        // cannot be recorded for a user who starts instantly on a dead
        // connection — acceptable, and far better than a blocking spinner.
        const local = await startSession(s);
        if (alive) sessionId.current = local?.id ?? null;

        // Snapshot today's points BEFORE this workout's activity row is written
        // (that happens at finishSession), so complete() can show the delta this
        // workout actually added — +0 and an "already claimed" line if the daily
        // cap was banked earlier today.
        const before = await pointsTodayNow();
        if (alive) pointsBefore.current = before;
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [params.template, params.custom, params.exercise]);

  const item = source?.items[target.itemIdx];
  const eff = item ? effective(item) : null;

  /** Every set the session will contain — the denominator of the progress bar. */
  const totalSets = useMemo(
    () => (source ? source.items.reduce((n, it) => n + effective(it).sets, 0) : 0),
    [source],
  );

  /** The exercise demo, memoised on the exercise's own media so the per-second
   *  timer re-renders (timed sets / rest countdown) never rebuild the video
   *  subtree — the heaviest thing on the screen. The player + poster only swap
   *  when the exercise itself changes. */
  const videoEl = useMemo(
    () => (
      <VideoHero
        url={item?.exercise.video?.playback_url}
        thumbUrl={item?.exercise.thumb?.playback_url}
        height={200}
        playSize={52}
        silhouetteSize={92}
      />
    ),
    [item?.exercise.video?.playback_url, item?.exercise.thumb?.playback_url],
  );

  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    // The sound only — the completion haptic is the synced rewardBurst fired by
    // CompletionDiya below, so a notification buzz here doesn't fight its pattern.
    feedback.completeChime(); // workout finished — the reward chime
    const minutes = Math.max(1, Math.round((Date.now() - startedAtMs.current) / 60000));
    setSummary({ exercises: exercisesSeen.current.size, sets: setsLogged.current, minutes });
    setPhase("done");
    // finishSession resolves once the activity row is QUEUED, not once it lands
    // (the offline queue swallows delivery failures). Re-flush and check the
    // result: a drained queue (true) means the row reached the server, so the
    // points diff is real; still-queued (false, i.e. offline) → pass null so the
    // completion screen shows no number rather than a false "already claimed
    // today". The Home card reconciles to the true total once delivery catches
    // up on the next foreground.
    if (sessionId.current) {
      void finishSession(sessionId.current).then(async () => {
        const delivered = await flushQueue();
        setEarn(await earnSince(delivered ? pointsBefore.current : null));
      });
    }
  }, []);

  const finishSet = useCallback(() => {
    if (!source || !item || !eff) return;
    // A double-tap fires twice against the same unchanged target before React
    // re-renders. The server dedupes (the exercise_logs PK), but the on-screen
    // counters would not: the bar and the completion summary would both read
    // one set too many. Guard on the set actually being the one still open.
    const key = `${target.itemIdx}:${target.setNo}`;
    if (lastLogged.current === key) return;
    lastLogged.current = key;

    feedback.count(); // each set completed — haptic-only ack (fires for the manual
    // tap AND the timed auto-complete; the button below suppresses its own press
    // haptic so a tapped set isn't a double buzz)

    const w = parseFloat(weight);
    if (sessionId.current) {
      void logSet(sessionId.current, {
        item_position: target.itemIdx,
        set_no: target.setNo,
        exercise_id: item.exercise.id,
        ...(eff.duration ? { duration_seconds: eff.duration } : {}),
        ...(!eff.duration && eff.reps ? { reps: eff.reps } : {}),
        ...(!Number.isNaN(w) && w > 0 ? { weight_kg: w } : {}),
        skipped: false,
      });
    }
    exercisesSeen.current.add(item.exercise.id);
    setsLogged.current += 1;
    setSetsDone(setsLogged.current);
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
  }, [source, item, eff, target, weight, complete]);

  const advance = useCallback(() => {
    if (!source || !next) return;
    setTarget(next);
    setSecLeft(effective(source.items[next.itemIdx]).duration ?? null);
    setNext(null);
    setPhase("work");
  }, [source, next]);

  // One ticking interval drives both timed work and rest. The transition at
  // zero happens HERE, in the timer callback — an event, not a render and not
  // an effect body — so it neither cascades nor fires twice on the same zero.
  // Latest callbacks come from refs so the interval isn't rebuilt every tick.
  const finishSetRef = useRef(finishSet);
  const advanceRef = useRef(advance);
  useEffect(() => {
    finishSetRef.current = finishSet;
    advanceRef.current = advance;
  }, [finishSet, advance]);

  // The live counter values, mirrored so the tick can read them without the
  // interval depending on them. State updaters below stay PURE — calling
  // finishSet() from inside one would re-run the side effect whenever React
  // re-invokes an updater (it does exactly that in StrictMode to surface
  // impurity), double-logging every timed set.
  const secRef = useRef<number | null>(null);
  const restRef = useRef(0);
  useEffect(() => {
    secRef.current = secLeft;
  }, [secLeft]);
  useEffect(() => {
    restRef.current = restLeft;
  }, [restLeft]);

  useEffect(() => {
    if (status !== "ok" || phase === "done") return;
    const id = setInterval(() => {
      if (phase === "work") {
        const s = secRef.current;
        if (s === null) return; // rep-based set: no countdown at all
        if (s <= 1) {
          secRef.current = 0;
          setSecLeft(0);
          finishSetRef.current();
        } else {
          secRef.current = s - 1;
          setSecLeft(s - 1);
        }
      } else {
        const r = restRef.current;
        if (r <= 1) {
          restRef.current = 0;
          setRestLeft(0);
          advanceRef.current();
        } else {
          restRef.current = r - 1;
          setRestLeft(r - 1);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [status, phase]);

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
  if (phase === "done" && summary) {
    return (
      <Screen scroll={false} overlay={<GoldWash />}>
        <Stack.Screen options={{ headerShown: false }} />
        {/* warm backdrop so the reward glows out of depth instead of flat black */}
        <LinearGradient
          colors={["#1F1207", "#150E08", "#0C0906"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
          {/* the reward moment: the diya lights, holds a beat, then the gold
              sparks radiate — with the synced haptic burst. Timing in CompletionDiya. */}
          <CompletionDiya diyaSize={76} burstSize={232} celebrate />

          {/* copy + stats LIFT in after the burst (mockup .lift), so the
              celebration lands first and the screen builds itself around it */}
          <Reveal lift delay={640}>
            <B k="workout_complete" variant="h1" center />
          </Reveal>
          <Reveal lift delay={760}>
            <B k="great_work" variant="body" tone="muted" center />
          </Reveal>

          {/* the reward hero — the Fit-Points this workout earned, counting up */}
          <Reveal lift delay={920} style={{ width: "100%", alignItems: "center" }}>
            <PointsEarned earned={earn?.earned ?? null} total={earn?.total ?? null} style={{ marginTop: space.sm }} />
          </Reveal>

          {/* the session at a glance — a gold-tinted card matching the points
              hero, so the two read as one cohesive reward block; it carries the
              same faint glint as every earned surface */}
          <Reveal lift delay={1080} style={{ width: "100%", alignItems: "center" }}>
            <View
              style={{
                width: "100%",
                maxWidth: 420,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: "rgba(217,164,65,0.28)",
                backgroundColor: "rgba(217,164,65,0.06)",
                paddingVertical: space.lg,
                overflow: "hidden",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Stat n={summary.exercises} label={t("exercises_word")} />
                <StatDivider />
                <Stat n={summary.sets} label={t("sets_total_word")} />
                <StatDivider />
                <Stat n={summary.minutes} label={t("minutes_short")} />
              </View>
              <Shimmer mode="sheen" tint={color.goldHi} peak={0.1} />
            </View>
          </Reveal>

          {/* The permission moment (spec slice 7). Shows itself only when it
              has something to ask for. */}
          <PushOptIn />
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
        <View style={{ paddingTop: space.sm }}>
          <ProgressBar value={setsDone} max={totalSets} trailing={`${setsDone}/${totalSets}`} animated />
        </View>
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
              {/* skipping rest is utilitarian and repeated — a plain tick, NOT
                  the gold spark-burst reserved for genuine completions */}
              <Button k="skip_word" onPress={advance} burst={false} haptic="press" />
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
        {/* in-session progress — sets completed across the whole workout */}
        <ProgressBar value={setsDone} max={totalSets} trailing={`${setsDone}/${totalSets}`} animated />

        {/* the exercise demo — real HLS when the team has uploaded one, else the
            avatar placeholder (VideoHero decides). Memoised (videoEl) so the
            per-second timer never rebuilds it. */}
        {videoEl}

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

        {/* set progress + target — the screen's focal medallion */}
        <Card style={{ alignItems: "center", paddingVertical: space.xl, gap: space.sm, overflow: "hidden" }}>
          {/* soft halo behind the target so the number glows off the card */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 200,
              height: 200,
              marginLeft: -100,
              marginTop: -70,
              borderRadius: 100,
              backgroundColor: timed ? color.gold : color.saffron,
              opacity: 0.08,
            }}
          />
          <T variant="eyebrow" tone="gold">
            {t("set_word")} {target.setNo}/{eff.sets}
          </T>
          {/* pips — progress through THIS exercise's sets */}
          <SetPips total={eff.sets} current={target.setNo} />
          {timed ? (
            <T
              variant="display"
              style={{
                fontSize: 62,
                fontVariant: ["tabular-nums"],
                letterSpacing: 1,
                textShadowColor: "rgba(242,200,121,0.45)",
                textShadowRadius: 22,
                textShadowOffset: { width: 0, height: 0 },
              }}
            >
              {String(Math.floor((secLeft ?? 0) / 60)).padStart(2, "0")}:{String((secLeft ?? 0) % 60).padStart(2, "0")}
            </T>
          ) : (
            <T
              variant="display"
              tone="saffron"
              style={{
                fontSize: 64,
                fontVariant: ["tabular-nums"],
                letterSpacing: 1,
                textShadowColor: "rgba(240,118,30,0.5)",
                textShadowRadius: 24,
                textShadowOffset: { width: 0, height: 0 },
              }}
            >
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
        {timed ? null : <Button k="set_done" onPress={finishSet} haptic={false} />}
        {/* Leaving early still closes the session out, so the sets already
            logged count and no row is left 'active' for reconcile to find. */}
        <Button
          k="exit_confirm"
          kind="ghost"
          onPress={() => {
            if (sessionId.current) {
              void finishSession(sessionId.current, setsDone > 0 ? "completed" : "abandoned");
            }
            router.back();
          }}
        />
      </FooterAction>
    </Screen>
  );
}

/**
 * The in-app invitation to turn on reminders — the pre-prompt for the system
 * dialog, shown on the completion screen and nowhere else (spec slice 7:
 * "after first completed workout, not on cold launch").
 *
 * Why a card and not just `requestPermissionsAsync()`: the OS prompt is one
 * shot. Spending it on someone who has not been told what it is for converts
 * badly and cannot be retried. Here the ask has just been earned — the diya is
 * still on screen — and a "not now" never reaches the OS at all, so Settings
 * can still offer it later. See src/lib/push.ts `shouldOfferPush`.
 *
 * Renders nothing at all when there is nothing to ask: permission already
 * decided, already offered once, Expo Go, or web.
 */
function PushOptIn() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    void shouldOfferPush().then((show) => {
      if (alive) setVisible(show);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!visible) return null;

  // Both answers close the card and both are remembered — the difference is
  // only whether the OS is asked.
  const answer = (accept: boolean) => {
    setVisible(false);
    void markPushOffered();
    if (accept) void requestPushPermission();
  };

  return (
    <Card style={{ marginTop: space.xl, width: "100%", maxWidth: 420, gap: space.sm }}>
      <B k="push_offer_title" variant="bodyBold" />
      <B k="push_offer_body" variant="caption" tone="muted" />
      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.xs }}>
        <View style={{ flex: 1 }}>
          <Button k="auth_skip" kind="ghost" onPress={() => answer(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button k="push_offer_yes" onPress={() => answer(true)} />
        </View>
      </View>
    </Card>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <AnimatedNumber value={n} variant="h1" tone="gold" style={{ fontVariant: ["tabular-nums"] }} />
      <T variant="caption" tone="muted">
        {label}
      </T>
    </View>
  );
}

/** Hairline between the completion stats — structure without a heavy box. */
function StatDivider() {
  return <View style={{ width: 1, height: 32, backgroundColor: color.line }} />;
}

/**
 * Set progress through the current exercise: sets already done are gold dots,
 * the active set is a wide saffron pill, upcoming sets are dim. Capped at 8 so a
 * high-set exercise never overflows the medallion.
 */
function SetPips({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: Math.min(total, 8) }).map((_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <View
            key={i}
            style={{
              width: active ? 22 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: done ? color.gold : active ? color.saffron : color.line,
            }}
          />
        );
      })}
    </View>
  );
}
