/**
 * Text primitives. ALL text in the app renders through these — they carry the
 * type scale and the bilingual (mixed-mode) rendering, so screens never
 * hardcode font sizes or strings.
 */
import React from "react";
import { Text as RNText, StyleSheet, View, type TextStyle, type StyleProp } from "react-native";
import { color, type } from "./tokens";
import { useI18n, type StringKey } from "../lib/i18n";

/**
 * Android clips a glyph to its line box: when a screen overrides `fontSize`
 * larger than the variant's `lineHeight` (e.g. the 108 jap counter or a 56px
 * timer over the display variant's 38px line), the top and bottom of the
 * number get shaved. Web doesn't clip, so it only shows on device. Guarantee
 * the line box is always taller than the glyph — the 1.35 headroom also keeps
 * it clear at Android's 1.3x accessibility font scale (fontSize scales but a
 * fixed lineHeight would not, so we size the headroom above that ratio).
 */
function withLineHeadroom(style: StyleProp<TextStyle>): TextStyle {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fs = typeof flat.fontSize === "number" ? flat.fontSize : undefined;
  const lh = typeof flat.lineHeight === "number" ? flat.lineHeight : undefined;
  if (fs && (lh === undefined || lh < fs * 1.2)) {
    return { ...flat, lineHeight: Math.round(fs * 1.35) };
  }
  return flat;
}

type Variant = keyof typeof type;

interface TProps {
  variant?: Variant;
  tone?: "cream" | "muted" | "soft" | "saffron" | "gold" | "ok" | "danger" | "nightMuted";
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  /** Inline text links (e.g. the consent screen's privacy policy). */
  onPress?: () => void;
}

const tones = {
  cream: color.cream,
  muted: color.muted,
  soft: color.bodySoft,
  saffron: color.saffron,
  gold: color.gold,
  ok: color.ok,
  danger: color.danger,
  /** secondary text on the night ground (sleep surfaces only) */
  nightMuted: color.nightMuted,
} as const;

/** Raw styled text — use ONLY for already-localised values (numbers, names). */
export function T({ variant = "body", tone = "cream", style, children, numberOfLines, onPress }: TProps) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      onPress={onPress}
      accessibilityRole={onPress ? "link" : undefined}
      // `tone` is the DEFAULT color (first), so an explicit `color` in `style`
      // still wins — e.g. the ink-on-gold (#241503) button/jap glyph text.
      // B2's withLineHeadroom refactor (a42d45f) once put tone LAST, which
      // silently overrode caller colors to cream. Order matters here.
      style={[{ color: tones[tone] }, withLineHeadroom([type[variant] as TextStyle, style])]}
    >
      {children}
    </RNText>
  );
}

interface BProps {
  k: StringKey;
  variant?: Variant;
  tone?: TProps["tone"];
  style?: StyleProp<TextStyle>;
  /** hide the English caption even in mixed mode (dense UI spots) */
  noSub?: boolean;
  center?: boolean;
}

/**
 * Bilingual string — THE way to render catalog strings.
 * hindi/english mode → one line; mixed mode → primary + small muted caption.
 */
export function B({ k, variant = "body", tone = "cream", style, noSub, center }: BProps) {
  const { t, tSub } = useI18n();
  const sub = noSub ? null : tSub(k);
  return (
    <View style={center ? { alignItems: "center" } : undefined}>
      <T variant={variant} tone={tone} style={style}>
        {t(k)}
      </T>
      {sub ? (
        <T variant="caption" tone="muted">
          {sub}
        </T>
      ) : null}
    </View>
  );
}
