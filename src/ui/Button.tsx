/**
 * Buttons. Per the locked design: GOLD is reserved for the primary action —
 * nothing else in a screen may be gold. Ghost is the quiet secondary.
 */
import React from "react";
import { Pressable, View, type ViewStyle, type StyleProp } from "react-native";
import { color, radius, space, tapTarget } from "./tokens";
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

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: tapTarget,
          borderRadius: radius.button,
          paddingVertical: space.md,
          paddingHorizontal: space.lg,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isGold ? color.gold : "transparent",
          borderWidth: isGold ? 0 : 1,
          borderColor: color.line,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <T variant="bodyBold" style={{ color: isGold ? "#241503" : color.muted }}>
        {t(k)}
      </T>
      {sub ? (
        <T variant="caption" style={{ color: isGold ? "#241503AA" : color.muted }}>
          {sub}
        </T>
      ) : null}
    </Pressable>
  );
}

/** Full-width footer slot for the screen's single primary action. */
export function FooterAction({ children }: { children: React.ReactNode }) {
  return <View style={{ padding: space.lg, gap: space.sm }}>{children}</View>;
}
