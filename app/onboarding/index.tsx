/**
 * Onboarding v2 — the card-based questionnaire (target: under 90 seconds).
 * Spec: docs/specs/onboarding-questionnaire.md (question set v2, 2026-07-15).
 *
 * One route, not many: progress dots, Back, and resume-at-last-answered all
 * read one state machine, and the browser/hardware back button never strands
 * the user half-way through a stack of pushed screens.
 *
 * Questions are DATA (src/lib/onboarding.ts). This file renders them and owns
 * navigation; it decides nothing about the question set itself.
 *
 * Interaction: one question per screen, large tappable cards, and single-select
 * answers AUTO-ADVANCE on tap — the biggest lever on completion time. Continue
 * stays as the explicit/accessible path (and the way forward when resuming a
 * step that already has an answer). The deity question was removed (owner
 * decision 2026-08-01) — see docs/decisions.md; deity stays as content metadata
 * on the jap/devotional layer, it just isn't asked here.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import Animated, { SlideInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  Screen, Button, FooterAction, SelectCard, ProgressDots, Checkbox, Chip,
  B, T, DiyaIcon, space, color,
} from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { PRIVACY_POLICY_URL } from "../../src/lib/config";
import {
  STEPS, canAdvance, emptyAnswers, loadProgress, saveProgress,
  type Answers,
} from "../../src/lib/onboarding";
import type { BodyArea } from "../../src/types/db";

export default function Onboarding() {
  const router = useRouter();
  const { t, tSub, setMode } = useI18n();

  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [index, setIndex] = useState(0);
  const [restored, setRestored] = useState(false);

  // A tapped single-select advances itself after a beat (long enough to see the
  // selection land). Held in a ref so a manual Back / unmount can cancel it.
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAdvance = useCallback(() => {
    if (advanceRef.current) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }, []);

  const next = useCallback(() => {
    clearAdvance();
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [clearAdvance]);
  const back = useCallback(() => {
    clearAdvance();
    setIndex((i) => Math.max(i - 1, 0));
  }, [clearAdvance]);
  const autoAdvance = useCallback(() => {
    clearAdvance();
    advanceRef.current = setTimeout(
      () => setIndex((i) => Math.min(i + 1, STEPS.length - 1)),
      200,
    );
  }, [clearAdvance]);

  // Resume where they left off (spec :58). Until this lands we render nothing,
  // so a resuming user never sees question 1 flash before their real step.
  useEffect(() => {
    let alive = true;
    void loadProgress().then((saved) => {
      if (!alive) return;
      if (saved) {
        setAnswers(saved.answers);
        setIndex(saved.step);
        setMode(saved.answers.language_mode);
      }
      setRestored(true);
    });
    return () => {
      alive = false;
    };
  }, [setMode]);

  // Persist every change so a kill mid-flow costs nothing.
  useEffect(() => {
    if (restored) void saveProgress(answers, index);
  }, [answers, index, restored]);

  // Never leave a pending auto-advance running against an unmounted screen.
  useEffect(() => clearAdvance, [clearAdvance]);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  if (!restored) return null;

  // The 18+ gate (spec :30) — a terminal state, not a step.
  if (answers.under_18) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: "center", gap: space.lg }}>
          <B k="age_blocked_title" variant="h1" center />
          <B k="age_blocked_body" variant="body" tone="soft" />
        </View>
        <FooterAction>
          <Button
            k="back"
            kind="ghost"
            onPress={() => setAnswers((a) => ({ ...a, under_18: false }))}
          />
        </FooterAction>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ paddingTop: space.sm }}>
        <ProgressDots total={STEPS.length} index={index} />
      </View>

      {/* Keyed by step so each question slides in — one at a time, cheap and on
          the UI thread. Native only: Reanimated layout animations don't settle
          under react-native-web here (they'd leave the view off-screen), so web
          renders the question statically, same precedent as the ceremony. */}
      <Animated.View
        key={index}
        entering={Platform.OS === "web" ? undefined : SlideInRight.duration(220)}
        style={{ flex: 1, paddingTop: space.lg }}
      >
        <B k={step.qk} variant="h1" center />

        <View style={{ flex: 1, paddingTop: space.xl }}>
          {step.kind === "single" ? (
            <View style={{ gap: space.md }}>
              {step.options.map((o) => (
                <SelectCard
                  key={o.value}
                  title={t(o.k)}
                  sub={tSub(o.k)}
                  selected={step.get(answers) === o.value}
                  onPress={() => {
                    const updated = step.set(answers, o.value);
                    setAnswers(updated);
                    // Q1 applies instantly — the rest of the flow is already in
                    // their language (spec :23).
                    if (step.id === "language") setMode(updated.language_mode);
                    // Picking under-18 opens the age gate; everything else moves on.
                    if (updated.under_18) clearAdvance();
                    else autoAdvance();
                  }}
                />
              ))}
            </View>
          ) : null}

          {step.kind === "multi" ? (
            <MultiSelect
              options={step.options}
              selected={answers.body_focus}
              onToggle={(v) =>
                setAnswers((a) => ({
                  ...a,
                  body_focus: a.body_focus.includes(v as BodyArea)
                    ? a.body_focus.filter((x) => x !== v)
                    : [...a.body_focus, v as BodyArea],
                }))
              }
            />
          ) : null}

          {step.kind === "consent" ? (
            <ConsentNotice
              checked={answers.consent}
              onToggle={() => setAnswers((a) => ({ ...a, consent: !a.consent }))}
            />
          ) : null}

          {step.kind === "ready" ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg }}>
              {/* The app's own diya SVG, not a 🪔 emoji — emoji violate the
                  no-emoji standing rule and get clipped to the Text line box on
                  Android (the top/bottom-shaved diya the owner reported). */}
              <DiyaIcon size={64} />
              <B k="ready_body" variant="body" tone="soft" center />
            </View>
          ) : null}
        </View>
      </Animated.View>

      <FooterAction>
        <Button
          k={isLast ? "ready_cta" : step.kind === "multi" && answers.body_focus.length === 0 ? "skip" : "continue"}
          disabled={!canAdvance(step, answers)}
          onPress={() => {
            if (isLast) router.replace("/auth");
            else next();
          }}
        />
        {index > 0 && !isLast ? <Button k="back" kind="ghost" onPress={back} /> : null}
      </FooterAction>
    </Screen>
  );
}

/** Body focus — chips, because several fit on a line and order doesn't matter. */
function MultiSelect({
  options,
  selected,
  onToggle,
}: {
  options: readonly { value: string; k: StringKey }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <View style={{ gap: space.lg }}>
      <B k="q_body_focus_hint" variant="caption" tone="muted" center />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" }}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={t(o.k)}
            active={selected.includes(o.value)}
            onPress={() => onToggle(o.value)}
          />
        ))}
      </View>
    </View>
  );
}

/** DPDP: itemised, plain-language, unticked by default (spec :35-37). */
function ConsentNotice({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: space.md }}>
      <B k="consent_intro" variant="body" tone="soft" />
      <View style={{ gap: space.sm }}>
        <B k="consent_item_answers" variant="caption" tone="soft" />
        <B k="consent_item_activity" variant="caption" tone="soft" />
        <B k="consent_item_account" variant="caption" tone="soft" />
        <B k="consent_item_use" variant="caption" tone="soft" />
      </View>
      <B k="wellness_disclaimer" variant="caption" tone="muted" />
      {/* Appears as soon as the policy is live; see PRIVACY_POLICY_URL. */}
      {PRIVACY_POLICY_URL ? (
        <T
          variant="caption"
          tone="saffron"
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        >
          {t("consent_privacy_link")}
        </T>
      ) : null}
      <View style={{ height: 1, backgroundColor: color.line }} />
      <Checkbox label={t("consent_checkbox")} checked={checked} onToggle={onToggle} />
    </View>
  );
}
