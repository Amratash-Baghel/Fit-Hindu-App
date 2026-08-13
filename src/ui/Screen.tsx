/** Screen wrapper — safe area + ground color (ink, or night for sleep). */
import React from "react";
import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  /** Time-of-day wash (redesign — "a surface that keeps time"): a top-anchored
   *  gradient painted over the ground so Home breathes with the IST day. The
   *  stops come from the `daypart` tokens; it fades to the ground's own alpha-0,
   *  so it dissolves into the same black and never becomes a hard band. */
  wash?: readonly [string, string, ...string[]];
  /** Full-screen decoration ABOVE the content (a GoldWash, a celebration) —
   *  rendered outside the scroll so it never scrolls away or clips. The node
   *  itself must be non-interactive (pointerEvents none). */
  overlay?: React.ReactNode;
}

export function Screen({ children, night, scroll = true, entrance = true, wash, overlay }: Props) {
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

  // The wash sits behind the content, anchored to the top and fixed (outside the
  // ScrollView), so it stays a sky the content scrolls under — not a band that
  // slides away. pointerEvents none so it never eats a tap.
  const washEl = wash ? (
    <LinearGradient
      colors={wash}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
      pointerEvents="none"
    />
  ) : null;

  const inner = scroll ? (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[pad, { gap: space.md }]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad]}>{children}</View>
  );

  // One composition, two frames — a layer added to Screen (wash, fade, overlay
  // slot) can never end up in only one of the entrance branches.
  const frame = { flex: 1, backgroundColor: bg } as const;
  const content = (
    <>
      {washEl}
      {inner}
      {overlay}
    </>
  );

  if (!entrance) return <View style={frame}>{content}</View>;
  // A short rise (8dp) rather than the default 12 — a whole screen wants a
  // quieter entrance than a single card.
  return (
    <Reveal distance={8} style={frame}>
      {content}
    </Reveal>
  );
}
