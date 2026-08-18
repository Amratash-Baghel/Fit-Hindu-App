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
 * Perf contract (v2, owner report 2026-08-18 "the burst into the feature is
 * laggy"): the previous version mounted the disc's SVG at TAP time via
 * setState — a React render + react-native-svg mount + first-frame gradient
 * rasterise, all on the JS thread, exactly on the frame the animation started,
 * which is the hitch the owner felt. Now all three pillar discs are mounted
 * ONCE with the provider and parked invisible; `fire` only writes shared
 * values (centre, scale, fade, which disc), so the tap path does zero React
 * work and the growth is a pure GPU transform from its first frame. Each disc
 * is one animated node, transform/opacity only, UI thread, over a static SVG
 * radial gradient rasterised at mount, never at tap.
 */
/* eslint-disable react-hooks/immutability --
   This component drives Reanimated shared values (`.value = …`), which is
   Reanimated's API but which the React-Compiler immutability rule doesn't
   model. Same precedent as PressableScale and CeremonySplash. */
import React, { createContext, useCallback, useContext, useRef } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
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
/**
 * The glow is rendered ONCE at this fixed pixel size and grown to full screen
 * purely by a GPU transform:scale — a small raster + a transform never
 * re-rasterises while it grows (the first de-jank pass). See the header for
 * why it is also PRE-mounted now.
 */
const BASE = 300;

/** Derived from the token authority, so a new pillar can never silently miss
 *  its disc (indexOf would return -1 and the burst would just not show). */
const PILLARS = Object.keys(coinBurst) as readonly PillarKey[];

/** One pillar's pre-mounted disc: parked invisible until `active` names it. */
function Disc({
  pillar: p,
  index,
  active,
  cx,
  cy,
  scale,
  fade,
}: {
  pillar: PillarKey;
  index: number;
  active: SharedValue<number>;
  cx: SharedValue<number>;
  cy: SharedValue<number>;
  scale: SharedValue<number>;
  fade: SharedValue<number>;
}) {
  const ramp = coinBurst[p];
  const style = useAnimatedStyle(() => ({
    opacity: active.value === index ? fade.value : 0,
    transform: [
      { translateX: cx.value - BASE / 2 },
      { translateY: cy.value - BASE / 2 },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, top: 0, width: BASE, height: BASE }, style]}
    >
      <Svg width={BASE} height={BASE} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`burst-${p}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={ramp[0]} />
            <Stop offset="0.19" stopColor={ramp[1]} />
            <Stop offset="0.44" stopColor={ramp[2]} />
            <Stop offset="0.74" stopColor={ramp[3]} />
            <Stop offset="1" stopColor={ramp[4]} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#burst-${p})`} />
      </Svg>
    </Animated.View>
  );
}

export function CoinExpandProvider({ children }: { children: React.ReactNode }) {
  const enabled = useMotion();
  const { width, height } = useWindowDimensions();
  // Which pillar's disc is in flight (-1 = none), and the flight itself. All
  // shared values: the tap path never touches React state.
  const active = useSharedValue(-1);
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const scale = useSharedValue(0);
  const fade = useSharedValue(1);
  // The pending navigation, tagged with its fire's sequence number. The seq
  // travels through runOnJS and must match on arrival — so a rapid second tap
  // (which overwrites the ref) can never have its navigation run early by the
  // FIRST fire's queued completion, and a stale completion can never fire at
  // all. (A per-fire closure can't be handed to runOnJS across fires safely,
  // hence the tagged ref.)
  const onCoveredRef = useRef<{ seq: number; cb: () => void } | null>(null);
  const seqRef = useRef(0);

  const runCovered = useCallback((seq: number) => {
    const cur = onCoveredRef.current;
    if (!cur || cur.seq !== seq) return; // a newer fire owns the overlay now
    onCoveredRef.current = null;
    cur.cb();
  }, []);

  const fire = useCallback(
    (r: ExpandRequest) => {
      if (!enabled) {
        r.onCovered();
        return;
      }
      seqRef.current += 1;
      const seq = seqRef.current;
      onCoveredRef.current = { seq, cb: r.onCovered };
      active.value = PILLARS.indexOf(r.pillar);
      cx.value = r.x;
      cy.value = r.y;
      // grow until the BASE disc covers the farthest corner (+6% margin)
      const maxR = Math.hypot(Math.max(r.x, width - r.x), Math.max(r.y, height - r.y));
      const coverScale = ((2 * maxR) / BASE) * 1.06;
      scale.value = 0;
      fade.value = 1;
      scale.value = withTiming(
        coverScale,
        { duration: EXPAND_MS, easing: Easing.bezier(0.4, 0, 0.2, 1) },
        (finished) => {
          if (!finished) return;
          runOnJS(runCovered)(seq);
          fade.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) }, (done) => {
            if (done) active.value = -1;
          });
        },
      );
    },
    [enabled, active, cx, cy, scale, fade, runCovered, width, height],
  );

  return (
    <Ctx.Provider value={{ fire }}>
      <View style={{ flex: 1 }}>
        {children}
        {/* all three discs live here from mount, parked invisible — nothing
            mounts, renders or rasterises on the tap itself */}
        {enabled ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>
            {PILLARS.map((p, i) => (
              <Disc key={p} pillar={p} index={i} active={active} cx={cx} cy={cy} scale={scale} fade={fade} />
            ))}
          </View>
        ) : null}
      </View>
    </Ctx.Provider>
  );
}
