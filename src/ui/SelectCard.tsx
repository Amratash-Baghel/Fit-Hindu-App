/**
 * SelectCard — a selectable option row (the onboarding/questionnaire choice
 * primitive). Wraps Card with the standard saffron selected-state so screens
 * don't repeat the border/tint values.
 */
import React from "react";
import { View } from "react-native";
import { color, space } from "./tokens";
import { Card } from "./Card";
import { T } from "./Text";

interface SelectCardProps {
  /** already-localised title */
  title: string;
  /** already-localised sub-caption (mixed mode), optional */
  sub?: string | null;
  selected?: boolean;
  onPress: () => void;
}

export function SelectCard({ title, sub, selected, onPress }: SelectCardProps) {
  return (
    <Card
      onPress={onPress}
      style={selected ? { borderColor: color.saffron, backgroundColor: "rgba(240,118,30,0.10)" } : undefined}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <T variant="bodyBold" tone={selected ? "saffron" : "cream"}>
            {title}
          </T>
          {sub ? (
            <T variant="caption" tone="muted">
              {sub}
            </T>
          ) : null}
        </View>
        {selected ? (
          <T variant="bodyBold" tone="saffron" style={{ marginLeft: space.md }}>
            ✓
          </T>
        ) : null}
      </View>
    </Card>
  );
}
