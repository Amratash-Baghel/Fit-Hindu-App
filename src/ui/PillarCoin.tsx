/**
 * PillarCoin — the Home trinity's 3D "gold coin" medallion, ported from the
 * approved clickable mockup (docs/mockups/bms-redesign-v2.html): an outer
 * progress ring, a metal gold bezel, and a dark embossed face carrying the
 * pillar icon + count, over a soft pillar-colored aura.
 *
 * Pure static SVG — no animation layers of its own (the mockup's ripples/
 * glint are browser-cheap but Reanimated-expensive ×3), so three coins cost
 * near nothing on the low-end Android this app targets. The entrance
 * choreography stays with Reveal, exactly like the flat rings this replaces.
 *
 * The mockup's conic bezel is approximated with a vertical metal gradient —
 * react-native-svg has no conic gradient, and a lit-from-above metal reads the
 * same at 9dp wide. Gradient ids are salted with the tint so three coins on
 * one screen never collide on react-native-web (inline <svg> ids are global).
 */
import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { coin } from "./tokens";

interface Props {
  /** outer box (ring included) in dp */
  size: number;
  /** 0..1 */
  progress: number;
  /** pillar accent — ring + aura */
  tint: string;
  /** ring track (unfilled part) — the pillar's wash */
  track: string;
  children?: React.ReactNode;
}

export function PillarCoin({ size, progress, tint, track, children }: Props) {
  const S = size;
  const c = S / 2;
  const ringStroke = 6;
  const ringR = c - ringStroke / 2 - 1;
  const bezelW = 9;
  const bezelOuterR = ringR - ringStroke / 2 - 3;
  const bezelR = bezelOuterR - bezelW / 2;
  const faceR = bezelOuterR - bezelW;
  const circ = 2 * Math.PI * ringR;
  const clamped = Math.max(0, Math.min(1, progress));
  // web renders inline <svg> where ids are document-global — salt with the tint
  const uid = tint.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <View style={{ width: S, height: S, alignItems: "center", justifyContent: "center" }}>
      <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: "absolute" }}>
        <Defs>
          {/* the metal — the `coin` tokens (ported from the mockup's --metal) */}
          <SvgLinearGradient id={`metal-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={coin.metal[0]} />
            <Stop offset="0.26" stopColor={coin.metal[1]} />
            <Stop offset="0.58" stopColor={coin.metal[2]} />
            <Stop offset="1" stopColor={coin.metal[3]} />
          </SvgLinearGradient>
          {/* embossed dark face, lit from the upper left */}
          <RadialGradient id={`face-${uid}`} cx="42%" cy="34%" r="80%">
            <Stop offset="0" stopColor={coin.faceHi} />
            <Stop offset="0.74" stopColor={coin.face} />
            <Stop offset="1" stopColor={coin.faceEdge} />
          </RadialGradient>
          {/* the pillar's aura — a soft colour bloom behind the whole coin */}
          <RadialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity="0.14" />
            <Stop offset="0.72" stopColor={tint} stopOpacity="0.1" />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Circle cx={c} cy={c} r={c} fill={`url(#glow-${uid})`} />

        {/* progress ring — track then fill, rotated so 0 starts at 12 o'clock */}
        <Circle cx={c} cy={c} r={ringR} stroke={track} strokeWidth={ringStroke} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={c}
            cy={c}
            r={ringR}
            stroke={tint}
            strokeWidth={ringStroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - clamped)}
            // an SVG transform string, not rotation/origin props — the string
            // form is honored identically on native AND react-native-web, so
            // the arc reliably starts at 12 o'clock everywhere
            transform={`rotate(-90 ${c} ${c})`}
          />
        ) : null}

        {/* gold bezel with hairline emboss edges */}
        <Circle cx={c} cy={c} r={bezelR} stroke={`url(#metal-${uid})`} strokeWidth={bezelW} fill="none" />
        <Circle cx={c} cy={c} r={bezelOuterR} stroke={coin.embossHi} strokeWidth={1} fill="none" />
        <Circle cx={c} cy={c} r={faceR + 0.5} stroke={coin.embossShade} strokeWidth={1} fill="none" />

        {/* the dark coin face */}
        <Circle cx={c} cy={c} r={faceR} fill={`url(#face-${uid})`} />
      </Svg>
      {children}
    </View>
  );
}
