import React, { useCallback } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { color } from "../../src/ui";
import { stopAudio } from "../../src/lib/audio";

/**
 * The meditation flow (sounds → setup → session) as one nested navigator, so
 * from the root stack it is a single route. The ambient sound is meant to carry
 * ACROSS these screens (spec: meditation.md), so the stop must fire only at the
 * flow boundary — this layout's useFocusEffect cleanup runs when the whole flow
 * is left (popped back to the tab), never on internal navigation between the
 * three screens. Backgrounding is handled separately by the scoped
 * shouldPlayInBackground:false in src/lib/audio.ts.
 */
export default function MeditationLayout() {
  useFocusEffect(useCallback(() => () => stopAudio(), []));

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.ink },
      }}
    />
  );
}
