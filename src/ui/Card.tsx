/** Card + Chip — the workhorse surfaces from the approved mockups. */
import React from "react";
import { Pressable, View, type ViewStyle, type StyleProp } from "react-native";
import { color, radius, space } from "./tokens";
import { T } from "./Text";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  night?: boolean; // sleep-section mood
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, night, style }: CardProps) {
  const base: ViewStyle = {
    backgroundColor: night ? color.nightSurface : color.surface,
    borderColor: night ? color.nightLine : color.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.lg,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
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
    </Pressable>
  );
}
