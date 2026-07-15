/**
 * Mantra jap (docs/specs/jap.md) — the devotional heart of the app.
 *
 * Content-driven: this screen renders whatever `mantras` the team has
 * published, the user's chosen deity first. Publishing a row fills the tab —
 * no code change, no release. Nothing here names a deity (standing rule).
 *
 * Core worship is never gated: no sign-in, no paywall, ever.
 */
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Screen, Card, B, T, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { listMantras, type MantraWithDeity } from "../../src/lib/content";
import { useProfileDeity } from "../../src/lib/profile";

export default function Jap() {
  const { loc } = useI18n();
  const deityId = useProfileDeity();
  const [mantras, setMantras] = useState<MantraWithDeity[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (deityId === undefined) return; // still resolving the profile
    let alive = true;
    listMantras(deityId)
      .then((m) => {
        if (!alive) return;
        setMantras(m);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [deityId]);

  return (
    <Screen>
      <B k="tab_jap" variant="h1" />

      {status === "loading" ? <B k="loading" variant="body" tone="muted" /> : null}
      {status === "error" ? <B k="jap_error" variant="body" tone="muted" /> : null}

      {/* The launch state: honest and calm, not an error. */}
      {status === "ok" && mantras?.length === 0 ? (
        <Card>
          <B k="coming_soon" variant="body" tone="muted" />
        </Card>
      ) : null}

      {mantras?.map((m) => (
        <Card key={m.id}>
          <View style={{ gap: space.sm }}>
            {m.deity ? (
              <T variant="eyebrow" tone="saffron">
                {loc(m.deity.name_hi, m.deity.name_en)}
              </T>
            ) : null}
            {/* Devanagari is never translated — it is the mantra itself. */}
            <T variant="h2">{m.text_devanagari}</T>
            {m.transliteration ? (
              <T variant="caption" tone="muted">
                {m.transliteration}
              </T>
            ) : null}
            {m.meaning_hi || m.meaning_en ? (
              <T variant="caption" tone="soft">
                {loc(m.meaning_hi ?? "", m.meaning_en ?? "")}
              </T>
            ) : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
