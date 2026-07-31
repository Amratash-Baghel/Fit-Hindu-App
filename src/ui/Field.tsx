/**
 * Text / number inputs — the design-system input primitives (the app had none
 * before). Token-driven so screens never hand-roll border/color/spacing values.
 */
import React from "react";
import { View, TextInput, type KeyboardTypeOptions } from "react-native";
import { color, radius, space, type } from "./tokens";
import { T } from "./Text";

interface FieldProps {
  /** already-localised label (pass t("...") ) */
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  /** small trailing hint inside the row, e.g. "cm" / "kg" */
  suffix?: string;
  maxLength?: number;
}

function FieldBase({ label, value, onChangeText, placeholder, keyboardType, suffix, maxLength }: FieldProps) {
  return (
    <View style={{ gap: space.xs }}>
      {label ? (
        <T variant="caption" tone="muted">
          {label}
        </T>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: color.line,
          borderRadius: radius.button,
          backgroundColor: color.surface2,
          paddingHorizontal: space.md,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.muted}
          keyboardType={keyboardType}
          maxLength={maxLength}
          style={{
            flex: 1,
            color: color.cream,
            paddingVertical: space.md,
            ...(type.body as object),
          }}
        />
        {suffix ? (
          <T variant="caption" tone="muted">
            {suffix}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export function TextField(props: FieldProps) {
  return <FieldBase {...props} />;
}

/** Numeric variant — numeric keyboard by default. */
export function NumberField(props: FieldProps) {
  return <FieldBase keyboardType="numeric" {...props} />;
}
