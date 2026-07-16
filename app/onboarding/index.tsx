import React, { useCallback, useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button, FooterAction, B, color, radius, space } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { markOnboarded, normaliseName, saveName } from "../../src/lib/profile";
import type { LanguageMode } from "../../src/types/db";

/**
 * Onboarding (docs/specs/onboarding-questionnaire.md).
 * Q1 language is ALWAYS first — it must apply before anything else renders.
 * Q2 name is the spec's one sanctioned free-text field (amended 2026-07-16)
 * and is skippable. Q3–Q12 (goal → consent → plan-ready) follow in the
 * questionnaire build cycle; finishing here marks the user onboarded so the
 * tabs gate lets them through.
 */
type Step = "language" | "name";

export default function Onboarding() {
  const { mode, setMode, t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>("language");
  const [name, setName] = useState("");

  const options: { value: LanguageMode; k: "lang_hindi" | "lang_english" | "lang_mixed" }[] = [
    { value: "hindi", k: "lang_hindi" },
    { value: "english", k: "lang_english" },
    { value: "mixed", k: "lang_mixed" },
  ];

  const finish = useCallback(
    async (withName: string | null) => {
      await saveName(withName);
      await markOnboarded();
      router.replace("/(tabs)");
    },
    [router],
  );

  if (step === "language") {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, gap: space.md, paddingTop: space.xxl }}>
          <Dots active={0} />
          <B k="q_language" variant="h1" center />
          {options.map((o) => (
            <Card
              key={o.value}
              onPress={() => setMode(o.value)}
              style={
                mode === o.value
                  ? { borderColor: color.saffron, backgroundColor: "rgba(240,118,30,0.10)" }
                  : undefined
              }
            >
              <B k={o.k} variant="bodyBold" noSub />
            </Card>
          ))}
        </View>
        <FooterAction>
          <Button k="continue" onPress={() => setStep("name")} />
        </FooterAction>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, gap: space.md, paddingTop: space.xxl }}>
        <Dots active={1} />
        <B k="q_name" variant="h1" center />
        <B k="q_name_hint" variant="caption" tone="muted" center />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("name_placeholder")}
          placeholderTextColor={color.muted}
          autoFocus
          returnKeyType="done"
          maxLength={24}
          onSubmitEditing={() => finish(normaliseName(name))}
          style={{
            marginTop: space.md,
            borderWidth: 1,
            borderColor: color.line,
            backgroundColor: color.surface,
            borderRadius: radius.button,
            paddingVertical: space.md,
            paddingHorizontal: space.lg,
            color: color.cream,
            fontSize: 20,
            textAlign: "center",
          }}
        />
      </View>
      <FooterAction>
        <Button k="continue" onPress={() => finish(normaliseName(name))} />
        <Button k="skip_word_q" kind="ghost" onPress={() => finish(null)} />
      </FooterAction>
    </Screen>
  );
}

/** Progress dots — 2 of the spec's 12 questions are built so far. */
function Dots({ active }: { active: number }) {
  return (
    <View style={{ flexDirection: "row", gap: space.xs, justifyContent: "center", marginBottom: space.sm }}>
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 7,
            height: 7,
            borderRadius: radius.chip,
            backgroundColor: i === active ? color.saffron : color.line,
          }}
        />
      ))}
    </View>
  );
}
