import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import {
  Screen,
  Card,
  Chip,
  Button,
  B,
  T,
  DiyaIcon,
  RewardOverlay,
  useMotion,
  color,
  goldGradient,
  radius,
  space,
} from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listMantras, getTodayDevotional, type MantraWithDeity } from "../../src/lib/content";
import { logActivity } from "../../src/lib/activity";
import { earnSince, pointsTodayNow } from "../../src/lib/points";
import { feedback } from "../../src/lib/feedback";

/** One mala. Fixed in v1 — see docs/specs/jap.md. */
const MALA = 108;

/**
 * Mantra jap (docs/specs/jap.md) — deity chips → mantra → glowing tap button,
 * counting 108 down to 0. Never gated: this is core worship.
 */
export default function Jap() {
  const { t, loc } = useI18n();
  const [mantras, setMantras] = useState<MantraWithDeity[]>([]);
  const [dayDeityId, setDayDeityId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [pickedDeityId, setPickedDeityId] = useState<string | null>(null);
  const [left, setLeft] = useState(MALA);
  /** The reward shown when a mala completes (108 → 0); null = hidden. */
  const [reward, setReward] = useState<{ earned: number | null; total: number | null } | null>(null);
  /**
   * The count's source of truth. State alone loses taps: a devotee chants
   * fast, and any two taps React batches into one render would both read the
   * same stale `left` and only decrement once. A ref is written synchronously
   * per tap, so no count is ever dropped; `left` is the render mirror.
   * (Only ever touched from event handlers — never during render.)
   */
  const countRef = useRef(MALA);

  useEffect(() => {
    let alive = true;
    // The deity-of-the-day only picks the DEFAULT chip, so a failure there
    // must not fail the screen — jap still works, it just starts on the
    // first deity.
    Promise.all([listMantras(), getTodayDevotional().catch(() => null)])
      .then(([rows, dev]) => {
        if (!alive) return;
        setMantras(rows);
        setDayDeityId(dev?.deity?.id ?? null);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((n) => n + 1);
  }, []);

  /** Deities that actually have a published mantra — the chip row. */
  const deities = useMemo(() => {
    const seen = new Map<string, { id: string; name_hi: string; name_en: string }>();
    for (const m of mantras) if (m.deity && !seen.has(m.deity.id)) seen.set(m.deity.id, m.deity);
    return [...seen.values()];
  }, [mantras]);

  // Default to today's deity when it has a mantra, else the first available.
  const activeDeityId =
    pickedDeityId ?? (deities.some((d) => d.id === dayDeityId) ? dayDeityId : deities[0]?.id) ?? null;
  const mantra = mantras.find((m) => m.deity_id === activeDeityId) ?? null;

  const resetMala = useCallback(() => {
    countRef.current = MALA;
    setLeft(MALA);
  }, []);

  const pickDeity = useCallback(
    (id: string) => {
      setPickedDeityId(id);
      resetMala(); // switching deity restarts the mala — spec rule
    },
    [resetMala],
  );

  const done = left === 0;

  const tap = useCallback(() => {
    if (countRef.current === 0) {
      feedback.select(); // tapping the lit diya to start a fresh mala
      resetMala();
      return;
    }
    const next = countRef.current - 1;
    countRef.current = next;
    setLeft(next);
    if (next === 0) {
      // Mala complete (108) — a distinct "yes" you HEAR, not just another tick.
      feedback.success();
      // Only a COMPLETED mala is logged (spec) — partial malas aren't persisted in v1.
      if (mantra) {
        const deityId = mantra.deity_id;
        const mantraId = mantra.id;
        // Snapshot points before the mala lands, log it, then diff — so the
        // reward shows THIS mala's earn (the 1st mala today is +10, the 2nd +0
        // once the flat base is banked, the 3rd +2, capped at 18).
        void (async () => {
          const before = await pointsTodayNow();
          const ok = await logActivity("jap", { deity_id: deityId, count: MALA }, mantraId);
          // Only diff against `before` if the write actually landed. If it
          // failed (offline/guest/transient), pass null → earned is null → the
          // overlay celebrates without a number, never the misleading "already
          // claimed today" that a bare earned===0 would show.
          const e = await earnSince(ok ? before : null);
          setReward({ earned: e.earned, total: e.total });
        })();
      }
    } else {
      // Every bead is a strong, definite thump you feel (owner override
      // 2026-08-08). Still HAPTIC-ONLY — no beep — so 108 taps stay a felt
      // count, not 108 chimes. The quarter markers ride the same heavy hit.
      feedback.japTap();
    }
  }, [mantra, resetMala]);

  if (status === "loading") {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.saffron} />
        </View>
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
          <B k="jap_error" variant="body" tone="muted" center />
          <Button k="retry" kind="ghost" onPress={retry} />
        </View>
      </Screen>
    );
  }

  if (!mantra) {
    return (
      <Screen scroll={false}>
        <B k="jap_title" variant="h1" />
        <Card style={{ marginTop: space.md }}>
          <B k="jap_empty" variant="body" tone="muted" />
        </Card>
      </Screen>
    );
  }

  const meaning = loc(mantra.meaning_hi ?? "", mantra.meaning_en ?? "");

  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.lg }}>
        <B k="jap_title" variant="h1" />

        {deities.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.sm, paddingVertical: space.md, paddingRight: space.lg }}
          >
            {deities.map((d) => (
              <Chip
                key={d.id}
                label={loc(d.name_hi, d.name_en)}
                active={d.id === activeDeityId}
                onPress={() => pickDeity(d.id)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={{ height: space.md }} />
        )}

        {/* counter — top, counting 108 down */}
        <View style={{ alignItems: "center", gap: 2 }}>
          <T variant="display" tone="gold" style={{ fontSize: 56, fontVariant: ["tabular-nums"] }}>
            {left}
          </T>
          <T variant="eyebrow" tone="muted">
            {done ? t("jap_complete") : `${t("jap_remaining")} · ${MALA}`}
          </T>
        </View>

        {/* mantra — the middle, the thing you read while chanting */}
        <Card style={{ marginTop: space.lg, alignItems: "center", gap: space.xs }}>
          <T variant="display" tone="saffron" style={{ fontSize: 30, textAlign: "center" }}>
            {mantra.text_devanagari}
          </T>
          {mantra.transliteration ? (
            <T variant="caption" tone="muted" style={{ textAlign: "center" }}>
              {mantra.transliteration}
            </T>
          ) : null}
          {meaning ? (
            <>
              <T variant="eyebrow" tone="gold" style={{ marginTop: space.sm }}>
                {t("jap_meaning")}
              </T>
              <T variant="caption" tone="soft" style={{ textAlign: "center" }}>
                {meaning}
              </T>
            </>
          ) : null}
        </Card>

        {/* the glowing button — the centre of the screen */}
        <View style={{ alignItems: "center", marginTop: space.xl, gap: space.md }}>
          <JapButton done={done} onPress={tap} />
          {/* the button already reads "Start again" when done — don't say it twice */}
          {done ? null : (
            <T variant="caption" tone="muted">
              {t("jap_tap_hint")}
            </T>
          )}
        </View>
      </ScrollView>

      <RewardOverlay
        visible={reward != null}
        titleKey="jap_complete"
        earned={reward?.earned ?? null}
        total={reward?.total ?? null}
        onDone={() => setReward(null)}
      />
    </Screen>
  );
}

/**
 * The tap target — reworked into a "precious artifact" (owner ask 2026-08-08):
 * a gold diya jewel resting in a breathing halo, that on EVERY tap dips smaller
 * then springs bigger with an overshoot, throws a ring-burst outward, and its
 * glowing bed flares. Paired with the heavy per-tap haptic in `tap()`, the mala
 * should feel satisfying to strike. Reanimated (UI thread) so 108 fast taps in
 * a row never stutter on low-end Android.
 */
function JapButton({ done, onPress }: { done: boolean; onPress: () => void }) {
  const { t } = useI18n();
  const enabled = useMotion();

  const press = useSharedValue(1); // face scale — dips then overshoots per tap
  const burst = useSharedValue(0); // ring expands + fades per tap
  const glow = useSharedValue(0.35); // bed glow intensity — spikes per tap, settles
  const halo = useSharedValue(0); // slow idle breathing 0..1

  useEffect(() => {
    if (!enabled) return;
    halo.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(halo);
  }, [enabled, halo]);

  const strike = () => {
    onPress();
    if (!enabled) return;
    // smaller → spring bigger (low damping overshoots past 1, then settles).
    press.value = withSequence(
      withTiming(0.9, { duration: 70, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 7, stiffness: 220, mass: 0.7 }),
    );
    burst.value = 0;
    burst.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    glow.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(0.4, { duration: 640, easing: Easing.out(Easing.quad) }),
    );
  };

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.value, [0, 1], [0.3, 0.14]),
    transform: [{ scale: interpolate(halo.value, [0, 1], [1, 1.14]) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0.35, 0.95], [1, 1.16]) }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.12, 1], [0, 0.75, 0]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [0.94, 1.7]) }],
  }));
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={strike}
      style={{ alignItems: "center", justifyContent: "center", width: 260, height: 260 }}
    >
      {/* slow saffron breathing halo — the artifact rests in it */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", width: 226, height: 226, borderRadius: radius.chip, backgroundColor: color.saffron },
          haloStyle,
        ]}
      />
      {/* the glowing gold bed — flares on each strike */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", width: 208, height: 208, borderRadius: radius.chip, backgroundColor: color.goldHi },
          glowStyle,
        ]}
      />
      {/* the ring-burst thrown outward on each strike */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: 176,
            height: 176,
            borderRadius: radius.chip,
            borderWidth: 3,
            borderColor: color.goldHi,
          },
          burstStyle,
        ]}
      />
      <Animated.View style={faceStyle}>
        <LinearGradient
          colors={goldGradient}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.8, y: 1.2 }}
          style={{
            width: 176,
            height: 176,
            borderRadius: radius.chip,
            alignItems: "center",
            justifyContent: "center",
            gap: space.xs,
            borderWidth: 1,
            borderColor: "rgba(255,240,200,0.55)", // a fine jewelled rim
            shadowColor: color.gold,
            shadowOpacity: 0.6,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 0 },
            elevation: 14,
          }}
        >
          {done ? (
            <>
              <DiyaIcon size={44} />
              <T variant="bodyBold" style={{ color: "#241503" }}>
                {t("jap_start_again")}
              </T>
            </>
          ) : (
            <T variant="display" style={{ color: "#241503", fontSize: 40 }}>
              ॐ
            </T>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
