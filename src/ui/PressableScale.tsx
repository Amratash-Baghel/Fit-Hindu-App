/**
 * PressableScale — a Pressable that springs down slightly on press and fires the
 * press/select haptic, so EVERY tappable surface in the app shares one
 * consistent, tactile response (docs/specs/ui-polish.md slices A + B). Button
 * and the pressable Card are built on it, which is what finally makes the whole
 * app feel alive under the thumb instead of only a few hand-wired spots.
 *
 * On web / reduce-motion the scale is skipped (the motion gate is false, and
 * Reanimated is inert on web here anyway) — but the haptic and onPress still
 * fire, so behaviour is identical, only the dip is gone.
 */
/* eslint-disable react-hooks/immutability --
   This component drives a Reanimated shared value (`.value = …`), which is
   Reanimated's API but which the React-Compiler immutability rule doesn't
   model. Same precedent as CeremonySplash. */
import React from "react";
import { Pressable, type StyleProp, type ViewStyle, type AccessibilityRole } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { spring, useMotion } from "./motion";
import { feedback } from "../lib/feedback";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Which haptic to fire on press. `false` suppresses it — use when the handler
   *  already fires a stronger semantic haptic (complete/success/error). */
  haptic?: "press" | "select" | false;
  /** How far to dip. Defaults to the button depth; cards pass a shallower value. */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  hitSlop?: number;
}

export function PressableScale({
  children,
  onPress,
  disabled,
  haptic = "press",
  scaleTo = 0.96,
  style,
  accessibilityRole = "button",
  accessibilityLabel,
  hitSlop,
}: Props) {
  const enabled = useMotion();
  const s = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        if (enabled) s.value = withSpring(scaleTo, spring.press);
      }}
      onPressOut={() => {
        if (enabled) s.value = withSpring(1, spring.press);
      }}
      onPress={() => {
        if (haptic === "press") feedback.press();
        else if (haptic === "select") feedback.select();
        onPress?.();
      }}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
