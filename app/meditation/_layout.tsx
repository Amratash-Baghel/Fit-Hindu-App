import React, { useCallback } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { color } from "../../src/ui";
import { stopAudio } from "../../src/lib/audio";

/**
 * The meditation flow (start → session) as one nested navigator, so from the
 * root stack it is a single route. The ambient sound is meant to carry ACROSS
 * these screens (spec: meditation.md), so the stop must fire only at the flow
 * boundary — this layout's useFocusEffect cleanup runs when the whole flow is
 * left (popped back to the tab), never on internal navigation inside it.
 * Backgrounding is handled separately by the scoped shouldPlayInBackground:false
 * in src/lib/audio.ts.
 *
 * UI9 slice C: the flow is two screens, not three — `sounds.tsx` + `setup.tsx`
 * retired into `start.tsx`, and the hub's quick start enters at `session`
 * directly, having started the loop itself. The stop below still owns the
 * ending in both cases.
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
