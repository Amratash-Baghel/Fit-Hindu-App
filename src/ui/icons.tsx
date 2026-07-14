/**
 * Icon set — line icons ported from the approved mockup SVGs
 * (docs/mockups/Main design.html). No emoji anywhere in the UI; emoji read
 * as cheap and render inconsistently across Android OEM fonts.
 * All stroke icons take `color` + `size`; keep stroke width 1.8 for the
 * consistent weight the design system expects.
 */
import React from "react";
import { Text, type ColorValue } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { color as palette } from "./tokens";

export interface IconProps {
  size?: number;
  color?: ColorValue;
}

const S = 1.8; // stroke width

export function HomeIcon({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z" stroke={color} strokeWidth={S} strokeLinejoin="round" />
    </Svg>
  );
}

export function DumbbellIcon({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 6.5v11M17.5 6.5v11M6.5 12h11M3 9v6M21 9v6" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function LotusIcon({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3c-4 4-6 7-6 10a6 6 0 0 0 12 0c0-3-2-6-6-10z" stroke={color} strokeWidth={S} strokeLinejoin="round" />
    </Svg>
  );
}

export function MalaIcon({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={S} />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={S} />
    </Svg>
  );
}

export function MoonIcon({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 13A8 8 0 1 1 11 4a7 7 0 0 0 9 9z" stroke={color} strokeWidth={S} strokeLinejoin="round" />
    </Svg>
  );
}

export function BowlIcon({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={S} />
      <Path d="M12 4v-2M12 22v-2" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9a6 6 0 0 1 12 0c0 6 2 6.5 2 8H4c0-1.5 2-2 2-8z" stroke={color} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M10 20a2 2 0 0 0 4 0" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function MuteIcon({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9v6h4l5 4V5L8 9H4z" stroke={color} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M16 9.5l4 5M20 9.5l-4 5" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronRight({ size = 20, color = palette.saffron }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlayIcon({ size = 14, color = "#241503" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4l13 8-13 8z" fill={color} />
    </Svg>
  );
}

/** The streak/completion diya — filled, from the mockup. */
export function DiyaIcon({ size = 26, dim = false }: IconProps & { dim?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={dim ? 0.3 : 1}>
      <Path d="M12 3c1.8 2 1.4 3.8 0 5-1.4-1.2-1.8-3 0-5z" fill={palette.goldHi} />
      <Path d="M4 13h16c0 3.3-3.6 6-8 6s-8-2.7-8-6z" fill={palette.saffronDeep} />
      <Path d="M12 8.5c.9 1 .7 1.9 0 2.5-.7-.6-.9-1.5 0-2.5z" fill={palette.saffron} />
    </Svg>
  );
}

/** Avatar silhouette for video placeholders (mockup workout hero). */
export function AvatarSilhouette({ size = 100, color = palette.saffronDeep }: IconProps) {
  const h = size * 1.25;
  return (
    <Svg width={size} height={h} viewBox="0 0 120 150" opacity={0.5}>
      <Circle cx="60" cy="34" r="18" fill={color} />
      <Path d="M60 56c-20 0-30 14-30 34l12 4-4 56h44l-4-56 12-4c0-20-10-34-30-34z" fill={color} />
    </Svg>
  );
}

/** ॐ — a Devanagari glyph (not an emoji), styled consistently. */
export function OmGlyph({ size = 22, color = palette.muted }: IconProps) {
  return (
    <Text style={{ fontSize: size, color, fontWeight: "700", lineHeight: size * 1.25 }}>ॐ</Text>
  );
}
