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
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { spring, useMotion } from "./motion";
import { color } from "./tokens";
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
  /** Extra downward translate (dp) on press — the mockup's 3D "press into the
   *  surface" sink for the metal gold button/coin. 0 = flat shrink only. */
  sink?: number;
  /**
   * The press "bloom" — a gold ring that expands out from the surface and fades
   * on every press, the visible twin of the haptic buzz (the ring the owner
   * asked for on every gold button, docs/specs/ui-polish.md). Off by default so
   * quiet surfaces stay quiet; the gold Button opts in. `bloomRadius` matches the
   * surface's own corner radius so the ring hugs its shape.
   */
  bloom?: boolean;
  bloomColor?: string;
  bloomRadius?: number;
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
  sink = 0,
  bloom = false,
  bloomColor = color.goldHi,
  bloomRadius = 14,
  style,
  accessibilityRole = "button",
  accessibilityLabel,
  hitSlop,
}: Props) {
  const enabled = useMotion();
  const s = useSharedValue(1);
  // 0 = resting (invisible), 1 = fully expanded + faded. Re-fired on each press.
  const b = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      // sink rides the same press value — deepest at the pressed scale, 0 at rest
      { translateY: sink ? interpolate(s.value, [scaleTo, 1], [sink, 0]) : 0 },
      { scale: s.value },
    ],
  }));
  // the mockup's `bloom` keyframes exactly (bms-redesign-v2 .bloom.go):
  // 0% opacity .7 / scale .95 → 100% opacity 0 / scale 1.26, .6s ease-out
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(b.value, [0, 1], [0.7, 0]),
    transform: [{ scale: interpolate(b.value, [0, 1], [0.95, 1.26]) }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        if (!enabled) return;
        s.value = withSpring(scaleTo, spring.press);
        if (bloom) {
          b.value = 0;
          // .6s ease-out — the mockup's bloom timing
          b.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
        }
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
      {bloom ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
            {
              borderRadius: bloomRadius + 2,
              borderWidth: 2,
              borderColor: bloomColor,
            },
            bloomStyle,
          ]}
        />
      ) : null}
      {children}
    </AnimatedPressable>
  );
}
