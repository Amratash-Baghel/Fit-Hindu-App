import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Button, FooterAction, B, T, space } from "../../src/ui";

/** Meditation entry — click 1 of the 3-click flow (docs/specs/meditation.md). */
export default function Meditation() {
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
        <T style={{ fontSize: 72, color: "#D9A441" }}>ॐ</T>
        <B k="tab_meditation" variant="h1" center />
        <B k="med_tagline" variant="caption" tone="muted" center noSub />
      </View>
      <FooterAction>
        <Button k="start_meditation" onPress={() => router.push("/meditation/sounds")} />
      </FooterAction>
    </Screen>
  );
}
