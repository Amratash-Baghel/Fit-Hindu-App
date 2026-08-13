/**
 * EmberCard — THE warm hero surface (redesign, "one material language"):
 * the ember gradient in a hairline frame, optionally carrying the ॐ watermark
 * and the slow gold sheen. Home's shloka card, the streak hero, the weekly
 * mirror and every future "special" card are this one material — screens
 * stopped hand-copying the gradient hexes when `ember` moved into tokens;
 * this component retires the copied LAYOUT too.
 */
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, ember, radius, space } from "./tokens";
import { Shimmer } from "./Shimmer";
import { OmGlyph } from "./icons";

interface Props {
  children: React.ReactNode;
  /** faint ॐ in the top-right corner (the shloka-card signature) */
  watermark?: boolean;
  /** slow gold glint sweep — reserve for the day's hero moments */
  sheen?: boolean;
  /** default true; pass false when children manage their own padding */
  pad?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmberCard({ children, watermark, sheen, pad = true, style }: Props) {
  return (
    <View
      style={[
        {
          borderRadius: radius.card,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: ember.line,
          backgroundColor: color.surface,
        },
        style,
      ]}
    >
      <LinearGradient colors={[...ember.gradient]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}>
        <View style={pad ? { padding: space.lg } : undefined}>
          {watermark ? (
            <View style={{ position: "absolute", right: -6, top: -26, opacity: 0.08 }}>
              <OmGlyph size={86} color={color.gold} />
            </View>
          ) : null}
          {children}
        </View>
      </LinearGradient>
      {sheen ? <Shimmer mode="sheen" tint={color.goldHi} peak={0.09} /> : null}
    </View>
  );
}
