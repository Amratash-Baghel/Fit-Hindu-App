/**
 * Text primitives. ALL text in the app renders through these — they carry the
 * type scale and the bilingual (mixed-mode) rendering, so screens never
 * hardcode font sizes or strings.
 */
import React from "react";
import { Text as RNText, View, type TextStyle, type StyleProp } from "react-native";
import { color, type } from "./tokens";
import { useI18n, type StringKey } from "../lib/i18n";

type Variant = keyof typeof type;

interface TProps {
  variant?: Variant;
  tone?: "cream" | "muted" | "soft" | "saffron" | "gold" | "ok" | "danger" | "nightMuted";
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
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
export function T({ variant = "body", tone = "cream", style, children, numberOfLines }: TProps) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[type[variant] as TextStyle, { color: tones[tone] }, style]}
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
