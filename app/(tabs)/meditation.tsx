import React from "react";
import { Screen, Card, B } from "../../src/ui";

/** Meditation — 3-click flow per docs/specs/meditation.md. */
export default function Meditation() {
  return (
    <Screen>
      <B k="tab_meditation" variant="h1" />
      <Card>
        <B k="coming_soon" variant="body" tone="muted" />
      </Card>
    </Screen>
  );
}
