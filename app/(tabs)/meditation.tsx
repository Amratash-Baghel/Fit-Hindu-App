import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Button, FooterAction, B, OmGlyph, color, space } from "../../src/ui";

/** Meditation entry — click 1 of the 3-click flow (docs/specs/meditation.md). */
export default function Meditation() {
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
        <View
          style={{
            width: 132,
            height: 132,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#4a3416",
            backgroundColor: "rgba(217,164,65,0.06)",
            shadowColor: color.gold,
            shadowOpacity: 0.25,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <OmGlyph size={64} color={color.gold} />
        </View>
        <B k="tab_meditation" variant="h1" center />
        <B k="med_tagline" variant="caption" tone="muted" center noSub />
      </View>
      <FooterAction>
        <Button k="start_meditation" onPress={() => router.push("/meditation/sounds")} />
      </FooterAction>
    </Screen>
  );
}
