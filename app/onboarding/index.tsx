import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button, FooterAction, B, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import type { LanguageMode } from "../../src/types/db";

/**
 * Onboarding — question #1 is ALWAYS language (spec:
 * docs/specs/onboarding-questionnaire.md). Scaffold implements just this
 * first question wired to the i18n mode; the full questionnaire follows.
 */
export default function OnboardingLanguage() {
  const { mode, setMode } = useI18n();
  const router = useRouter();

  const options: { value: LanguageMode; k: "lang_hindi" | "lang_english" | "lang_mixed" }[] = [
    { value: "hindi", k: "lang_hindi" },
    { value: "english", k: "lang_english" },
    { value: "mixed", k: "lang_mixed" },
  ];

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, gap: space.md, paddingTop: space.xxl }}>
        <B k="q_language" variant="h1" center />
        {options.map((o) => (
          <Card
            key={o.value}
            onPress={() => setMode(o.value)}
            style={
              mode === o.value
                ? { borderColor: "#F0761E", backgroundColor: "rgba(240,118,30,0.10)" }
                : undefined
            }
          >
            <B k={o.k} variant="bodyBold" noSub />
          </Card>
        ))}
      </View>
      <FooterAction>
        <Button k="continue" onPress={() => router.replace("/(tabs)")} />
      </FooterAction>
    </Screen>
  );
}
