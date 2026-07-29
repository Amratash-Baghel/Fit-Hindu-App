/**
 * Toggle — the on/off switch for settings rows. Saffron track when on (the
 * action/selection colour; gold stays reserved for the primary button + streak).
 *
 * Instant snap, no animation: this sits in a static settings list, never in a
 * scrolling row, so an Animated driver would be cost for no benefit on low-end
 * Android. The knob just aligns left/right.
 */
import React from "react";
import { Pressable, View } from "react-native";
import { color, radius } from "./tokens";

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      aria-checked={value}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => ({
        width: 48,
        height: 28,
        borderRadius: radius.chip,
        padding: 3,
        borderWidth: 1,
        borderColor: value ? color.saffron : color.line,
        backgroundColor: value ? color.saffron : color.surface2,
        alignItems: value ? "flex-end" : "flex-start",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: radius.chip,
          backgroundColor: value ? "#241503" : color.muted,
        }}
      />
    </Pressable>
  );
}
