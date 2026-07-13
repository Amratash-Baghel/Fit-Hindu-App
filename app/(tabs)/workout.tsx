import React from "react";
import { Screen, Card, B } from "../../src/ui";

/** Workout — v1 build priority; screen builds next per docs/specs/workout.md
 *  (3 modes: home / gym / custom-by-body-area over the exercises library). */
export default function Workout() {
  return (
    <Screen>
      <B k="tab_workout" variant="h1" />
      <Card>
        <B k="coming_soon" variant="body" tone="muted" />
      </Card>
    </Screen>
  );
}
