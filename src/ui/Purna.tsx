/**
 * Purna — the once-a-day "all three pillars done" ceremony (redesign,
 * docs/specs/redesign-bms.md "the day made whole" / "Purna — the day
 * completes"). When Body, Mind and Soul have all closed, Home holds one
 * ceremony: the three pillar rings DRAW TOGETHER into a single interlocked
 * trinity, ॐ lands at the centre, a warm gold bloom breathes behind, and the
 * reward-burst haptic rides the moment (no spark burst — owner 2026-08-18:
 * the ceremony is the rings and the light, exactly the approved artifact).
 * Tap anywhere to continue — the hero then settles into its quiet gold state
 * until midnight IST (the caller owns that state).
 *
 * The composition itself is TrinityMark, exported below — every reward
 * screen (workout, meditation, jap/sleep/diet overlay) renders the same mark.
 *
 * It celebrates the ROUTINE — body·mind·soul done — never worship, and is
 * never a paywall or a points-farm (compliance fence-line). Once per IST day.
 *
 * Engineering contract: all motion is transform/opacity on Animated.Views
 * wrapping static SVG, on the UI thread. reduce-motion / web get the finished
 * composition (and a single firm haptic instead of the ramp).
 */
 
import React, { useEffect } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { color, pillar, scrim, space, type PillarKey } from "./tokens";
import { T } from "./Text";
import { CosmicSky } from "./CosmicSky";
import { GoldGlowProvider } from "./GoldGlow";
import { GoldWash } from "./GoldWash";
import { useMotion } from "./motion";
import { feedback } from "../lib/feedback";
import { useI18n } from "../lib/i18n";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

/** Stage geometry (the artifact's 210×210 trinity). */
const STAGE = 210;
const RING_R = 38;
const RING_W = 3.4;
const RING_BOX = RING_R * 2 + RING_W * 2; // svg box for one ring

/** Where each ring starts (the Home stack, vertical) and lands (the trinity). */
const RINGS: { k: PillarKey; from: { x: number; y: number }; to: { x: number; y: number } }[] = [
  { k: "body", from: { x: 105, y: 25 }, to: { x: 85, y: 90 } },
  { k: "mind", from: { x: 105, y: 105 }, to: { x: 125, y: 90 } },
  { k: "soul", from: { x: 105, y: 185 }, to: { x: 105, y: 122 } },
];

export function Purna({ visible, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      {/* own window, own glow host (see RewardOverlay) */}
      <GoldGlowProvider>
        <PurnaStage onDismiss={onDismiss} />
      </GoldGlowProvider>
    </Modal>
  );
}

/**
 * TrinityMark — the Purna composition as a drop-in reward mark (owner ask
 * 2026-08-18: every reward screen reads like the Purna ceremony, not a diya
 * with a spark burst): the three pillar rings draw together into the
 * interlocked trinity, ॐ lands at the centre inside the gold outer circle,
 * and a warm gold bloom breathes behind — forever, gently. Purna itself and
 * every completion screen (workout, meditation, the jap/sleep/diet reward
 * overlay) render THIS, so "done" is one mark everywhere.
 *
 * `celebrate` fires the reward-burst haptic ramp on mount (workout + the
 * overlay opt in; meditation stays calm). Web / reduce-motion render the
 * finished composition. All motion is transform/opacity on the UI thread.
 */
export function TrinityMark({
  size = 210,
  celebrate = false,
}: {
  /** rendered box — the 210 stage scales to fit */
  size?: number;
  celebrate?: boolean;
}) {
  const enabled = useMotion();

  const conv = useSharedValue(enabled ? 0 : 1); // rings converge
  const om = useSharedValue(enabled ? 0 : 1); // ॐ + outer circle land
  const breath = useSharedValue(0); // the slow gold breath

  useEffect(() => {
    if (!enabled) return;
    const easeOut = Easing.out(Easing.cubic);
    conv.value = withDelay(240, withTiming(1, { duration: 900, easing: easeOut }));
    om.value = withDelay(1060, withTiming(1, { duration: 620, easing: easeOut }));
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    // shared values are stable refs; fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // The haptic twin of the mark landing — same grammar as every completion.
  useEffect(() => {
    if (!celebrate) return;
    return feedback.rewardBurst({ ramp: enabled });
  }, [celebrate, enabled]);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + breath.value * 0.4,
    transform: [{ scale: 0.92 + breath.value * 0.14 }],
  }));
  const outerStyle = useAnimatedStyle(() => ({ opacity: om.value }));
  const omStyle = useAnimatedStyle(() => ({
    opacity: om.value,
    transform: [{ scale: interpolate(om.value, [0, 1], [0.7, 1]) }],
  }));

  const k = size / STAGE;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* the warm bloom behind the mark — one slow gold breath */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: size * 1.33,
            height: size * 1.33,
            borderRadius: (size * 1.33) / 2,
            backgroundColor: pillar.soulWash,
          },
          bloomStyle,
        ]}
      />
      <View style={{ width: STAGE, height: STAGE, transform: [{ scale: k }] }}>
        {/* the outer circle that holds the trinity — lands with the ॐ */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute" }, outerStyle]}>
          <Svg width={STAGE} height={STAGE} viewBox={`0 0 ${STAGE} ${STAGE}`}>
            <Circle cx={105} cy={105} r={97} fill="none" stroke={color.gold} strokeWidth={2.4} opacity={0.85} />
            <Circle cx={105} cy={105} r={90} fill="none" stroke={color.goldHi} strokeWidth={0.8} opacity={0.4} />
          </Svg>
        </Animated.View>

        {/* the three pillar rings drawing together into the trinity */}
        {RINGS.map((r) => (
          <ConvergingRing key={r.k} k={r.k} from={r.from} to={r.to} conv={conv} />
        ))}

        {/* ॐ at the centre */}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
            omStyle,
          ]}
        >
          <T style={{ fontSize: 34, lineHeight: 44, fontWeight: "700", color: color.goldHi }}>ॐ</T>
        </Animated.View>
      </View>
    </View>
  );
}

/** Mounted fresh each time the Modal opens, so the ceremony plays from zero. */
function PurnaStage({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const enabled = useMotion();

  const wordsIn = useSharedValue(enabled ? 0 : 1); // copy rises

  useEffect(() => {
    // The haptic twin of the ceremony — the same reward-burst grammar as every
    // completion (ramp collapses to one firm hit when motion is off) — plus the
    // completion ring: the day resolving is the one moment that gets both.
    feedback.completeChime();
    const cancel = feedback.rewardBurst({ ramp: enabled });
    if (!enabled) return cancel;
    wordsIn.value = withDelay(1260, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    return cancel;
    // shared values are stable refs; fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const wordsStyle = useAnimatedStyle(() => ({
    opacity: wordsIn.value,
    transform: [{ translateY: interpolate(wordsIn.value, [0, 1], [10, 0]) }],
  }));

  return (
    <Pressable
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel={t("purna_title")}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: space.xl,
        backgroundColor: scrim,
      }}
    >
      {/* the universe the day resolves into — deep-space veil, twinkling
          stars, slow orbits (owner ask 2026-08-18: the space theme) */}
      <CosmicSky />

      {/* the app-wide completion glow — the ceremony opening is the trigger */}
      <GoldWash />

      <View style={{ alignItems: "center" }}>
        {/* the trinity — rings converge, ॐ lands, the gold bloom breathes */}
        <TrinityMark />

        <Animated.View style={[{ alignItems: "center" }, wordsStyle]}>
          <T variant="h1" tone="gold" style={{ marginTop: space.lg, textAlign: "center" }}>
            {t("purna_title")}
          </T>
          <T variant="body" tone="soft" style={{ marginTop: space.xs, textAlign: "center" }}>
            {t("purna_body")}
          </T>
          <T variant="caption" tone="muted" style={{ marginTop: space.xl }}>
            {t("purna_tap")}
          </T>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** One pillar ring travelling from its Home-stack spot into the trinity. */
function ConvergingRing({
  k,
  from,
  to,
  conv,
}: {
  k: PillarKey;
  from: { x: number; y: number };
  to: { x: number; y: number };
  conv: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(conv.value, [0, 0.25, 1], [0, 0.92, 0.92]),
    transform: [
      { translateX: interpolate(conv.value, [0, 1], [from.x, to.x]) - RING_BOX / 2 },
      { translateY: interpolate(conv.value, [0, 1], [from.y, to.y]) - RING_BOX / 2 },
      { scale: interpolate(conv.value, [0, 1], [0.82, 1]) },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute" }, style]}>
      <Svg width={RING_BOX} height={RING_BOX} viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}>
        <Circle
          cx={RING_BOX / 2}
          cy={RING_BOX / 2}
          r={RING_R}
          fill="none"
          stroke={pillar[k]}
          strokeWidth={RING_W}
        />
      </Svg>
    </Animated.View>
  );
}
