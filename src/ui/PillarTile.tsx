/**
 * PillarTile — the big module tiles on the Body / Mind / Soul pages
 * (docs/specs/redesign-bms.md phase 0): two-ish tiles fill the page, each one
 * door into a module. A tile can also be a `soon` teaser (dimmed, chip, no
 * press) for modules the redesign has planned but not built (Daily Gita,
 * Mantra Ucharan, Bhajan Alarm).
 *
 * Redesign "tiles that speak": an optional `meta` footer tells you what's
 * behind the door before you tap — "24 exercises · Home & gym" — numbers
 * from content data (the countPublished helpers), never hardcoded. The icon
 * sits in the embossed IconSlot so every door shares one material language.
 */
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "./PressableScale";
import { Chip } from "./Card";
import { B, T } from "./Text";
import { ChevronRight } from "./icons";
import { IconSlot } from "./IconSlot";
import { color, coin, radius, space } from "./tokens";
import { useI18n, type StringKey } from "../lib/i18n";

interface Props {
  titleK: StringKey;
  subK?: StringKey;
  icon: React.ReactNode;
  /** pillar accent — used for the wash gradient */
  wash: string;
  onPress?: () => void;
  /** coming-soon teaser: dimmed, chip instead of chevron, not tappable */
  soon?: boolean;
  /** already logged today — shows a tick in place of the chevron */
  done?: boolean;
  /** "what's inside" stats, already localised — null entries are skipped so a
   *  count that hasn't landed (or failed) simply doesn't show */
  meta?: (string | null)[];
  style?: StyleProp<ViewStyle>;
}

export function PillarTile({ titleK, subK, icon, wash, onPress, soon, done, meta, style }: Props) {
  const { t } = useI18n();
  const metaShown = (meta ?? []).filter((m): m is string => !!m);

  const inner = (
    <View style={[styles.tile, soon && { opacity: 0.55 }]}>
      <LinearGradient
        colors={[wash, "rgba(0,0,0,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <IconSlot>{icon}</IconSlot>
        {soon ? (
          <Chip label={t("coming_soon")} />
        ) : done ? (
          <View style={styles.tickDot}>
            <T style={{ fontSize: 14, fontWeight: "800", color: coin.face }}>✓</T>
          </View>
        ) : (
          <ChevronRight />
        )}
      </View>
      <View style={{ gap: metaShown.length ? space.md : 0 }}>
        <View>
          <B k={titleK} variant="h1" noSub />
          {subK ? <B k={subK} variant="caption" tone="muted" noSub /> : null}
        </View>
        {metaShown.length ? (
          <View style={styles.metaRow}>
            {metaShown.map((m, i) => (
              <React.Fragment key={m}>
                {i > 0 ? <View style={styles.metaDot} /> : null}
                <T variant="caption" tone="soft" style={{ fontSize: 12 }}>
                  {m}
                </T>
              </React.Fragment>
            ))}
          </View>
        ) : null}
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
    // Content-sized, not flex-filled — a stretched tile used to leave a
    // module with no meta row mostly empty. Screens carrying these should
    // scroll (default Screen behaviour) rather than force-fit the column.
    padding: space.lg,
    gap: space.md,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tickDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(58,46,36,0.7)",
    paddingTop: space.sm + 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: color.line,
  },
});
