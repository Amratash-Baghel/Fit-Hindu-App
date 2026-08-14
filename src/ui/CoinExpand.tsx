/**
 * CoinExpand — the mockup's `expandTo` circular transition, the tap-glow the
 * Home coins open with: a white-hot disc in the pillar's own colour ramp
 * (`coinBurst` tokens) scales out of the tapped coin until it has taken the
 * whole screen, the navigation lands underneath it at full cover, and the
 * light falls away over the new page. Body opens warm, Mind cool, Soul gold.
 *
 * The overlay must outlive the tap's screen (the page switches at full cover),
 * so it is hosted ABOVE the tab navigator: `CoinExpandProvider` wraps the tabs
 * layout, and screens fire it through `useCoinExpand()` with a window-space
 * centre point. When motion is off (web / reduce-motion) `fire` simply runs
 * the navigation — the moment stays instant, never blocked.
 *
 * Perf contract: one animated node, transform/opacity only, UI thread, over a
 * static SVG radial gradient. Nothing is mounted at all between fires.
 */
/* eslint-disable react-hooks/immutability --
   This component drives Reanimated shared values (`.value = …`), which is
   Reanimated's API but which the React-Compiler immutability rule doesn't
   model. Same precedent as PressableScale and CeremonySplash. */
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { coinBurst, type PillarKey } from "./tokens";
import { useMotion } from "./motion";

interface ExpandRequest {
  /** window-space centre of the tapped coin */
  x: number;
  y: number;
  pillar: PillarKey;
  /** runs at full cover — do the navigation here */
  onCovered: () => void;
}

interface CoinExpandApi {
  fire: (req: ExpandRequest) => void;
}

const Ctx = createContext<CoinExpandApi | null>(null);

/** Screens call this to open their pillar with the glow. Null-safe: outside a
 *  provider (tests, isolated screens) callers just navigate directly. */
export function useCoinExpand(): CoinExpandApi | null {
  return useContext(Ctx);
}

/** The mockup's expand timing: 460ms out, 420ms fade over the new page. */
const EXPAND_MS = 460;
const FADE_MS = 420;

export function CoinExpandProvider({ children }: { children: React.ReactNode }) {
  const enabled = useMotion();
  const { width, height } = useWindowDimensions();
  const [req, setReq] = useState<(ExpandRequest & { key: number }) | null>(null);
  const keyRef = useRef(0);
  // 0 = a point at the coin; 1 = covering the screen; then opacity falls.
  const scale = useSharedValue(0);
  const fade = useSharedValue(1);

  const clear = useCallback(() => setReq(null), []);

  const fire = useCallback(
    (r: ExpandRequest) => {
      if (!enabled) {
        r.onCovered();
        return;
      }
      keyRef.current += 1;
      setReq({ ...r, key: keyRef.current });
      scale.value = 0;
      fade.value = 1;
      scale.value = withTiming(1, { duration: EXPAND_MS, easing: Easing.bezier(0.4, 0, 0.2, 1) }, (finished) => {
        if (!finished) return;
        runOnJS(r.onCovered)();
        fade.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) }, (done) => {
          if (done) runOnJS(clear)();
        });
      });
    },
    [enabled, scale, fade, clear],
  );

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }],
  }));

  // The disc has to reach every screen corner at the same moment — a circle
  // sized to twice the farthest-corner distance, centred on the tapped coin.
  let disc: React.ReactNode = null;
  if (req) {
    const maxR = Math.hypot(Math.max(req.x, width - req.x), Math.max(req.y, height - req.y));
    const d = maxR * 2;
    const ramp = coinBurst[req.pillar];
    disc = (
      <Animated.View
        key={req.key}
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: req.x - d / 2,
            top: req.y - d / 2,
            width: d,
            height: d,
            zIndex: 100,
            elevation: 100,
          },
          style,
        ]}
      >
        <Svg width={d} height={d} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`burst-${req.pillar}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={ramp[0]} />
              <Stop offset="0.19" stopColor={ramp[1]} />
              <Stop offset="0.44" stopColor={ramp[2]} />
              <Stop offset="0.74" stopColor={ramp[3]} />
              <Stop offset="1" stopColor={ramp[4]} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill={`url(#burst-${req.pillar})`} />
        </Svg>
      </Animated.View>
    );
  }

  return (
    <Ctx.Provider value={{ fire }}>
      <View style={{ flex: 1 }}>
        {children}
        {disc}
      </View>
    </Ctx.Provider>
  );
}
