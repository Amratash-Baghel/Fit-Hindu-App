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
import React from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space, tapTarget, goldGradient } from "./tokens";
import { pressScale } from "./motion";
import { PressableScale } from "./PressableScale";
import { T } from "./Text";
import { useI18n, type StringKey } from "../lib/i18n";

interface Props {
  k: StringKey;
  onPress: () => void;
  kind?: "gold" | "ghost";
  disabled?: boolean;
  /** Suppress the press haptic when the handler fires its own (e.g. error). */
  haptic?: "press" | false;
  style?: StyleProp<ViewStyle>;
}

export function Button({ k, onPress, kind = "gold", disabled, haptic = "press", style }: Props) {
  const { t, tSub } = useI18n();
  const sub = tSub(k);
  const isGold = kind === "gold";

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
      onPress={onPress}
      haptic={disabled ? false : haptic}
      scaleTo={pressScale.button}
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
