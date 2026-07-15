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

  error_generic: { hi: "कुछ गड़बड़ हुई — दोबारा कोशिश करें", en: "Something went wrong — try again" },

  // home (habit surface)
  todays_shloka: { hi: "आज का श्लोक", en: "Today's shloka" },
  sankalp_start: { hi: "संकल्प आज से शुरू करें", en: "Start your sankalp today" },
  sankalp_hint: { hi: "पहली गतिविधि पूरी करें और पहला दीया जलाएँ", en: "Complete your first activity to light the first diya" },
  soon_badge: { hi: "जल्द", en: "Soon" },

  // workout structure
  workouts_section: { hi: "वर्कआउट", en: "Workouts" },
  all_exercises: { hi: "सभी व्यायाम", en: "All exercises" },
  exercises_word: { hi: "व्यायाम", en: "exercises" },

  // session player (workout spec v2)
  set_word: { hi: "सेट", en: "Set" },
  set_done: { hi: "सेट पूरा हुआ", en: "Set done" },
  rest_now: { hi: "विश्राम करें", en: "Rest" },
  plus_20s: { hi: "+20 से.", en: "+20 sec" },
  skip_word: { hi: "छोड़ें", en: "Skip" },
  next_up: { hi: "आगे", en: "Next up" },
  weight_kg: { hi: "वज़न (कि.ग्रा.)", en: "Weight (kg)" },
  workout_complete: { hi: "वर्कआउट पूरा हुआ 🙏", en: "Workout complete 🙏" },
  great_work: { hi: "शानदार मेहनत! कल फिर मिलते हैं।", en: "Great work! See you again tomorrow." },
  sets_total_word: { hi: "सेट", en: "sets" },
  exit_confirm: { hi: "बाहर निकलें", en: "Exit" },

  // my workouts (builder)
  my_workouts: { hi: "मेरे वर्कआउट", en: "My Workouts" },
  new_workout: { hi: "नया वर्कआउट", en: "New workout" },
  my_workouts_soon: {
    hi: "अपने वर्कआउट बनाएं — साइन-इन के साथ जल्द आ रहा है",
    en: "Build your own workouts — coming soon with sign-in",
  },
  workout_name: { hi: "वर्कआउट का नाम", en: "Workout name" },
  add_exercise: { hi: "व्यायाम जोड़ें", en: "Add exercise" },
  save_word: { hi: "सहेजें", en: "Save" },
  delete_word: { hi: "हटाएं", en: "Delete" },
  saved_ok: { hi: "सहेजा गया ✓", en: "Saved ✓" },
  empty_workout_hint: { hi: "नीचे से व्यायाम जोड़ें", en: "Add exercises from below" },

  // meditation flow (docs/specs/meditation.md — 3 clicks: Start → Next → Start)
  start_meditation: { hi: "ध्यान शुरू करें", en: "Start Meditation" },
  med_tagline: { hi: "कुछ मिनट अपने लिए — श्वास, शांति, ॐ", en: "A few minutes for yourself — breath, calm, Om" },
  choose_sound: { hi: "ध्वनि चुनें", en: "Choose a sound" },
  sound_playing_hint: { hi: "ध्वनि बदलने के लिए टैप करें — अभी बज रही है", en: "Tap to switch — playing now" },
  silent_mode: { hi: "मौन", en: "Silent" },
  next: { hi: "आगे", en: "Next" },
  how_to_meditate: { hi: "कैसे करें", en: "How to meditate" },
  med_instructions: {
    hi: "सीधे बैठें, आँखें बंद करें। धीरे-धीरे गहरी सांस लें और छोड़ें। मन भटके तो बिना झुंझलाहट के ध्यान वापस श्वास पर लाएं।",
    en: "Sit upright and close your eyes. Breathe in and out slowly. When the mind wanders, gently bring your attention back to the breath.",
  },
  timer_label: { hi: "समय चुनें", en: "Set the timer" },
  minutes_short: { hi: "मिनट", en: "min" },
  begin: { hi: "ध्यान आरंभ करें", en: "Begin" },
  pause: { hi: "रोकें", en: "Pause" },
  resume: { hi: "जारी रखें", en: "Resume" },
  end_session: { hi: "समाप्त करें", en: "End" },
  session_complete: { hi: "ध्यान पूर्ण हुआ 🙏", en: "Meditation complete 🙏" },
  well_done: { hi: "बहुत सुंदर। कल फिर मिलते हैं।", en: "Beautifully done. See you again tomorrow." },
  done: { hi: "ठीक है", en: "Done" },

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
