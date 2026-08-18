/**
 * The reward moment (owner ask 2026-08-10) — "you earned N Fit Points" shown
 * when an activity completes. Two pieces, one look:
 *
 *   PointsEarned  — the gold "+N फिट अंक" block. Drops into a completion screen
 *                   that already exists (workout, meditation) beside its stats.
 *   RewardOverlay — a full-screen modal wrapping the same block with the diya +
 *                   burst, for surfaces that have no completion screen of their
 *                   own (jap, sleep are tabs, not pushed flows).
 *
 * The number comes from src/lib/points.ts `earnSince` (a server-side diff), so
 * this component only DISPLAYS — it never scores. `earned == null` (guest /
 * offline) shows the celebration without a number; `earned === 0` shows the
 * honest "already claimed today" line (the daily cap was already reached).
 */
import React from "react";
import { Modal, View, type StyleProp, type ViewStyle } from "react-native";
import { B, T } from "./Text";
import { Button } from "./Button";
import { AnimatedNumber } from "./AnimatedNumber";
import { TrinityMark } from "./Purna";
import { CosmicSky } from "./CosmicSky";
import { GoldGlowProvider } from "./GoldGlow";
import { GoldWash } from "./GoldWash";
import { Reveal } from "./Reveal";
import { color, radius, space } from "./tokens";
import { useI18n, type StringKey } from "../lib/i18n";

interface PointsEarnedProps {
  /** Points this activity added today (>= 0), or null when unmeasured. */
  earned: number | null;
  /** All-time total after, for the running-total line. null hides it. */
  total: number | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * The "+N फिट अंक" block: a gold-tinted chip with the earn counting up from 0
 * and the running total beneath. Renders nothing at all when there is neither a
 * number nor a total (a guest completing offline still gets the diya, just no
 * points line — matching how the Home card stays silent for guests).
 */
export function PointsEarned({ earned, total, style }: PointsEarnedProps) {
  const { t } = useI18n();
  if (earned == null && total == null) return null;

  return (
    <View
      style={[
        {
          alignItems: "center",
          gap: space.xs,
          paddingVertical: space.md,
          paddingHorizontal: space.xxl,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: "rgba(217,164,65,0.28)",
          backgroundColor: "rgba(217,164,65,0.06)",
        },
        style,
      ]}
    >
      {earned != null && earned > 0 ? (
        <>
          <T variant="eyebrow" tone="gold">
            {t("reward_earned")}
          </T>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.xs }}>
            <AnimatedNumber
              value={earned}
              from={0}
              tone="gold"
              format={(n) => `+${Math.round(n)}`}
              style={{ fontSize: 46, fontWeight: "800", fontVariant: ["tabular-nums"], lineHeight: 52 }}
            />
            <T variant="bodyBold" tone="gold">
              {t("points_label")}
            </T>
          </View>
        </>
      ) : earned === 0 ? (
        <T variant="caption" tone="muted" style={{ textAlign: "center" }}>
          {t("reward_capped")}
        </T>
      ) : null}

      {total != null ? (
        <T variant="caption" tone="muted">
          {t("reward_total").replace("{n}", String(total))}
        </T>
      ) : null}
    </View>
  );
}

interface RewardOverlayProps {
  visible: boolean;
  /** Headline (e.g. jap_complete, sleep_reward_title). */
  titleKey: StringKey;
  /** Optional gentle line under the headline. */
  bodyKey?: StringKey;
  earned: number | null;
  total: number | null;
  onDone: () => void;
}

/**
 * Full-screen reward for the tab surfaces (jap, sleep). A transparent Modal so
 * it floats over the tab bar as its own "screen"; the diya lights and the burst
 * radiates exactly as on the workout/meditation completion screens, so the
 * reward reads identically everywhere. Android hardware-back closes it (=Done).
 */
export function RewardOverlay({ visible, titleKey, bodyKey, earned, total, onDone }: RewardOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      {/* a Modal is its own window — the root glow host is BEHIND it, so this
          surface hosts its own; the nearest provider wins */}
      <GoldGlowProvider>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(9,7,4,0.97)",
          alignItems: "center",
          justifyContent: "center",
          padding: space.xl,
          gap: space.md,
        }}
      >
        {/* the universe behind the reward — every accomplishment lands under
            the same night sky as Purna (owner ask 2026-08-18) */}
        <CosmicSky />
        {/* the app-wide completion glow — the modal opening is the trigger */}
        <GoldWash />
        {/* the Purna trinity — every reward screen speaks the ceremony's
            language now (owner 2026-08-18), with the haptic burst */}
        <TrinityMark size={180} celebrate />
        {/* copy + reward LIFT in after the diya catches — the same one grammar
            of completion the workout screen speaks (mockup .lift stagger) */}
        <Reveal lift delay={640}>
          <B k={titleKey} variant="h1" center />
        </Reveal>
        {bodyKey ? (
          <Reveal lift delay={760}>
            <B k={bodyKey} variant="body" tone="muted" center />
          </Reveal>
        ) : null}
        <Reveal lift delay={920} style={{ alignItems: "center" }}>
          <PointsEarned earned={earned} total={total} style={{ marginTop: space.sm }} />
        </Reveal>
        <Reveal lift delay={1080} style={{ width: "100%", maxWidth: 420, marginTop: space.lg }}>
          <Button k="done" onPress={onDone} />
        </Reveal>
      </View>
      </GoldGlowProvider>
    </Modal>
  );
}

// Kept for callers that only need the accent color reference.
export const rewardAccent = color.gold;
