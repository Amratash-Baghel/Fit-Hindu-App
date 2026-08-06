/** Screen wrapper — safe area + ground color (ink, or night for sleep). */
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, space } from "./tokens";
import { Reveal } from "./Reveal";

interface Props {
  children: React.ReactNode;
  night?: boolean;
  /** scrollable content (default) vs fixed layout */
  scroll?: boolean;
  /** Gentle fade+rise as the screen mounts (docs/specs/ui-polish.md slice F) —
   *  the whole app now assembles in instead of snapping. Opt out for a surface
   *  that manages its own entrance (rare). No-ops on web / reduce-motion. */
  entrance?: boolean;
}

export function Screen({ children, night, scroll = true, entrance = true }: Props) {
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

  const inner = scroll ? (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[pad, { gap: space.md }]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, backgroundColor: bg }, pad]}>{children}</View>
  );

  if (!entrance) {
    return scroll ? inner : <View style={{ flex: 1, backgroundColor: bg }}>{inner}</View>;
  }
  // A short rise (8dp) rather than the default 12 — a whole screen wants a
  // quieter entrance than a single card.
  return (
    <Reveal distance={8} style={{ flex: 1, backgroundColor: bg }}>
      {inner}
    </Reveal>
  );
}
