/**
 * i18n layer — three display modes chosen at onboarding question #1:
 *   hindi   → Hindi only
 *   english → English only
 *   mixed   → Hindi lead + small English caption (default)
 *
 * Standing rule: NO user-facing string is hardcoded in a component. Every
 * string lives here as a {hi, en} pair; components render via <B> (bilingual
 * text) or t(), which respect the active mode.
 */
import React, { createContext, useContext, useMemo, useState } from "react";
import type { LanguageMode } from "../types/db";

export interface Str {
  hi: string;
  en: string;
}

/** App string catalog. Add every new user-facing string HERE. */
export const strings = {
  // tabs
  tab_home: { hi: "होम", en: "Home" },
  tab_workout: { hi: "व्यायाम", en: "Workout" },
  tab_meditation: { hi: "ध्यान", en: "Meditation" },
  tab_jap: { hi: "जप", en: "Jap" },
  tab_sleep: { hi: "नींद", en: "Sleep" },

  // shared
  coming_soon: { hi: "जल्द आ रहा है", en: "Coming soon" },
  continue: { hi: "आगे बढ़ें", en: "Continue" },
  start: { hi: "शुरू करें", en: "Start" },
  retry: { hi: "फिर से कोशिश करें", en: "Retry" },
  loading: { hi: "लोड हो रहा है…", en: "Loading…" },

  // workout modes
  mode_home: { hi: "घर पर", en: "Home" },
  mode_gym: { hi: "जिम", en: "Gym" },
  mode_custom: { hi: "अपनी पसंद", en: "Custom" },

  // body areas (custom mode)
  area_full_body: { hi: "पूरा शरीर", en: "Full body" },
  area_chest: { hi: "छाती", en: "Chest" },
  area_back: { hi: "पीठ", en: "Back" },
  area_shoulders: { hi: "कंधे", en: "Shoulders" },
  area_arms: { hi: "बाजू", en: "Arms" },
  area_core: { hi: "कोर / पेट", en: "Core" },
  area_legs: { hi: "टाँगें", en: "Legs" },

  // levels
  level_beginner: { hi: "शुरुआती", en: "Beginner" },
  level_intermediate: { hi: "मध्यम", en: "Intermediate" },
  level_advanced: { hi: "उन्नत", en: "Advanced" },

  // workout screen states + detail
  our_avatar: { hi: "हमारा अवतार", en: "Our Avatar" },
  workout_empty: { hi: "अभी कोई व्यायाम उपलब्ध नहीं", en: "No exercises available yet" },
  workout_error: { hi: "व्यायाम लोड नहीं हो सके", en: "Couldn't load exercises" },
  pick_area: { hi: "अंग चुनें", en: "Pick a body area" },
  sets: { hi: "सेट", en: "Sets" },
  reps: { hi: "बार", en: "Reps" },
  hold: { hi: "समय", en: "Hold" },
  rest: { hi: "विश्राम", en: "Rest" },
  instructions: { hi: "निर्देश", en: "Instructions" },
  start_workout: { hi: "व्यायाम शुरू करें", en: "Start workout" },
  workout_safety: {
    hi: "दर्द, चक्कर या असुविधा होने पर तुरंत रुकें। ये सामान्य मार्गदर्शन है, चिकित्सीय सलाह नहीं।",
    en: "Stop immediately if you feel pain, dizziness or discomfort. This is general guidance, not medical advice.",
  },

  // home (stub)
  greeting: { hi: "राम राम", en: "Ram Ram" },
  todays_workout: { hi: "आज का व्यायाम", en: "Today's workout" },
  todays_diet: { hi: "आज का आहार", en: "Today's diet" },
  todays_meditation: { hi: "आज का ध्यान", en: "Today's meditation" },
  todays_jap: { hi: "मंत्र जप", en: "Mantra jap" },

  // onboarding
  q_language: { hi: "अपनी भाषा चुनें", en: "Choose your language" },
  lang_hindi: { hi: "हिंदी", en: "Hindi" },
  lang_english: { hi: "English", en: "English" },
  lang_mixed: { hi: "मिक्स (हिंदी + English)", en: "Mixed (Hindi + English)" },

  // disclaimers (compliance — docs/research/compliance.md)
  wellness_disclaimer: {
    hi: "यह ऐप केवल सामान्य स्वास्थ्य जानकारी देता है — यह चिकित्सा सलाह नहीं है। कोई भी नया व्यायाम या आहार शुरू करने से पहले चिकित्सक से परामर्श करें।",
    en: "This app provides general wellness information only — it is not medical advice. Consult a physician before starting any new exercise or diet programme.",
  },
} satisfies Record<string, Str>;

export type StringKey = keyof typeof strings;

interface I18nCtx {
  mode: LanguageMode;
  setMode: (m: LanguageMode) => void;
  /** Primary line for the current mode. */
  t: (k: StringKey) => string;
  /** Secondary caption (mixed mode only; null otherwise). */
  tSub: (k: StringKey) => string | null;
  /** Localise a dynamic DB value (e.g. exercise name_hi/name_en). */
  loc: (hi: string, en: string) => string;
  /** Secondary caption for a dynamic DB value (mixed mode only). */
  locSub: (hi: string, en: string) => string | null;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Default 'english' until onboarding stores the user's choice
  // (profiles.language_mode) — owner decision 2026-07-13.
  const [mode, setMode] = useState<LanguageMode>("english");

  const value = useMemo<I18nCtx>(
    () => ({
      mode,
      setMode,
      t: (k) => (mode === "english" ? strings[k].en : strings[k].hi),
      tSub: (k) => (mode === "mixed" ? strings[k].en : null),
      loc: (hi, en) => (mode === "english" ? en : hi),
      locSub: (hi, en) => (mode === "mixed" ? en : null),
    }),
    [mode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
