/**
 * PillarTile — the big module tiles on the Body / Mind / Soul pages
 * (docs/specs/redesign-bms.md phase 0): two-ish tiles fill the page, each one
 * door into a module. A tile can also be a `soon` teaser (dimmed, chip, no
 * press) for modules the redesign has planned but not built (Daily Gita,
 * Mantra Ucharan, Bhajan Alarm).
 */
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "./PressableScale";
import { Chip } from "./Card";
import { B } from "./Text";
import { ChevronRight } from "./icons";
import { color, radius, space } from "./tokens";
import { useI18n, type StringKey } from "../lib/i18n";

interface Props {
  titleK: StringKey;
  subK?: StringKey;
  icon: React.ReactNode;
  /** pillar accent — used for the wash gradient + icon slot */
  wash: string;
  onPress?: () => void;
  /** coming-soon teaser: dimmed, chip instead of chevron, not tappable */
  soon?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PillarTile({ titleK, subK, icon, wash, onPress, soon, style }: Props) {
  const { t } = useI18n();

  const inner = (
    <View style={[styles.tile, soon && { opacity: 0.55 }]}>
      <LinearGradient
        colors={[wash, "rgba(0,0,0,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <View style={[styles.iconSlot, { backgroundColor: wash }]}>{icon}</View>
        {soon ? <Chip label={t("coming_soon")} /> : <ChevronRight />}
      </View>
      <View>
        <B k={titleK} variant="h1" noSub />
        {subK ? <B k={subK} variant="caption" tone="muted" noSub /> : null}
      </View>
    </View>
  );

  if (soon || !onPress) {
    return <View style={[styles.frame, style]}>{inner}</View>;
  }
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityLabel={t(titleK)}
      style={[styles.frame, style]}
    >
      {inner}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  tile: {
    flex: 1,
    padding: space.lg,
    justifyContent: "space-between",
    minHeight: 150,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconSlot: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
