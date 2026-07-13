import React from "react";
import { Screen, Card, B } from "../../src/ui";

/** Sleep sounds — night-indigo mood (the one deliberate palette shift). */
export default function Sleep() {
  return (
    <Screen night>
      <B k="tab_sleep" variant="h1" />
      <Card night>
        <B k="coming_soon" variant="body" tone="muted" />
      </Card>
    </Screen>
  );
}
