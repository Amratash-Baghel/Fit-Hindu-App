/**
 * BMS splash art — the chakra-awakening launch screen's static layers
 * (docs/specs/redesign-bms.md, ported from the approved app-native mockup).
 *
 * The scene: an obsidian, muscular meditator in padmasana, rim-lit by a
 * sunrise behind him. The body is near-black — all colour is light falling ON
 * it. The splash animates the sushumna channel filling root→crown, the seven
 * chakras landing on it, the crown spilling over the head, and the awakened
 * gaze opening last — every animated piece here is a STATIC svg the splash
 * wraps in Animated.Views (the CeremonySplash contract: no SVG-prop motion).
 *
 * The figure is our own vector redraw (nothing traced from the reference
 * photo); chakra hues are the traditional seven and live only on this screen —
 * everything else comes from tokens.
 */
import React from "react";
import { StyleSheet } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { color } from "../tokens";

/** Design space of the whole splash composition (portrait phone). */
export const FRAME = { w: 390, h: 812 } as const;
/** The figure's own viewBox; rendered 300 design-px wide at FRAME top 137. */
export const FIG_VB = { w: 300, h: 360 } as const;
/** Where the figure sits inside the FRAME. */
export const FIG_POS = { left: 45, top: 137 } as const;
/** The eyes' centre in figure space — the burst opens from here. */
export const EYE = { x: 150, y: 63 } as const;

/**
 * The seven chakras, root→crown. `y` = position on the spine (figure space),
 * `rx` = how far that chakra's light spills sideways through the body.
 */
export const CHAKRAS = [
  { y: 254, rx: 52, c: "#FF5F5F" }, // मूलाधार root
  { y: 228, rx: 42, c: "#FF8C3E" }, // स्वाधिष्ठान sacral
  { y: 202, rx: 48, c: "#FFCF60" }, // मणिपूर solar
  { y: 168, rx: 66, c: "#5FD79B" }, // अनाहत heart
  { y: 116, rx: 24, c: "#5BC8F5" }, // विशुद्ध throat
  { y: 46, rx: 30, c: "#98A6DC" }, // आज्ञा third eye
  { y: 16, rx: 30, c: "#D9B9FF" }, // सहस्रार crown
] as const;

/** The channel the chakras sit on (figure space). */
export const SUSHUMNA = { x: 150, top: 14, bottom: 256 } as const;
/** Sushumna ramp, TOP-first (expo LinearGradient paints top→bottom). */
export const SUSH_COLORS = [
  "#DCC0FF",
  "#A6ADE0",
  "#6FC9F0",
  "#8FD9A2",
  "#FFB255",
  "#FF6B5A",
] as const;
export const SUSH_LOCATIONS = [0, 0.15, 0.38, 0.6, 0.8, 1] as const;

/* ── body masses, kept as constants so the sheen clip is always exactly the
      body. Proportions: shoulders wide, waist narrow, knees broad — a hard V
      over a broad seated base. ── */
const HEAD =
  "M150 26 C169 26 182 40 183 60 C184 73 181 83 175 91 C170 98 161 104 150 104 " +
  "C139 104 130 98 125 91 C119 83 116 73 117 60 C118 40 131 26 150 26 Z";
const NECK = "M133 88 C133 104 130 112 121 118 L179 118 C170 112 167 104 167 88 Z";
const TORSO =
  "M150 108 C164 108 173 114 178 123 C186 130 197 135 205 141 C216 149 223 161 224 175 " +
  "C225 189 213 198 202 208 C193 217 189 235 188 258 L112 258 C111 235 107 217 98 208 " +
  "C85 199 75 189 76 175 C77 161 84 149 95 141 C103 135 114 130 122 123 " +
  "C127 114 136 108 150 108 Z";
/* trapezius wedge: bridges neck → deltoid in one mass so the shoulder never
   shows a hairline of background. */
const TRAP =
  "M150 104 C170 104 188 113 204 129 C215 140 222 152 224 166 L150 166 Z";
const LAP =
  "M150 238 C186 238 216 248 240 260 C262 272 272 289 266 304 C260 318 240 326 210 330 " +
  "C190 332 170 333 150 333 C130 333 110 332 90 330 C60 326 40 318 34 304 C28 289 38 272 60 260 " +
  "C84 248 114 238 150 238 Z";
/* padmasana: the near shin crosses over the far one; separated by contour so
   the base reads as legs, not a mound. */
const SHIN_UNDER =
  "M96 306 C120 291 148 287 168 296 C181 302 180 315 167 320 " +
  "C146 329 111 327 99 320 C89 315 90 311 96 306 Z";
const SHIN_OVER =
  "M204 300 C182 288 154 286 138 295 C125 302 126 315 139 320 " +
  "C160 329 193 325 205 318 C215 313 213 306 204 300 Z";
/* one arm as a single continuous limb — deltoid, bicep, elbow break, forearm,
   fist closed on the knee. */
const ARM =
  "M172 112 C198 118 218 132 232 150 C242 166 250 185 253 205 " +
  "C255 222 251 242 243 258 C238 268 230 276 222 277 " +
  "C214 278 210 272 210 264 C210 252 215 240 216 228 " +
  "C216 214 212 200 207 188 C202 174 192 154 182 134 C177 123 173 116 172 112 Z";

const MIRROR = "translate(300, 0) scale(-1, 1)";

/**
 * The stage ground — near-black, faintly warm above the figure's seat.
 * Fills the whole screen behind every other layer.
 */
export function SplashField() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <RadialGradient id="spField" cx="50%" cy="25%" r="78%">
          <Stop offset="0" stopColor="#160E08" />
          <Stop offset="0.52" stopColor="#0C0805" />
          <Stop offset="1" stopColor="#050302" />
        </RadialGradient>
      </Defs>
      <Path d={`M0 0H${FRAME.w}V${FRAME.h}H0Z`} fill="url(#spField)" />
    </Svg>
  );
}

/**
 * The seated figure — every static part: obsidian body, sunrise sheen,
 * antique-gold musculature contours, the crossed-leg detail, and the rim
 * light catching both backlit edges. The animated layers (sushumna, chakras,
 * eyes, crown) render as overlays positioned in this same figure space.
 */
export function ChakraFigure({ width }: { width: number }) {
  const height = (width * FIG_VB.h) / FIG_VB.w;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${FIG_VB.w} ${FIG_VB.h}`}>
      <Defs>
        {/* obsidian body, lit slightly from above */}
        <LinearGradient id="figBody" gradientUnits="userSpaceOnUse" x1="150" y1="30" x2="150" y2="330">
          <Stop offset="0" stopColor="#241A11" />
          <Stop offset="0.42" stopColor="#110B06" />
          <Stop offset="1" stopColor="#070504" />
        </LinearGradient>
        {/* the sunrise reflecting off the chest */}
        <RadialGradient id="figSheen" cx="50%" cy="36%" r="60%">
          <Stop offset="0" stopColor="#F7CE8C" stopOpacity="0.24" />
          <Stop offset="0.48" stopColor="#DE8E42" stopOpacity="0.09" />
          <Stop offset="1" stopColor="#DE8E42" stopOpacity="0" />
        </RadialGradient>
        {/* rim light, cooler at the crown, warmer at the base */}
        <LinearGradient id="figRim" gradientUnits="userSpaceOnUse" x1="150" y1="44" x2="150" y2="320">
          <Stop offset="0" stopColor="#FFF0CE" />
          <Stop offset="0.45" stopColor="#F3C57F" />
          <Stop offset="1" stopColor="#C98A45" />
        </LinearGradient>
        <RadialGradient id="figSpec" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF6E0" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#FFF6E0" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="figLapSheen" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F7DCA8" stopOpacity="0.26" />
          <Stop offset="0.55" stopColor="#E0A055" stopOpacity="0.1" />
          <Stop offset="1" stopColor="#E0A055" stopOpacity="0" />
        </RadialGradient>
        <ClipPath id="figClip">
          <Path d={HEAD} />
          <Path d={NECK} />
          <Path d={TORSO} />
          <Path d={LAP} />
          <Path d={TRAP} />
          <Path d={TRAP} transform={MIRROR} />
          <Path d={SHIN_UNDER} />
          <Path d={SHIN_OVER} />
          <Path d={ARM} />
          <Path d={ARM} transform={MIRROR} />
        </ClipPath>
      </Defs>

      {/* the body */}
      <G fill="url(#figBody)">
        <Path d={HEAD} />
        <Path d={NECK} />
        <Path d={TRAP} />
        <Path d={TRAP} transform={MIRROR} />
        <Path d={TORSO} />
        <Path d={ARM} />
        <Path d={ARM} transform={MIRROR} />
        <Path d={LAP} />
        <Path d={SHIN_UNDER} />
        <Path d={SHIN_OVER} />
      </G>

      {/* sunrise on the chest + lap sheen + specular hits, clipped to the body */}
      <G clipPath="url(#figClip)">
        <Ellipse cx="150" cy="180" rx="80" ry="104" fill="url(#figSheen)" />
        <Ellipse cx="150" cy="262" rx="106" ry="28" fill="url(#figLapSheen)" />
        <Ellipse cx="150" cy="38" rx="25" ry="10" fill="url(#figSpec)" />
        <Ellipse cx="201" cy="146" rx="27" ry="10" fill="url(#figSpec)" transform="rotate(28 201 146)" />
        <Ellipse
          cx="201"
          cy="146"
          rx="27"
          ry="10"
          fill="url(#figSpec)"
          transform={`${MIRROR} rotate(28 201 146)`}
        />
      </G>

      {/* musculature: antique-gold contour, low so it reads as sculpt, not paint */}
      <G stroke="#B98A4A" strokeOpacity="0.36" fill="none" strokeWidth="1.9" strokeLinecap="round">
        {[undefined, MIRROR].map((tf, i) => (
          <G key={i} transform={tf}>
            <Path d="M164 94 C164 105 161 113 155 119" />
            <Path d="M155 135 C168 139 182 144 194 152" />
            <Path d="M192 154 C201 165 205 178 204 192" />
            <Path d="M158 154 C173 148 185 152 193 161" />
            <Path d="M158 192 C175 196 187 190 194 180" />
            <Path d="M198 200 C194 214 188 227 180 238" />
            <Path d="M164 200 C165 218 165 236 163 254" />
            <Path d="M152 212 C157 214 161 214 164 213" />
            <Path d="M152 228 C157 230 161 230 164 229" />
            <Path d="M152 243 C156 245 160 245 163 244" />
            <Path d="M223 168 C233 185 243 204 249 222" />
            <Path d="M249 234 C250 246 247 258 241 267" />
            <Path d="M212 258 C220 253 232 254 239 261 C245 267 245 275 239 279" />
            <Path d="M252 282 C260 290 264 298 262 307" />
          </G>
        ))}
        <Path d="M150 150 L150 254" />
      </G>

      {/* the crossed legs, contoured harder so the base reads as two shins */}
      <G stroke="#B98A4A" strokeOpacity="0.5" fill="none" strokeWidth="2" strokeLinecap="round">
        <Path d="M96 306 C120 291 148 287 168 296" />
        <Path d="M204 300 C182 288 154 286 138 295 C125 302 126 315 139 320" />
        <Path d="M138 288 C128 283 116 284 110 291 C104 298 107 306 116 307 C126 308 134 302 136 295" />
        <Path d="M117 296 C122 293 128 293 132 295" />
      </G>

      {/* rim light: the sunrise catching both backlit edges */}
      <G stroke="url(#figRim)" strokeOpacity="0.72" fill="none" strokeWidth="2.5" strokeLinecap="round">
        {[undefined, MIRROR].map((tf, i) => (
          <G key={i} transform={tf}>
            <Path d="M168 29 C179 35 184 46 183 62" />
            <Path d="M176 112 C196 117 214 130 226 150 C238 170 248 186 252 202" />
            <Path d="M254 214 C255 232 251 246 244 258" />
            <Path d="M248 262 C263 273 273 289 267 305 C261 320 240 328 212 332" />
          </G>
        ))}
      </G>
    </Svg>
  );
}

/** One chakra's halo + white-hot core (static; the splash pops it in). */
export function ChakraGlow({ c, size }: { c: string; size: number }) {
  const uid = c.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38">
      <Defs>
        <RadialGradient id={`ckh-${uid}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={c} stopOpacity="0.66" />
          <Stop offset="0.4" stopColor={c} stopOpacity="0.26" />
          <Stop offset="1" stopColor={c} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`ckc-${uid}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.38" stopColor="#FFFFFF" stopOpacity="0.92" />
          <Stop offset="1" stopColor={c} />
        </RadialGradient>
      </Defs>
      <Circle cx="19" cy="19" r="19" fill={`url(#ckh-${uid})`} />
      <Circle cx="19" cy="19" r="4.6" fill={`url(#ckc-${uid})`} />
    </Svg>
  );
}

/** The light one chakra spills sideways through the body (static ellipse). */
export function ChakraSpill({ c, width, height }: { c: string; width: number; height: number }) {
  const uid = c.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Svg width={width} height={height} viewBox="0 0 100 22" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`cks-${uid}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={c} stopOpacity="0.66" />
          <Stop offset="0.4" stopColor={c} stopOpacity="0.26" />
          <Stop offset="1" stopColor={c} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="11" rx="50" ry="11" fill={`url(#cks-${uid})`} />
    </Svg>
  );
}

/** Crown overflow — the last chakra's light spilling up over the head. */
export function CrownFlareArt({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width * 64) / 96} viewBox="0 0 96 64">
      <Defs>
        <RadialGradient id="crownG" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.88" />
          <Stop offset="0.38" stopColor="#D9B9FF" stopOpacity="0.38" />
          <Stop offset="1" stopColor="#D9B9FF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="48" cy="32" rx="48" ry="32" fill="url(#crownG)" />
    </Svg>
  );
}

/**
 * The awakened gaze: two solid-white eyes, no iris, each with its own round
 * halo of light bleeding past the lids — a twin-point gaze, not a single
 * glowing bar. Cropped tight around the face (figure x 94–206, y 44–82).
 */
export const EYES_VB = { x: 94, y: 44, w: 112, h: 38 } as const;

export function EyesArt({ width }: { width: number }) {
  return (
    <Svg
      width={width}
      height={(width * EYES_VB.h) / EYES_VB.w}
      viewBox={`${EYES_VB.x} ${EYES_VB.y} ${EYES_VB.w} ${EYES_VB.h}`}
    >
      <Defs>
        <RadialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="0.4" stopColor="#EAF2FF" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#EAF2FF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="137" cy="63" rx="13" ry="9" fill="url(#eyeGlow)" />
      <Ellipse cx="163" cy="63" rx="13" ry="9" fill="url(#eyeGlow)" />
      <Path d="M129 63 C132.6 57.4 141.4 57.4 145 63 C141.4 68.2 132.6 68.2 129 63 Z" fill="#FFFFFF" />
      <Path d="M155 63 C158.6 57.4 167.4 57.4 171 63 C167.4 68.2 158.6 68.2 155 63 Z" fill="#FFFFFF" />
      {/* a pinpoint catchlight in each eye — keeps the gaze from reading flat */}
      <Circle cx="137" cy="62" r="2.4" fill="#FFFFFF" />
      <Circle cx="163" cy="62" r="2.4" fill="#FFFFFF" />
    </Svg>
  );
}

/** The twin flares the ignited gaze throws — one round halo per eye, not a
 *  single wide bar (the earlier shape read as a glowing visor). */
export function EyeFlareArt({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width * 38) / 112} viewBox="0 0 112 38">
      <Defs>
        <RadialGradient id="eyeFlareG" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="0.4" stopColor="#EAF2FF" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#EAF2FF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="43" cy="19" r="20" fill="url(#eyeFlareG)" />
      <Circle cx="69" cy="19" r="20" fill="url(#eyeFlareG)" />
    </Svg>
  );
}

/** The light the open eyes throw back onto the face. */
export function FaceWashArt({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width * 84) / 80} viewBox="0 0 80 84">
      <Defs>
        <RadialGradient id="faceWashG" cx="50%" cy="54%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.46" />
          <Stop offset="0.55" stopColor="#FFF6E4" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#FFF6E4" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="40" cy="42" rx="40" ry="42" fill="url(#faceWashG)" />
    </Svg>
  );
}

/**
 * The gaze-light that opens out of the eyes to take the whole screen — a
 * white-hot core falling away through gold into dark. The splash scales it
 * from 0 until it covers every corner, then cross-fades to Home.
 */
export function EyeBurstArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="eyeBurstG" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.15" stopColor="#FFF9EC" />
          <Stop offset="0.33" stopColor="#F5DCAC" />
          <Stop offset="0.55" stopColor="#C98F4E" />
          <Stop offset="0.78" stopColor="#4A2B14" />
          <Stop offset="1" stopColor="#0B0705" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill="url(#eyeBurstG)" />
    </Svg>
  );
}

/** The whisper of a sunrise horizon behind the figure (vertical band). */
export function HorizonArt() {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 100">
      <Defs>
        <LinearGradient id="horizonG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity="0" />
          <Stop offset="0.4" stopColor="#E29248" stopOpacity="0.085" />
          <Stop offset="0.56" stopColor="#F7D89C" stopOpacity="0.115" />
          <Stop offset="0.74" stopColor="#8C4016" stopOpacity="0.045" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d="M0 0H10V100H0Z" fill="url(#horizonG)" />
    </Svg>
  );
}

/** The warm bloom behind the whole figure — wide and soft, no hot core. */
export function AmbientGlow({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 102" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id="ambGlowG" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F7D89C" stopOpacity="0.17" />
          <Stop offset="0.38" stopColor="#E49248" stopOpacity="0.072" />
          <Stop offset="0.62" stopColor="#964216" stopOpacity="0.028" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="51" rx="50" ry="51" fill="url(#ambGlowG)" />
    </Svg>
  );
}

/** Halo behind the head — warm while he is still; cools once he wakes. */
export function HeadHalo({ size, cool }: { size: number; cool?: boolean }) {
  const id = cool ? "haloCool" : "haloWarm";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {cool ? (
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFEFA" stopOpacity="0.3" />
            <Stop offset="0.46" stopColor="#D8E4FF" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#D8E4FF" stopOpacity="0" />
          </RadialGradient>
        ) : (
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFF7E5" stopOpacity="0.22" />
            <Stop offset="0.48" stopColor={color.goldHi} stopOpacity="0.075" />
            <Stop offset="1" stopColor={color.goldHi} stopOpacity="0" />
          </RadialGradient>
        )}
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  );
}

/** The pool of light he is seated in — grounds the figure. */
export function FloorPool({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 34" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id="floorG" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F7D89C" stopOpacity="0.14" />
          <Stop offset="0.52" stopColor="#E49248" stopOpacity="0.04" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="17" rx="50" ry="17" fill="url(#floorG)" />
    </Svg>
  );
}

/** Ambient mandala — two ring sets that the splash counter-rotates. */
export function MandalaRingA({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <G fill="none" stroke={color.gold}>
        <Circle cx="150" cy="150" r="118" strokeWidth="1" opacity="0.22" />
        <Circle cx="150" cy="150" r="131" strokeWidth="0.8" opacity="0.15" />
      </G>
    </Svg>
  );
}

export function MandalaRingB({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Circle
        cx="150"
        cy="150"
        r="141"
        fill="none"
        stroke={color.goldHi}
        strokeWidth="5"
        opacity="0.12"
        strokeDasharray="1.4 13"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** One rising gold mote (static dot; the splash floats it upward). */
export function MoteArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Defs>
        <RadialGradient id="moteG" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F7D89C" stopOpacity="0.7" />
          <Stop offset="0.7" stopColor="#F7D89C" stopOpacity="0" />
          <Stop offset="1" stopColor="#F7D89C" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="5" cy="5" r="5" fill="url(#moteG)" />
    </Svg>
  );
}
