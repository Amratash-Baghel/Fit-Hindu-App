import React, { useEffect, useState } from "react";
import { View, ScrollView, Linking, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  Screen,
  Button,
  FooterAction,
  SelectCard,
  Checkbox,
  ProgressDots,
  TextField,
  B,
  DiyaIcon,
  space,
  color,
} from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { supabase } from "../../src/lib/supabase";
import { saveOnboarding, type OnboardingAnswers } from "../../src/lib/onboarding";
import { markOnboarded, normaliseName, saveName } from "../../src/lib/profile";
import type { AgeBand, BodyArea, DietType, Goal, LanguageMode, Level, WorkoutMode } from "../../src/types/db";

const PRIVACY_URL = "https://fithindu.app/privacy"; // placeholder; wire real URL when hosted

type StepId =
  | "language" | "name" | "goal" | "body_focus" | "level" | "days" | "age" | "diet" | "mode" | "deity" | "consent" | "ready";

const STEPS: StepId[] = ["language", "name", "goal", "body_focus", "level", "days", "age", "diet", "mode", "deity", "consent", "ready"];

const LANGUAGES: { value: LanguageMode; k: StringKey }[] = [
  { value: "hindi", k: "lang_hindi" },
  { value: "english", k: "lang_english" },
  { value: "mixed", k: "lang_mixed" },
];
const GOALS: { value: Goal; k: StringKey }[] = [
  { value: "weight_gain", k: "goal_weight_gain" },
  { value: "strength", k: "goal_strength" },
  { value: "weight_loss", k: "goal_weight_loss" },
  { value: "healthy_routine", k: "goal_healthy_routine" },
];
const BODY_AREAS: { value: BodyArea; k: StringKey }[] = [
  { value: "full_body", k: "area_full_body" },
  { value: "chest", k: "area_chest" },
  { value: "back", k: "area_back" },
  { value: "shoulders", k: "area_shoulders" },
  { value: "arms", k: "area_arms" },
  { value: "core", k: "area_core" },
  { value: "legs", k: "area_legs" },
];
const LEVELS: { value: Level; k: StringKey }[] = [
  { value: "beginner", k: "level_beginner" },
  { value: "intermediate", k: "level_intermediate" },
  { value: "advanced", k: "level_advanced" },
];
const DAYS: { value: number; k: StringKey }[] = [
  { value: 3, k: "days_3" },
  { value: 5, k: "days_5" },
  { value: 7, k: "days_7" },
];
const AGES: { value: AgeBand; k: StringKey }[] = [
  { value: "18_25", k: "age_18_25" },
  { value: "26_35", k: "age_26_35" },
  { value: "36_50", k: "age_36_50" },
  { value: "50_plus", k: "age_50_plus" },
];
const DIETS: { value: DietType; k: StringKey }[] = [
  { value: "veg", k: "diet_veg" },
  { value: "sattvic", k: "diet_sattvic" },
  { value: "egg", k: "diet_egg" },
  { value: "nonveg", k: "diet_nonveg" },
];
const MODES: { value: WorkoutMode | null; k: StringKey }[] = [
  { value: "home", k: "mode_home" },
  { value: "gym", k: "mode_gym" },
  { value: null, k: "mode_decide_later" },
];

export default function Onboarding() {
  const { mode: langMode, setMode, t, tSub } = useI18n();
  const router = useRouter();

  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    goal: null,
    body_focus: [],
    level: null,
    days_per_week: null,
    age_band: null,
    diet_type: null,
    workout_mode_pref: null,
    deity_id: null,
  });
  const [name, setName] = useState(""); // Q2 — the spec's one free-text field
  const [modeChosen, setModeChosen] = useState(false); // language selected explicitly
  // workout_mode_pref: null is a REAL answer ("decide later"), so a separate
  // flag distinguishes "not answered yet" from "chose decide later".
  const [modeAnswered, setModeAnswered] = useState(false);
  const [consent, setConsent] = useState(false);
  const [deities, setDeities] = useState<{ id: string; name_hi: string; name_en: string }[]>([]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("deities")
      .select("id, name_hi, name_en")
      .eq("status", "published")
      .order("sort")
      .then(({ data }) => {
        if (alive) setDeities(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, []);

  function next() {
    if (step === "ready") {
      void saveName(normaliseName(name)); // local store → Home greeting
      void saveOnboarding(answers);
      // MUST run before leaving: the tabs gate redirects anyone not marked
      // onboarded straight back here.
      void markOnboarded();
      router.replace("/(tabs)");
      return;
    }
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIdx((i) => Math.max(i - 1, 0));
  }

  // whether the current step allows advancing
  const canAdvance = (() => {
    switch (step) {
      case "language": return modeChosen;
      case "name": return true; // skippable
      case "goal": return answers.goal !== null;
      case "body_focus": return true; // skippable
      case "level": return answers.level !== null;
      case "days": return answers.days_per_week !== null;
      case "age": return answers.age_band !== null;
      case "diet": return answers.diet_type !== null;
      case "mode": return modeAnswered; // "decide later" is a valid null, but must be picked
      case "deity": return true; // optional
      case "consent": return consent;
      case "ready": return true;
    }
  })();

  return (
    <Screen scroll={false}>
      {step !== "ready" ? (
        <View style={{ paddingTop: space.lg, paddingBottom: space.md }}>
          <ProgressDots total={STEPS.length - 1} index={stepIdx} />
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}>
        {step === "language" ? (
          <>
            <B k="q_language" variant="h1" center />
            {LANGUAGES.map((o) => (
              <SelectCard
                key={o.value}
                title={t(o.k)}
                selected={modeChosen && langMode === o.value}
                onPress={() => {
                  setMode(o.value);
                  setModeChosen(true);
                }}
              />
            ))}
          </>
        ) : null}

        {step === "name" ? (
          <>
            <B k="q_name" variant="h1" center />
            <B k="q_name_hint" variant="caption" tone="muted" center />
            <TextField value={name} onChangeText={setName} placeholder={t("name_placeholder")} maxLength={24} />
          </>
        ) : null}

        {step === "goal" ? (
          <>
            <B k="q_goal" variant="h1" center />
            {GOALS.map((o) => (
              <SelectCard
                key={o.value}
                title={t(o.k)}
                sub={tSub(o.k)}
                selected={answers.goal === o.value}
                onPress={() => setAnswers({ ...answers, goal: o.value })}
              />
            ))}
          </>
        ) : null}

        {step === "body_focus" ? (
          <>
            <B k="q_body_focus" variant="h1" center />
            <B k="q_body_focus_hint" variant="caption" tone="muted" center />
            {BODY_AREAS.map((o) => {
              const on = answers.body_focus.includes(o.value);
              return (
                <SelectCard
                  key={o.value}
                  title={t(o.k)}
                  sub={tSub(o.k)}
                  selected={on}
                  onPress={() =>
                    setAnswers({
                      ...answers,
                      body_focus: on
                        ? answers.body_focus.filter((x) => x !== o.value)
                        : [...answers.body_focus, o.value],
                    })
                  }
                />
              );
            })}
          </>
        ) : null}

        {step === "level" ? (
          <>
            <B k="q_level" variant="h1" center />
            {LEVELS.map((o) => (
              <SelectCard
                key={o.value}
                title={t(o.k)}
                sub={tSub(o.k)}
                selected={answers.level === o.value}
                onPress={() => setAnswers({ ...answers, level: o.value })}
              />
            ))}
          </>
        ) : null}

        {step === "days" ? (
          <>
            <B k="q_days" variant="h1" center />
            {DAYS.map((o) => (
              <SelectCard
                key={o.value}
                title={t(o.k)}
                selected={answers.days_per_week === o.value}
                onPress={() => setAnswers({ ...answers, days_per_week: o.value })}
              />
            ))}
          </>
        ) : null}

        {step === "age" ? (
          <>
            <B k="q_age" variant="h1" center />
            <B k="q_age_hint" variant="caption" tone="muted" center />
            {AGES.map((o) => (
              <SelectCard
                key={o.value}
                title={t(o.k)}
                selected={answers.age_band === o.value}
                onPress={() => setAnswers({ ...answers, age_band: o.value })}
              />
            ))}
          </>
        ) : null}

        {step === "diet" ? (
          <>
            <B k="q_diet" variant="h1" center />
            {DIETS.map((o) => (
              <SelectCard
                key={o.value}
                title={t(o.k)}
                sub={tSub(o.k)}
                selected={answers.diet_type === o.value}
                onPress={() => setAnswers({ ...answers, diet_type: o.value })}
              />
            ))}
          </>
        ) : null}

        {step === "mode" ? (
          <>
            <B k="q_mode" variant="h1" center />
            {MODES.map((o) => (
              <SelectCard
                key={String(o.value)}
                title={t(o.k)}
                sub={tSub(o.k)}
                selected={modeAnswered && answers.workout_mode_pref === o.value}
                onPress={() => {
                  setAnswers({ ...answers, workout_mode_pref: o.value });
                  setModeAnswered(true);
                }}
              />
            ))}
          </>
        ) : null}

        {step === "deity" ? (
          <>
            <B k="q_deity" variant="h1" center />
            <B k="q_deity_hint" variant="caption" tone="muted" center />
            {deities.map((d) => (
              <SelectCard
                key={d.id}
                title={langMode === "english" ? d.name_en : d.name_hi}
                sub={langMode === "mixed" ? d.name_en : null}
                selected={answers.deity_id === d.id}
                onPress={() =>
                  setAnswers({ ...answers, deity_id: answers.deity_id === d.id ? null : d.id })
                }
              />
            ))}
          </>
        ) : null}

        {step === "consent" ? (
          <>
            <B k="consent_title" variant="h1" center />
            <B k="consent_body" variant="body" tone="soft" />
            <B k="wellness_disclaimer" variant="caption" tone="muted" />
            <View style={{ marginTop: space.sm }}>
              <Checkbox checked={consent} onToggle={() => setConsent(!consent)}>
                <B k="consent_checkbox" variant="body" />
              </Checkbox>
            </View>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
              <B k="consent_privacy_link" variant="caption" tone="saffron" />
            </Pressable>
            {!consent ? <B k="consent_required" variant="caption" tone="muted" /> : null}
          </>
        ) : null}

        {step === "ready" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, paddingTop: space.xxl }}>
            <DiyaIcon size={72} color={color.gold} />
            <B k="plan_ready_title" variant="h1" center />
            <B k="plan_ready_sub" variant="body" tone="muted" center />
          </View>
        ) : null}
      </ScrollView>

      <FooterAction>
        {step === "ready" ? (
          <Button k="continue" onPress={next} />
        ) : (
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {stepIdx > 0 ? (
              <View style={{ flex: 1 }}>
                <Button k="back" kind="ghost" onPress={back} />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Button
                k={
                  step === "consent"
                    ? "finish"
                    : step === "name"
                      ? name.trim() ? "continue" : "skip"
                      : step === "body_focus"
                        ? answers.body_focus.length > 0 ? "continue" : "skip"
                        : step === "deity"
                          ? answers.deity_id ? "continue" : "skip"
                          : "continue"
                }
                onPress={next}
                disabled={!canAdvance}
              />
            </View>
          </View>
        )}
      </FooterAction>
    </Screen>
  );
}
