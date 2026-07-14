import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Chip, Button, FooterAction, B, AvatarTile, space } from "../../src/ui";
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
        <AvatarTile height={150} playSize={44} silhouetteSize={76} />

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
