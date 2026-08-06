/**
 * Reveal — a fade + gentle rise on mount, with an optional `delay` so a list can
 * stagger its children in (docs/specs/ui-polish.md slice A). The building block
 * for "the screen assembles itself" instead of snapping in all at once.
 *
 * Safety: on web / reduce-motion the content starts fully visible and never
 * animates (the gate is false, and a hidden-then-reveal that relied on
 * Reanimated could get stuck hidden on web here). On native it rises in. Either
 * way the final state is the same visible frame.
 */
import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { duration, easing, useMotion } from "./motion";

interface Props {
  children: React.ReactNode;
  /** Stagger offset in ms. */
  delay?: number;
  /** How far it rises from (dp). */
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

export function Reveal({ children, delay = 0, distance = 12, style }: Props) {
  const enabled = useMotion();
  const t = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) return;
    t.value = withDelay(delay, withTiming(1, { duration: duration.slow, easing: easing.out }));
  }, [enabled, delay, t]);

  const style2 = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: interpolate(t.value, [0, 1], [distance, 0]) }],
  }));

  return <Animated.View style={[style, style2]}>{children}</Animated.View>;
}
