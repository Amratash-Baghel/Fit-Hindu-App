/**
 * PillarTile — the big module tiles on the Body / Mind / Soul pages
 * (docs/specs/redesign-bms.md phase 0): two-ish tiles fill the page, each one
 * door into a module. A tile can also be a `soon` teaser (dimmed, chip, no
 * press) for modules the redesign has planned but not built (Daily Gita,
 * Mantra Ucharan, Bhajan Alarm).
 *
 * Redesign "tiles that speak", v2-mockup fidelity: the optional `meta` footer
 * tells you what's behind the door before you tap — "14 exercises · 20 min ·
 * Full body" — with the NUMBERS set in gold (mockup .t-stat b) so the stats
 * read at a glance. Numbers come from content data (the countPublished
 * helpers), never hardcoded. The icon sits in the embossed IconSlot, and live
 * tiles carry the same faint glint sweep as the ember cards — one material
 * language across every door.
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

/** One footer stat: `{ v, label }` renders the value in gold (mockup .t-stat);
 *  a plain string renders as a quiet word ("Full body", "Home & gym"). */
export type TileStat = string | { v: string | number; label?: string } | null;

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
  meta?: TileStat[];
  style?: StyleProp<ViewStyle>;
}

export function PillarTile({ titleK, subK, icon, wash, onPress, soon, done, meta, style }: Props) {
  const { t } = useI18n();
  const metaShown = (meta ?? []).filter((m): m is Exclude<TileStat, null> => !!m);

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
            <T style={{ fontSize: 15, fontWeight: "800", color: coin.face }}>✓</T>
          </View>
        ) : (
          <ChevronRight />
        )}
      </View>
      <View style={{ gap: metaShown.length ? space.md : 0 }}>
        <View>
          <B k={titleK} variant="h2" noSub style={{ fontWeight: "800" }} />
          {subK ? <B k={subK} variant="caption" tone="muted" noSub /> : null}
        </View>
        {metaShown.length ? (
          <View style={styles.metaRow}>
            {metaShown.map((m, i) => {
              const key = typeof m === "string" ? m : `${m.v}-${m.label ?? ""}`;
              return (
                <React.Fragment key={key}>
                  {i > 0 ? <View style={styles.metaDot} /> : null}
                  {typeof m === "string" ? (
                    <T variant="caption" tone="soft" style={styles.statWord}>
                      {m}
                    </T>
                  ) : (
                    <View style={styles.stat}>
                      <T style={styles.statValue}>{String(m.v)}</T>
                      {m.label ? (
                        <T variant="caption" tone="soft" style={styles.statWord}>
                          {m.label}
                        </T>
                      ) : null}
                    </View>
                  )}
                </React.Fragment>
              );
            })}
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
    borderRadius: radius.card + 2,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.sm + 1,
    borderTopWidth: 1,
    borderTopColor: "rgba(58,46,36,0.7)",
    paddingTop: space.sm + 3,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: color.line,
  },
  stat: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: color.goldHi,
    fontVariant: ["tabular-nums"],
  },
  statWord: {
    fontSize: 12,
    lineHeight: 18,
  },
});
