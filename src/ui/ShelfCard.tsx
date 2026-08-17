/**
 * ShelfCard — one card on a horizontal shelf (UI9 slice B, plate 09): the
 * embossed `IconSlot` over a name and a meta line, in a fixed-width `Card`.
 *
 * The workout tab's templates, the user's own workouts and the "+ New" card are
 * all this one shape, which is what lets three former stacked sections read as
 * a single swipeable row. Nothing here is workout-specific — the icon and the
 * strings come from the caller.
 */
import React from "react";
import { View } from "react-native";
import { Card } from "./Card";
import { IconSlot } from "./IconSlot";
import { T } from "./Text";
import { space } from "./tokens";

/** Fixed so the next card peeks in from the right edge — the affordance that
 *  says "this row scrolls" without a scrollbar on Android. */
export const SHELF_CARD_WIDTH = 158;

interface Props {
  icon: React.ReactNode;
  /** already-localised */
  title: string;
  /** already-localised second line (e.g. "18 min · 7 exercises · Beginner") */
  meta?: string | null;
  onPress: () => void;
}

export function ShelfCard({ icon, title, meta, onPress }: Props) {
  return (
    <Card onPress={onPress} style={{ width: SHELF_CARD_WIDTH, padding: space.md }}>
      <IconSlot size={38} radius={12}>
        {icon}
      </IconSlot>
      <View style={{ marginTop: space.sm }}>
        <T variant="bodyBold" numberOfLines={2}>
          {title}
        </T>
        {meta ? (
          <T variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
            {meta}
          </T>
        ) : null}
      </View>
    </Card>
  );
}
