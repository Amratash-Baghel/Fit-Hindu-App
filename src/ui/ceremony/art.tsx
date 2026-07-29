/**
 * Ceremony artwork — pure, static SVG pieces for the oxblood-and-gold ritual
 * composition. NO animation lives here; the splash (and later the plan-ready
 * ceremony) stacks these as layers and drives the motion. Drawing is separated
 * from motion so both ceremonies share one set of marks.
 *
 * Everything is `react-native-svg` paths (resolution-independent, ~no bitmap
 * budget) on a shared 360×640 viewBox, and every colour comes from
 * `tokens.ceremony.*`. Depth is layered `RadialGradient`, never `<FeGaussianBlur>`
 * — SVG filters are software-rasterised on Android and tank low-end devices.
 */
import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { ceremony as c } from "../tokens";

/** Shared viewBox — every layer aligns to this so stacked Svgs register. */
export const CEREMONY_VB = { w: 360, h: 640 } as const;
const VB = `0 0 ${CEREMONY_VB.w} ${CEREMONY_VB.h}`;

/**
 * The ogee (onion) arch, as two concentric outlines. Exported so the splash can
 * render them as `AnimatedPath` and draw them in with a stroke-dash reveal.
 * `ARCH_DASH` is set longer than either path so `strokeDashoffset` sweeps the
 * whole outline from hidden (offset = ARCH_DASH) to drawn (offset = 0).
 */
export const ARCH_OUTER =
  "M64 452 C64 300 118 250 150 206 C166 184 176 150 180 108 C184 150 194 184 210 206 C242 250 296 300 296 452";
export const ARCH_INNER =
  "M82 452 C82 312 130 264 160 222 C172 204 178 174 180 138 C182 174 188 204 200 222 C230 264 278 312 278 452";
export const ARCH_DASH = 900;

const fill = { fill: c.gold } as const;

/** Base layer: radial maroon field, cream top corners, charcoal base band. */
export function FieldVignette() {
  return (
    <Svg width="100%" height="100%" viewBox={VB} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient id="field" cx="50%" cy="42%" r="72%">
          <Stop offset="0%" stopColor={c.fieldHi} />
          <Stop offset="62%" stopColor={c.field} />
          <Stop offset="100%" stopColor={c.fieldDeep} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={360} height={640} fill="url(#field)" />

      {/* cream negative-space corners, up top */}
      <Path d="M0 0 L92 0 C44 14 16 44 0 92 Z" fill={c.cream} opacity={0.9} />
      <Path d="M360 0 L268 0 C316 14 344 44 360 92 Z" fill={c.cream} opacity={0.9} />

      {/* charcoal base band with a gold hairline */}
      <Rect x={0} y={588} width={360} height={52} fill={c.charcoal} />
      <Rect x={0} y={586} width={360} height={2} fill={c.gold} opacity={0.7} />
    </Svg>
  );
}

/**
 * A terracotta side panel of paisley + concentric mandala arcs, bleeding off
 * one edge. The splash sweeps these in from the edge with a slight rotation, so
 * the arcs are centred just off-screen to read as radiating inward.
 */
export function SidePanel({ side }: { side: "left" | "right" }) {
  const cxEdge = side === "left" ? -6 : 366;
  const grad = side === "left" ? "panelL" : "panelR";
  const gx = side === "left" ? "0%" : "100%";
  return (
    <Svg width="100%" height="100%" viewBox={VB} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient id={grad} cx={gx} cy="50%" r="46%">
          <Stop offset="0%" stopColor={c.terracottaHi} stopOpacity={0.55} />
          <Stop offset="55%" stopColor={c.terracotta} stopOpacity={0.25} />
          <Stop offset="100%" stopColor={c.terracotta} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={360} height={640} fill={`url(#${grad})`} />

      {/* concentric mandala arcs radiating from just off the edge */}
      <G stroke={c.gold} strokeWidth={1.4} fill="none">
        <Circle cx={cxEdge} cy={320} r={64} opacity={0.5} />
        <Circle cx={cxEdge} cy={320} r={104} opacity={0.38} />
        <Circle cx={cxEdge} cy={320} r={150} opacity={0.26} />
        <Circle cx={cxEdge} cy={320} r={200} opacity={0.16} />
      </G>

      {/* a paisley teardrop curling off the edge, top and bottom */}
      <G stroke={c.goldHi} strokeWidth={1.3} fill="none" opacity={0.5}>
        <Path
          d={
            side === "left"
              ? "M-6 150 C40 150 58 176 48 206 C40 230 8 230 6 206 C4 190 24 188 28 202"
              : "M366 150 C320 150 302 176 312 206 C320 230 352 230 354 206 C356 190 336 188 332 202"
          }
        />
        <Path
          d={
            side === "left"
              ? "M-6 470 C40 470 58 496 48 526 C40 550 8 550 6 526 C4 510 24 508 28 522"
              : "M366 470 C320 470 302 496 312 526 C320 550 352 550 354 526 C356 510 336 508 332 522"
          }
        />
      </G>
    </Svg>
  );
}

/**
 * The emblem: a thin gold ring, a soft gold bloom, and the gada (mace) hero
 * mark. The splash scales this up from ~0.9 with the bloom fading in. The bloom
 * is a `RadialGradient`, deliberately not a blur filter.
 */
export function Emblem() {
  return (
    <Svg width="100%" height="100%" viewBox={VB} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient id="bloom" cx="50%" cy="34%" r="42%">
          <Stop offset="0%" stopColor={c.goldHi} stopOpacity={0.5} />
          <Stop offset="45%" stopColor={c.gold} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={c.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* gold bloom behind the head */}
      <Rect x={0} y={0} width={360} height={640} fill="url(#bloom)" />

      {/* the thin gold ring behind the emblem */}
      <G stroke={c.gold} fill="none">
        <Circle cx={180} cy={256} r={126} strokeWidth={1.4} opacity={0.7} />
        <Circle cx={180} cy={256} r={134} strokeWidth={0.8} opacity={0.4} />
      </G>

      {/* ---- gada (mace), centred on x=180 ---- */}
      {/* finial knob + neck */}
      <Circle cx={180} cy={150} r={7} {...fill} />
      <Rect x={177} y={156} width={6} height={12} rx={3} {...fill} />

      {/* head — bulb with a shaded lower half and a highlight */}
      <Ellipse cx={180} cy={198} rx={42} ry={46} {...fill} />
      <Path d="M138 198 A42 46 0 0 0 222 198 Z" fill={c.goldShade} opacity={0.55} />
      <Path d="M150 176 A30 34 0 0 1 176 158" stroke={c.goldHi} strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* flutes on the head */}
      <G stroke={c.goldShade} strokeWidth={1.6} opacity={0.6}>
        <Path d="M180 154 L180 244" />
        <Path d="M160 160 L160 238" />
        <Path d="M200 160 L200 238" />
      </G>

      {/* collar under the head */}
      <Rect x={166} y={242} width={28} height={12} rx={5} {...fill} />
      <Rect x={166} y={242} width={28} height={12} rx={5} fill={c.goldShade} opacity={0.35} />

      {/* tapered shaft with a cylinder highlight + grip bands */}
      <Path d="M172 256 L188 256 L191 430 L169 430 Z" {...fill} />
      <Path d="M180 256 L188 256 L191 430 L180 430 Z" fill={c.goldShade} opacity={0.4} />
      <Rect x={174} y={258} width={3} height={170} rx={1.5} fill={c.goldHi} opacity={0.7} />
      <G stroke={c.goldShade} strokeWidth={2.2} opacity={0.6}>
        <Path d="M171 312 L189 312" />
        <Path d="M170 360 L190 360" />
      </G>

      {/* pommel */}
      <Ellipse cx={180} cy={434} rx={17} ry={10} {...fill} />
      <Path d="M163 434 A17 10 0 0 0 197 434 Z" fill={c.goldShade} opacity={0.5} />
    </Svg>
  );
}
