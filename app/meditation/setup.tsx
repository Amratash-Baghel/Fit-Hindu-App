import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Chip, Button, FooterAction, B, T, color, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";

const PRESETS = [5, 10, 15, 20, 30] as const;

/**
 * Step 2 — instructions + timer. Default stays 15 minutes so the quick path
 * is untouched: Start → Next → Begin and you're meditating (spec: 3 clicks).
 * The demo video slot is a placeholder until a guided video is uploaded via
 * the admin panel (sounds/exercises pattern).
 */
export default function MeditationSetup() {
  const router = useRouter();
  const { t } = useI18n();
  const { sound } = useLocalSearchParams<{ sound: string }>();
  const [minutes, setMinutes] = useState<number>(15);

  return (
    <Screen scroll={false}>
      <View style={{ paddingTop: space.md, gap: space.md, flex: 1 }}>
        <B k="how_to_meditate" variant="h1" />

        {/* demo video placeholder — same upload-into-placeholder pattern */}
        <View
          style={{
            height: 150,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#4a3416",
            backgroundColor: color.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T style={{ fontSize: 40 }}>🧘</T>
          <T variant="caption" tone="muted">
            {t("our_avatar")}
          </T>
        </View>

        <Card>
          <B k="med_instructions" variant="body" />
        </Card>

        <View>
          <B k="timer_label" variant="bodyBold" noSub />
          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm, flexWrap: "wrap" }}>
            {PRESETS.map((m) => (
              <Chip
                key={m}
                label={`${m} ${t("minutes_short")}`}
                active={minutes === m}
                onPress={() => setMinutes(m)}
              />
            ))}
          </View>
        </View>
      </View>

      <FooterAction>
        <Button
          k="begin"
          onPress={() =>
            router.push({ pathname: "/meditation/session", params: { sound: sound ?? "silent", min: String(minutes) } })
          }
        />
      </FooterAction>
    </Screen>
  );
}
