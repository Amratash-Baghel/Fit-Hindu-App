import React from "react";
import { View } from "react-native";
import { Screen, Card, B, T, color, space } from "../../src/ui";

/** Daily Home — scaffold stub. The real habit surface (deity-of-the-day,
 *  shloka, streak diyas, today cards with ticks) builds against the
 *  program_days / daily_activity queries in docs/specs/data-model.md. */
export default function Home() {
  return (
    <Screen>
      <View style={{ paddingVertical: space.sm }}>
        <B k="greeting" variant="h1" />
      </View>
      <Card>
        <B k="todays_workout" variant="bodyBold" />
        <T variant="caption" tone="muted">
          —
        </T>
      </Card>
      <Card>
        <B k="todays_diet" variant="bodyBold" />
      </Card>
      <Card>
        <B k="todays_meditation" variant="bodyBold" />
      </Card>
      <Card>
        <B k="todays_jap" variant="bodyBold" />
      </Card>
      <T variant="caption" tone="muted" style={{ marginTop: space.lg }}>
        v0.1 scaffold
      </T>
    </Screen>
  );
}
