/**
 * FlipCard — a two-faced card that does a 3D Y-axis flip from `front` to `back`
 * when `flipped` turns true. Built for the daily-blessing "tap to reveal" tile
 * (owner ask 2026-08-08: the reveal should FLIP, not just fade-swap), but kept
 * generic so any reveal can reuse it.
 *
 * Mechanics: the front face lives in normal flow and defines the card's height;
 * the back face is absolutely overlaid. Each face hides its own backface, so at
 * any rotation exactly one face is visible. A `perspective` transform gives the
 * flip real depth instead of a flat squash.
 *
 * Safety: on web / reduce-motion (useMotion() === false, where Reanimated does
 * not drive transforms in this project) we skip the 3D entirely and render the
 * correct face outright — the preview and reduce-motion users still see the
 * right content, just without the spin.
 */
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useMotion } from "./motion";
import { feedback } from "../lib/feedback";

interface Props {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped: boolean;
  /** Tap handler — active while showing the front (the reveal trigger), and
   *  also on the back when `backTappable` is set. */
  onPress?: () => void;
  /** Opt-in: keep responding to taps on the REVEALED face too (the blessing
   *  folds itself closed for replay — WIP affordance, owner ask 2026-08-18).
   *  Default false, so reveal-style callers keep an inert back face. */
  backTappable?: boolean;
  haptic?: "press" | "select" | false;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function FlipCard({ front, back, flipped, onPress, backTappable = false, haptic = false, accessibilityLabel, style }: Props) {
  const enabled = useMotion();
  const p = useSharedValue(flipped ? 1 : 0);
  const inert = !onPress || (flipped && !backTappable);

  useEffect(() => {
    if (!enabled) {
      p.value = flipped ? 1 : 0;
      return;
    }
    // A touch slow (620ms) and eased so the turn is savoured, not snapped.
    p.value = withTiming(flipped ? 1 : 0, { duration: 620, easing: Easing.inOut(Easing.cubic) });
  }, [enabled, flipped, p]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(p.value, [0, 1], [0, 180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(p.value, [0, 1], [180, 360])}deg` }],
  }));

  // Web / reduce-motion: no 3D — just show the right face.
  if (!enabled) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={inert}
        onPress={() => {
          if (haptic === "press") feedback.press();
          else if (haptic === "select") feedback.select();
          onPress?.();
        }}
        style={style}
      >
        {flipped ? back : front}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={inert}
      onPress={() => {
        if (haptic === "press") feedback.press();
        else if (haptic === "select") feedback.select();
        onPress?.();
      }}
      style={style}
    >
      <View>
        <Animated.View style={[styles.face, frontStyle]}>{front}</Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.face, backStyle]}>{back}</Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { backfaceVisibility: "hidden" },
});
