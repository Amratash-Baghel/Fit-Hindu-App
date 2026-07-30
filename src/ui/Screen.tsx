/** Screen wrapper — safe area + ground color (ink, or night for sleep). */
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, space } from "./tokens";

interface Props {
  children: React.ReactNode;
  night?: boolean;
  /** scrollable content (default) vs fixed layout */
  scroll?: boolean;
}

export function Screen({ children, night, scroll = true }: Props) {
  const insets = useSafeAreaInsets();
  const bg = night ? color.night : color.ink;
  // Android renders edge-to-edge from Expo SDK 54 on — content sits BEHIND the
  // system nav bar (gesture pill or 3-button bar) unless it explicitly reserves
  // that space itself. insets.bottom is that space; omitting it is what left
  // the bottom of every screen unclickable underneath the nav bar.
  const pad = {
    paddingTop: insets.top + space.sm,
    paddingBottom: insets.bottom + space.lg,
    paddingHorizontal: space.lg,
  };
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: bg }, pad]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[pad, { gap: space.md }]}
    >
      {children}
    </ScrollView>
  );
}
