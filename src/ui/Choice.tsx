/**
 * Selection primitives for the onboarding questionnaire.
 * Big tap targets, one question per screen (spec:
 * docs/specs/onboarding-questionnaire.md:14).
 */
import React from "react";
import { Pressable, View } from "react-native";
import { color, radius, space, tapTarget } from "./tokens";
import { T } from "./Text";
import { Check } from "./icons";

/**
 * A full-width answer row. `selected` is carried by the saffron border + wash
 * (the action color) so it reads at a glance without spending gold, which the
 * design reserves for the primary action.
 */
export function OptionRow({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      // aria-checked, not accessibilityState: RN Web drops accessibilityState
      // here (verified — the DOM node carried role but no aria-checked), and a
      // radio's ARIA state is "checked" rather than "selected" regardless.
      // RN maps aria-* to accessibilityState on native, so this works on both.
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: tapTarget + space.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: selected ? color.saffron : color.line,
        backgroundColor: selected ? color.saffronWash : color.surface,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <T variant="bodyBold" tone={selected ? "saffron" : "cream"}>
          {label}
        </T>
        {sub ? (
          <T variant="caption" tone="muted">
            {sub}
          </T>
        ) : null}
      </View>
      {selected ? <Check size={20} color={color.saffron} /> : null}
    </Pressable>
  );
}

/** Progress dots — where am I, how much is left (spec :14). */
export function ProgressDots({ total, index }: { total: number; index: number }) {
  return (
    <View style={{ flexDirection: "row", gap: space.xs, justifyContent: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 18 : 6,
            height: 6,
            borderRadius: radius.chip,
            backgroundColor: i === index ? color.saffron : i < index ? color.saffronDeep : color.line,
          }}
        />
      ))}
    </View>
  );
}

/** DPDP consent tick. Unticked by default is a hard requirement (spec :36). */
export function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      // See OptionRow — accessibilityState does not reach the DOM here, and a
      // consent control that never announces its state is not acceptable.
      aria-checked={checked}
      onPress={onToggle}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: tapTarget,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: checked ? color.saffron : color.muted,
          backgroundColor: checked ? color.saffron : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Check size={16} color={color.ink} /> : null}
      </View>
      <T variant="bodyBold" style={{ flex: 1 }}>
        {label}
      </T>
    </Pressable>
  );
}
