/**
 * BMS splash art (docs/specs/redesign-bms.md phase 0) — the static layers of
 * the new launch screen: warm-black field, the enlightenment glow, the seated
 * meditating figure, and the lotus-petal geometry the splash animates into an
 * arc around him.
 *
 * All vector, no rasters: crisp at every density, and the pieces can be
 * animated independently (glow blooms, petals unfold one by one) without
 * shipping a video. Colors come from tokens only — the field is the app's own
 * ink so the cross-fade into Home is seamless.
 */
import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import { color } from "../tokens";

/** Design space of the splash composition (portrait). */
export const BMS_VB = { w: 360, h: 640 } as const;
const VB = `0 0 ${BMS_VB.w} ${BMS_VB.h}`;

/** Orbit the petals ride on, and where the figure sits inside the viewBox. */
export const PETAL_ORBIT = { cx: 180, cy: 396, r: 148 } as const;
/** Petal length along its axis (tip points away from the orbit center). */
export const PETAL_LEN = 54;
export const PETAL_W = 44;
export const PETAL_COUNT = 9;
/** Fan angles (degrees, 0 = straight up) — a mandorla arc, not a full wheel. */
export const PETAL_ANGLES = Array.from(
  { length: PETAL_COUNT },
  (_, i) => -108 + (216 / (PETAL_COUNT - 1)) * i,
);

/**
 * The warm field: ink, gently lifted at the centre and darkened at the edges
 * so the glow has somewhere to live. Replaces the oxblood ceremony field.
 */
export function BmsField() {
  return (
    <Svg width="100%" height="100%" viewBox={VB} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="bmsField" cx="50%" cy="56%" r="75%">
          <Stop offset="0" stopColor="#1A110A" />
          <Stop offset="0.55" stopColor={color.ink} />
          <Stop offset="1" stopColor="#080502" />
        </RadialGradient>
      </Defs>
      <Path d={`M0 0H${BMS_VB.w}V${BMS_VB.h}H0Z`} fill="url(#bmsField)" />
    </Svg>
  );
}

/**
 * The enlightenment glow — a broad warm bloom behind the torso plus a tighter
 * halo behind the head. Layered radial gradients, never a blur (the same
 * performance contract as the ceremony's gada bloom).
 */
export function BmsGlow() {
  return (
    <Svg width="100%" height="100%" viewBox={VB} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="bmsBloom" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color.goldHi} stopOpacity="0.72" />
          <Stop offset="0.38" stopColor={color.saffron} stopOpacity="0.26" />
          <Stop offset="0.75" stopColor={color.saffronDeep} stopOpacity="0.07" />
          <Stop offset="1" stopColor={color.saffronDeep} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bmsHalo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF3D6" stopOpacity="0.9" />
          <Stop offset="0.5" stopColor={color.goldHi} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color.goldHi} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={PETAL_ORBIT.cx} cy={PETAL_ORBIT.cy - 24} rx={205} ry={215} fill="url(#bmsBloom)" />
      <Circle cx={180} cy={302} r={86} fill="url(#bmsHalo)" />
    </Svg>
  );
}

/**
 * The fit man in padmasana — a pure dark silhouette read against the glow:
 * head, neck+torso with shoulders, arms resting out to the knees, and the
 * folded-leg base. Overlapping fills in one color merge into a single figure.
 */
export function MeditatingMan() {
  const fill = "#100A05";
  return (
    <Svg width="100%" height="100%" viewBox={VB} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      {/* head */}
      <Circle cx={180} cy={300} r={27} fill={fill} />
      {/* neck + torso + shoulders */}
      <Path
        d="M180 318
           C196 318 207 326 213 338
           C229 344 235 353 237 369
           C239 401 233 429 225 447
           L135 447
           C127 429 121 401 123 369
           C125 353 131 344 147 338
           C153 326 164 318 180 318 Z"
        fill={fill}
      />
      {/* right arm: shoulder → elbow → hand on knee */}
      <Path
        d="M226 350
           C246 361 255 384 259 405
           C262 423 265 437 268 449
           C270 457 264 461 256 459
           C247 456 242 448 238 436
           C232 419 227 404 223 390
           C218 373 218 358 226 350 Z"
        fill={fill}
      />
      {/* left arm (mirror) */}
      <Path
        d="M134 350
           C114 361 105 384 101 405
           C98 423 95 437 92 449
           C90 457 96 461 104 459
           C113 456 118 448 122 436
           C128 419 133 404 137 390
           C142 373 142 358 134 350 Z"
        fill={fill}
      />
      {/* crossed-leg base */}
      <Path
        d="M80 472
           C98 443 130 432 180 432
           C230 432 262 443 280 472
           C287 482 283 493 269 496
           C239 502 210 504 180 504
           C150 504 121 502 91 496
           C77 493 73 482 80 472 Z"
        fill={fill}
      />
      {/* hands resting on the knees */}
      <Circle cx={263} cy={451} r={9} fill={fill} />
      <Circle cx={97} cy={451} r={9} fill={fill} />
    </Svg>
  );
}

/**
 * One lotus petal, drawn pointing UP with its base at the bottom-centre of a
 * PETAL_W × PETAL_LEN box. The splash positions and rotates copies of this
 * around PETAL_ORBIT. Gold-on-dark, with a faint inner vein.
 */
export function Petal({ scale = 1 }: { scale?: number }) {
  const cx = PETAL_W / 2;
  return (
    <Svg width={PETAL_W * scale} height={PETAL_LEN * scale} viewBox={`0 0 ${PETAL_W} ${PETAL_LEN}`}>
      <Defs>
        <RadialGradient id="petalFill" cx="50%" cy="88%" r="90%">
          <Stop offset="0" stopColor={color.goldHi} stopOpacity="0.95" />
          <Stop offset="0.6" stopColor={color.gold} stopOpacity="0.8" />
          <Stop offset="1" stopColor={color.saffronDeep} stopOpacity="0.55" />
        </RadialGradient>
      </Defs>
      <Path
        d={`M${cx} 2
            C${cx + 14} ${PETAL_LEN * 0.35} ${cx + 15} ${PETAL_LEN * 0.72} ${cx} ${PETAL_LEN - 2}
            C${cx - 15} ${PETAL_LEN * 0.72} ${cx - 14} ${PETAL_LEN * 0.35} ${cx} 2 Z`}
        fill="url(#petalFill)"
      />
      <Path
        d={`M${cx} 6 L${cx} ${PETAL_LEN - 8}`}
        stroke={color.goldHi}
        strokeWidth={1}
        strokeOpacity={0.5}
      />
    </Svg>
  );
}
