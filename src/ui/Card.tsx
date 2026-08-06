/** Card + Chip — the workhorse surfaces from the approved mockups. */
import React from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";
import { color, radius, space } from "./tokens";
import { pressScale } from "./motion";
import { PressableScale } from "./PressableScale";
import { T } from "./Text";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  night?: boolean; // sleep-section mood
  /** Which haptic a pressable card fires. Selectable cards pass "select". */
  haptic?: "press" | "select" | false;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, night, haptic = "press", style }: CardProps) {
  const base: ViewStyle = {
    backgroundColor: night ? color.nightSurface : color.surface,
    borderColor: night ? color.nightLine : color.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.lg,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <PressableScale onPress={onPress} haptic={haptic} scaleTo={pressScale.card} style={[base, style]}>
      {children}
    </PressableScale>
  );
}

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ label, active, onPress }: ChipProps) {
  const body = (
    <View
      style={{
        borderRadius: radius.chip,
        borderWidth: 1,
        borderColor: active ? color.saffron : color.line,
        backgroundColor: active ? "rgba(240,118,30,0.14)" : "transparent",
        paddingVertical: space.sm,
        paddingHorizontal: space.lg,
        minHeight: 36,
        justifyContent: "center",
      }}
    >
      <T variant="caption" tone={active ? "saffron" : "muted"} style={active ? { fontWeight: "700" } : undefined}>
        {label}
      </T>
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} haptic="select" scaleTo={pressScale.button}>
      {body}
    </PressableScale>
  );
}
