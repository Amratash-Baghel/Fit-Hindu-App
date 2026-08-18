/**
 * Buttons. Per the locked design: GOLD is reserved for the primary action —
 * nothing else in a screen may be gold. The gold face is the mockup's
 * diya-flame gradient (goldHi → gold → deep) with a soft glow shadow.
 * Ghost is the quiet secondary.
 *
 * Press feel + haptic come from PressableScale (docs/specs/ui-polish.md), so a
 * button dips and buzzes consistently with every other tappable surface. A
 * button whose handler already fires a stronger semantic haptic
 * (complete/success/error) passes `haptic={false}` to avoid a double buzz.
 */
import React, { useState } from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space, tapTarget, goldGradient } from "./tokens";
import { pressScale } from "./motion";
import { PressableScale } from "./PressableScale";
import { GoldGlow } from "./GoldBurst";
import { T } from "./Text";
import { feedback } from "../lib/feedback";
import { useI18n, type StringKey } from "../lib/i18n";

interface Props {
  k: StringKey;
  onPress: () => void;
  kind?: "gold" | "ghost";
  disabled?: boolean;
  /** Suppress the press haptic when the handler fires its own (e.g. error). */
  haptic?: "press" | false;
  /** The soft gold light-burst + firm haptic on the primary action (owner ask
   *  2026-08-18: the blessing-reveal glow, not a particle release). On by
   *  default for gold; pass false to quiet a gold button that is really just
   *  navigation. Ghost never bursts. */
  burst?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ k, onPress, kind = "gold", disabled, haptic = "press", burst, style }: Props) {
  const { t, tSub } = useI18n();
  const sub = tSub(k);
  const isGold = kind === "gold";
  // Gold is the one primary action per screen — it gets the spark burst by
  // default; a gold "back"/"skip" can opt out with burst={false}.
  const burstOn = isGold && !disabled && burst !== false;
  const [burstTick, setBurstTick] = useState(0);

  const handlePress = () => {
    if (burstOn) setBurstTick((n) => n + 1);
    // Fire the firm gold haptic ONLY when the caller hasn't taken haptics over
    // (haptic={false} means its handler fires complete()/success() itself).
    if (isGold && haptic !== false && !disabled) feedback.goldPress();
    onPress();
  };

  const inner = (
    <>
      <T variant="bodyBold" style={{ color: isGold ? "#241503" : color.muted }}>
        {t(k)}
      </T>
      {sub ? (
        <T variant="caption" style={{ color: isGold ? "#241503AA" : color.muted }}>
          {sub}
        </T>
      ) : null}
    </>
  );

  return (
    <PressableScale
      disabled={disabled}
      onPress={handlePress}
      // Gold owns its haptic via handlePress (feedback.goldPress); tell
      // PressableScale to stay silent so the two never double-buzz. Ghost keeps
      // the ordinary press tick.
      haptic={disabled || isGold ? false : haptic}
      scaleTo={pressScale.button}
      // the gold CTA presses INTO the surface like pressed metal (mockup .g3d.down)
      sink={isGold && !disabled ? 2.5 : 0}
      // Gold is the primary action — it gets the expanding-ring bloom on every
      // press (owner ask 2026-08-08). Ghost stays quiet, a dip only.
      bloom={isGold && !disabled}
      bloomColor={color.goldHi}
      bloomRadius={radius.button}
      style={[
        { opacity: disabled ? 0.5 : 1, borderRadius: radius.button },
        isGold
          ? {
              shadowColor: color.gold,
              shadowOpacity: 0.28,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 5 },
              elevation: 6,
            }
          : null,
        style,
      ]}
    >
      {isGold ? (
        <LinearGradient
          colors={goldGradient}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.7, y: 1.4 }}
          style={{
            minHeight: tapTarget,
            borderRadius: radius.button,
            paddingVertical: space.md,
            paddingHorizontal: space.lg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={{
            minHeight: tapTarget,
            borderRadius: radius.button,
            paddingVertical: space.md,
            paddingHorizontal: space.lg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: color.line,
          }}
        >
          {inner}
        </View>
      )}
      {/* the soft gold light on press — the blessing wash, local to the
          button; one-shot, fires on every gold action */}
      {burstOn ? <GoldGlow trigger={burstTick} /> : null}
    </PressableScale>
  );
}

/**
 * Full-width footer slot for the screen's single primary action.
 *
 * Used mostly on `scroll={false}` screens (the session player, the completion
 * screen), which sit outside Screen's own scroll padding — so this needs its
 * OWN bottom inset, or its button sits under the Android system nav bar,
 * unclickable, exactly like the tab bar did before this fix.
 */
export function FooterAction({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.lg, gap: space.sm }}>
      {children}
    </View>
  );
}
