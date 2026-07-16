import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Screen,
  Card,
  Chip,
  Button,
  B,
  T,
  DiyaIcon,
  color,
  goldGradient,
  radius,
  space,
} from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listMantras, getTodayDevotional, type MantraWithDeity } from "../../src/lib/content";
import { logActivity } from "../../src/lib/activity";

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
      resetMala();
      return;
    }
    const next = countRef.current - 1;
    countRef.current = next;
    setLeft(next);
    if (next === 0 && mantra) {
      // Only a COMPLETED mala is logged (spec) — partial malas aren't persisted in v1.
      logActivity("jap", { deity_id: mantra.deity_id, count: MALA }, mantra.id);
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
    </Screen>
  );
}

/**
 * The tap target: a gold diya face under a slow saffron halo pulse, so the
 * screen breathes while idle. Completion swaps the face for a lit diya.
 */
function JapButton({ done, onPress }: { done: boolean; onPress: () => void }) {
  const { t } = useI18n();
  // Animated.Value is an imperative handle, not render state. A lazy useState
  // initializer gives one stable instance for the component's life without
  // reading a ref during render (react-hooks/refs).
  const [pulse] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const flash = useCallback(() => {
    press.setValue(1);
    Animated.timing(press, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [press]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.1] });
  const faceScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        flash();
        onPress();
      }}
      style={{ alignItems: "center", justifyContent: "center", width: 240, height: 240 }}
    >
      {/* halo — pure decoration, never intercepts the tap */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 210,
          height: 210,
          borderRadius: radius.chip,
          backgroundColor: color.saffron,
          opacity: haloOpacity,
          transform: [{ scale: haloScale }],
        }}
      />
      <Animated.View style={{ transform: [{ scale: faceScale }] }}>
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
            shadowColor: color.gold,
            shadowOpacity: 0.5,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
            elevation: 12,
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
