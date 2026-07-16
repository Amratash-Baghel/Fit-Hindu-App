/**
 * ProgressDots — step indicator for multi-step flows (onboarding, diet
 * questionnaire). Active dot is saffron and wider.
 */
import React from "react";
import { View } from "react-native";
import { color, space } from "./tokens";

export function ProgressDots({ total, index }: { total: number; index: number }) {
  return (
    <View style={{ flexDirection: "row", gap: space.xs, justifyContent: "center", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            width: i === index ? 20 : 6,
            borderRadius: 999,
            backgroundColor: i === index ? color.saffron : color.line,
          }}
        />
      ))}
    </View>
  );
}
