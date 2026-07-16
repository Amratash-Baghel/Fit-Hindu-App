/**
 * Checkbox — a tap row with a saffron check box + inline label. Used for the
 * DPDP consent step (unticked by default per spec).
 */
import React from "react";
import { Pressable, View } from "react-native";
import { color, radius, space, tapTarget } from "./tokens";
import { T } from "./Text";

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode; // label content (already-localised)
}

export function Checkbox({ checked, onToggle, children }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md, minHeight: tapTarget }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          marginTop: 2,
          borderRadius: radius.button / 2,
          borderWidth: 1,
          borderColor: checked ? color.saffron : color.line,
          backgroundColor: checked ? "rgba(240,118,30,0.16)" : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? (
          <T variant="caption" tone="saffron" style={{ fontWeight: "800" }}>
            ✓
          </T>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}
