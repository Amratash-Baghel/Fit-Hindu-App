/**
 * Buttons. Per the locked design: GOLD is reserved for the primary action —
 * nothing else in a screen may be gold. The gold face is the mockup's
 * diya-flame gradient (goldHi → gold → deep) with a soft glow shadow.
 * Ghost is the quiet secondary.
 */
import React from "react";
import { Pressable, View, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, radius, space, tapTarget, goldGradient } from "./tokens";
import { T } from "./Text";
import { useI18n, type StringKey } from "../lib/i18n";

interface Props {
  k: StringKey;
  onPress: () => void;
  kind?: "gold" | "ghost";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ k, onPress, kind = "gold", disabled, style }: Props) {
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
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1, borderRadius: radius.button },
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
    </Pressable>
  );
}

/** Full-width footer slot for the screen's single primary action. */
export function FooterAction({ children }: { children: React.ReactNode }) {
  return <View style={{ padding: space.lg, gap: space.sm }}>{children}</View>;
}
