/**
 * GoldGlow — the demo artifact's gold press-glow, hosted ABOVE the screen
 * (owner ask 2026-08-18: "the exact glow as the app native artifact, on all
 * gold buttons, soft and smooth, with haptics").
 *
 * Why a provider and not a view inside the button: the mockup's `#goldwash`
 * is a sibling of the whole phone frame, so the light spills across the
 * surface. A glow rendered inside the Button is clipped by the first ancestor
 * with overflow hidden — the Screen's ScrollView, a Card, an EmberCard — which
 * is why the earlier in-button version never showed. This host sits at the top
 * of the tree, so the wash always paints over everything.
 *
 * The light itself is the mockup verbatim: the shared GOLD_WASH_RAMP radial,
 * centred on the pressed button, faded in over 20% of a 1.15s ease-out and
 * away across the rest — no travel, no particles, just a soft bloom. The
 * button keeps its own ring bloom + `feedback.goldPress()` haptic, so press,
 * buzz and light land on the same frame.
 *
 * A Modal renders in its own window, so a modal's buttons would glow BEHIND
 * it — RewardOverlay and Purna each nest their own provider, and the nearest
 * one wins.
 *
 * Perf: one pre-mounted animated node, opacity + position only, on the UI
 * thread, over one static SVG gradient rasterised at mount, never at press.
 */
/* eslint-disable react-hooks/immutability --
   This component drives Reanimated shared values (`.value = …`), which is
   Reanimated's API but which the React-Compiler immutability rule doesn't
   model. Same precedent as PressableScale and CoinExpand. */
import React, { createContext, useCallback, useContext } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { GOLD_WASH_RAMP } from "./GoldWash";
import { useMotion } from "./motion";

interface GoldGlowApi {
  /** Bloom the gold light from this window-space point. */
  fire: (x: number, y: number) => void;
}

const Ctx = createContext<GoldGlowApi | null>(null);

/** Null-safe: a button outside any provider simply doesn't glow. */
export function useGoldGlow(): GoldGlowApi | null {
  return useContext(Ctx);
}

/** The mockup's gwash: 1.15s, ease-out, opacity 0 → 1 at 20% → 0. */
const GLOW_MS = 1150;

export function GoldGlowProvider({ children }: { children: React.ReactNode }) {
  const enabled = useMotion();
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(1); // 1 = at rest (invisible)
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);

  // wider than the screen from wherever the button sits, so the light reads
  // as the whole surface warming rather than a disc with an edge
  const d = Math.max(width, height) * 2;

  const fire = useCallback(
    (x: number, y: number) => {
      if (!enabled) return;
      cx.value = x;
      cy.value = y;
      t.value = 0;
      t.value = withTiming(1, { duration: GLOW_MS, easing: Easing.out(Easing.quad) });
    },
    [enabled, cx, cy, t],
  );

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 1], [0, 1, 0]),
    transform: [{ translateX: cx.value - d / 2 }, { translateY: cy.value - d / 2 }],
  }));

  return (
    <Ctx.Provider value={{ fire }}>
      <View style={{ flex: 1 }}>
        {children}
        {enabled ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 90, elevation: 90 }]}>
            <Animated.View
              pointerEvents="none"
              style={[{ position: "absolute", left: 0, top: 0, width: d, height: d }, style]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 100 100">
                <Defs>
                  <RadialGradient id="goldGlowHostG" cx="50%" cy="50%" r="50%">
                    {GOLD_WASH_RAMP.map((s) => (
                      <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                    ))}
                  </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="50" fill="url(#goldGlowHostG)" />
              </Svg>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </Ctx.Provider>
  );
}
