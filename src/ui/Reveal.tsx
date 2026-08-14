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
  /** The mockup's `.lift` — the card rises AND folds up out of the surface
   *  (perspective + a 9° rotateX from its base), the "3D scroll" grammar the
   *  Home cards use. Defaults the rise to 20dp like the mockup. */
  lift?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Reveal({ children, delay = 0, distance, lift = false, style }: Props) {
  const enabled = useMotion();
  const t = useSharedValue(enabled ? 0 : 1);
  const rise = distance ?? (lift ? 20 : 12);

  useEffect(() => {
    if (!enabled) return;
    t.value = withDelay(
      delay,
      withTiming(1, { duration: lift ? duration.slow + 200 : duration.slow, easing: easing.out }),
    );
  }, [enabled, delay, lift, t]);

  const style2 = useAnimatedStyle(() => {
    const ty = interpolate(t.value, [0, 1], [rise, 0]);
    if (!lift) {
      return { opacity: t.value, transform: [{ translateY: ty }] };
    }
    // RN rotates about the centre; at 9° over a card the base drift is under a
    // couple of dp, so the fold reads as rising from its base without any
    // pivot correction.
    return {
      opacity: t.value,
      transform: [
        { perspective: 900 },
        { translateY: ty },
        { rotateX: `${interpolate(t.value, [0, 1], [9, 0])}deg` },
      ],
    };
  });

  return <Animated.View style={[style, style2]}>{children}</Animated.View>;
}
