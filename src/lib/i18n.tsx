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
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LanguageMode } from "../types/db";
import { loadProfile, saveLanguage } from "./profile";

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
  q_name: { hi: "आपका नाम क्या है?", en: "What is your name?" },
  q_name_hint: { hi: "ताकि हम आपका नाम लेकर स्वागत कर सकें", en: "So we can greet you by name" },
  name_placeholder: { hi: "आपका नाम", en: "Your name" },
  skip_word_q: { hi: "अभी नहीं", en: "Skip" },

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

  // jap (docs/specs/jap.md)
  jap_title: { hi: "मंत्र जप", en: "Mantra Jap" },
  jap_tagline: { hi: "एक माला — १०८ बार", en: "One mala — 108 repetitions" },
  jap_tap_hint: { hi: "जप के लिए दबाएँ", en: "Tap to count" },
  jap_remaining: { hi: "शेष", en: "left" },
  jap_complete: { hi: "माला पूर्ण हुई 🙏", en: "Mala complete 🙏" },
  jap_start_again: { hi: "फिर से शुरू करें", en: "Start again" },
  jap_meaning: { hi: "अर्थ", en: "Meaning" },
  jap_empty: { hi: "अभी कोई मंत्र उपलब्ध नहीं", en: "No mantras available yet" },
  jap_error: { hi: "मंत्र लोड नहीं हो सके", en: "Couldn't load mantras" },

  // sleep (docs/specs/sleep.md)
  sleep_title: { hi: "नींद की ध्वनि", en: "Sleep Sounds" },
  sleep_tagline: { hi: "धीमी ध्वनि — शांत नींद के लिए", en: "Soft sounds to fall asleep to" },
  sleep_timer: { hi: "टाइमर", en: "Auto-stop" },
  timer_off: { hi: "बंद नहीं", en: "Off" },
  sleep_playing: { hi: "बज रही है", en: "Playing" },
  sleep_stop: { hi: "रोकें", en: "Stop" },
  sleep_empty: { hi: "अभी कोई ध्वनि उपलब्ध नहीं", en: "No sounds available yet" },
  sleep_error: { hi: "ध्वनि लोड नहीं हो सकी", en: "Couldn't load sounds" },
  // onboarding questionnaire (docs/specs/onboarding-questionnaire.md)
  back: { hi: "पीछे", en: "Back" },
  skip: { hi: "छोड़ें", en: "Skip" },
  finish: { hi: "पूरा करें", en: "Finish" },
  q_goal: { hi: "आपका लक्ष्य क्या है?", en: "What's your goal?" },
  goal_weight_gain: { hi: "वज़न बढ़ाना", en: "Gain weight" },
  goal_strength: { hi: "ताकत बढ़ाना", en: "Build strength" },
  goal_weight_loss: { hi: "वज़न कम करना", en: "Lose weight" },
  goal_healthy_routine: { hi: "स्वस्थ दिनचर्या", en: "Healthy routine" },
  q_body_focus: { hi: "किन अंगों पर ध्यान दें?", en: "Which areas to focus on?" },
  q_body_focus_hint: { hi: "एक या अधिक चुनें (वैकल्पिक)", en: "Pick one or more (optional)" },
  q_level: { hi: "आपका स्तर क्या है?", en: "What's your level?" },
  q_days: { hi: "हफ़्ते में कितने दिन?", en: "How many days per week?" },
  days_3: { hi: "3 दिन", en: "3 days" },
  days_5: { hi: "5 दिन", en: "5 days" },
  days_7: { hi: "7 दिन", en: "7 days" },
  q_age: { hi: "आपकी आयु?", en: "Your age?" },
  q_age_hint: { hi: "व्यक्तिगत प्लान के लिए 18+ आवश्यक है", en: "You must be 18+ for a personalised plan" },
  age_18_25: { hi: "18–25", en: "18–25" },
  age_26_35: { hi: "26–35", en: "26–35" },
  age_36_50: { hi: "36–50", en: "36–50" },
  age_50_plus: { hi: "50+", en: "50+" },
  q_diet: { hi: "आपका आहार?", en: "Your diet?" },
  diet_veg: { hi: "शाकाहारी", en: "Vegetarian" },
  diet_sattvic: { hi: "सात्विक", en: "Sattvic" },
  diet_egg: { hi: "अंडा भी", en: "Eggs ok" },
  diet_nonveg: { hi: "मांसाहारी", en: "Non-veg" },
  q_mode: { hi: "व्यायाम कहाँ करेंगे?", en: "Where will you work out?" },
  mode_decide_later: { hi: "बाद में तय करें", en: "Decide later" },
  q_deity: { hi: "अपने इष्ट देव चुनें", en: "Choose your deity" },
  q_deity_hint: { hi: "वैकल्पिक — भक्ति अनुभव के लिए", en: "Optional — frames your devotional layer" },
  consent_title: { hi: "आपकी सहमति", en: "Your consent" },
  consent_body: {
    hi: "हम आपके उत्तरों का उपयोग आपके लिए प्लान बनाने और अनुभव को व्यक्तिगत करने के लिए करते हैं। स्वास्थ्य से जुड़े प्रश्न वैकल्पिक हैं।",
    en: "We use your answers to build your plan and personalise your experience. Health-related questions are optional.",
  },
  consent_checkbox: { hi: "मैं सहमत हूँ और गोपनीयता नीति स्वीकार करता/करती हूँ", en: "I agree and accept the privacy policy" },
  consent_privacy_link: { hi: "गोपनीयता नीति पढ़ें", en: "Read the privacy policy" },
  consent_required: { hi: "आगे बढ़ने के लिए सहमति आवश्यक है", en: "Consent is required to continue" },
  plan_ready_title: { hi: "आपका प्लान तैयार है 🙏", en: "Your plan is ready 🙏" },
  plan_ready_sub: { hi: "आइए आज से शुरू करें।", en: "Let's begin today." },

  // diet section + custom plan
  tab_diet: { hi: "आहार", en: "Diet" },
  diet_templates_title: { hi: "आहार योजनाएँ", en: "Diet plans" },
  diet_empty: { hi: "अभी कोई आहार योजना उपलब्ध नहीं", en: "No diet plans available yet" },
  diet_error: { hi: "आहार योजनाएँ लोड नहीं हो सकीं", en: "Couldn't load diet plans" },
  diet_generate_title: { hi: "अपना कस्टम डाइट प्लान बनाएं", en: "Generate your custom diet plan" },
  diet_generate_sub: {
    hi: "कुछ सवालों के जवाब दें — आपके लिए एक व्यक्तिगत योजना तैयार होगी।",
    en: "Answer a few questions — we'll prepare a plan tailored to you.",
  },
  diet_generate_cta: { hi: "शुरू करें", en: "Get started" },
  your_custom_plan: { hi: "आपका कस्टम प्लान", en: "Your custom plan" },
  view_plan: { hi: "प्लान देखें", en: "View plan" },
  dq_height: { hi: "आपकी लंबाई", en: "Your height" },
  dq_weight: { hi: "आपका वज़न", en: "Your weight" },
  dq_region: { hi: "आपका क्षेत्र", en: "Your region" },
  region_north: { hi: "उत्तर भारतीय", en: "North Indian" },
  region_south: { hi: "दक्षिण भारतीय", en: "South Indian" },
  region_east: { hi: "पूर्वी भारतीय", en: "East Indian" },
  region_west: { hi: "पश्चिमी भारतीय", en: "West Indian" },
  region_central: { hi: "मध्य भारतीय", en: "Central Indian" },
  region_northeast: { hi: "पूर्वोत्तर भारतीय", en: "North-East Indian" },
  dq_activity: { hi: "आपकी दिनचर्या कितनी सक्रिय है?", en: "How active are you?" },
  activity_sedentary: { hi: "कम सक्रिय", en: "Mostly sitting" },
  activity_moderate: { hi: "मध्यम सक्रिय", en: "Moderately active" },
  activity_active: { hi: "बहुत सक्रिय", en: "Very active" },
  dq_submit: { hi: "मेरा प्लान बनाएं", en: "Generate my plan" },
  plan_preparing_title: { hi: "आपका प्लान तैयार हो रहा है…", en: "Preparing your plan…" },
  plan_preparing_sub: {
    hi: "इसमें कुछ पल लग सकते हैं। आप बाद में यहाँ वापस आ सकते हैं।",
    en: "This can take a moment. You can come back here later.",
  },
  plan_failed: { hi: "प्लान तैयार नहीं हो सका", en: "Couldn't prepare your plan" },
  plan_failed_retry: { hi: "फिर से कोशिश करें", en: "Try again" },
  diet_ai_disclaimer: {
    hi: "यह योजना AI द्वारा बनाई गई सामान्य स्वास्थ्य जानकारी है — चिकित्सा सलाह नहीं। किसी भी नए आहार से पहले चिकित्सक से परामर्श करें।",
    en: "This plan is AI-generated general wellness guidance — not medical advice. Consult a physician before any new diet.",
  },
  auth_required_note: {
    hi: "यह सुविधा साइन-इन के साथ सक्रिय होगी।",
    en: "This feature activates once sign-in is available.",
  },

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
  const [mode, setModeState] = useState<LanguageMode>("english");
  // Hydrate the saved choice BEFORE first paint: rendering children while the
  // mode is still the default would flash English at a Hindi user on every
  // launch. AsyncStorage is a few ms and the splash covers it.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((p) => {
        if (!alive) return;
        if (p.languageMode) setModeState(p.languageMode);
        setHydrated(true);
      })
      .catch(() => alive && setHydrated(true));
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<I18nCtx>(
    () => ({
      mode,
      setMode: (m) => {
        setModeState(m);
        void saveLanguage(m); // fire-and-forget; a lost write costs one relaunch
      },
      t: (k) => (mode === "english" ? strings[k].en : strings[k].hi),
      tSub: (k) => (mode === "mixed" ? strings[k].en : null),
      loc: (hi, en) => (mode === "english" ? en : hi),
      locSub: (hi, en) => (mode === "mixed" ? en : null),
    }),
    [mode],
  );

  if (!hydrated) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
