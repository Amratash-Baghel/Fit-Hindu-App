import React from "react";
import { Screen, Card, B } from "../../src/ui";

/** Mantra jap — per-deity mala counter (108) per docs/specs/. */
export default function Jap() {
  return (
    <Screen>
      <B k="tab_jap" variant="h1" />
      <Card>
        <B k="coming_soon" variant="body" tone="muted" />
      </Card>
    </Screen>
  );
}
