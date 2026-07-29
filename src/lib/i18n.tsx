/**
 * i18n layer — three display modes chosen at onboarding question #1:
 *   hindi   → Hindi only
 *   english → English only
 *   mixed   → Hindi lead + small English caption
 *
 * Standing rule: NO user-facing string is hardcoded in a component. Every
 * string lives here as a {hi, en} pair; components render via <B> (bilingual
 * text) or t(), which respect the active mode.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageMode } from "../types/db";

/** Survives restarts so a Hindi user never reopens the app in English. */
const LANG_STORAGE_KEY = "fithindu.language_mode";

const isLanguageMode = (v: unknown): v is LanguageMode =>
  v === "hindi" || v === "english" || v === "mixed";

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

  // onboarding — question set v2 (docs/specs/onboarding-questionnaire.md:19-39)
  q_language: { hi: "अपनी भाषा चुनें", en: "Choose your language" },
  lang_hindi: { hi: "हिंदी", en: "Hindi" },
  lang_english: { hi: "English", en: "English" },
  lang_mixed: { hi: "मिक्स (हिंदी + English)", en: "Mixed (Hindi + English)" },

  back: { hi: "पीछे", en: "Back" },
  skip: { hi: "अभी छोड़ें", en: "Skip for now" },

  // Q2 — goal
  q_goal: { hi: "आपका लक्ष्य क्या है?", en: "What's your goal?" },
  goal_weight_gain: { hi: "वज़न बढ़ाना", en: "Gain weight" },
  goal_strength: { hi: "ताक़त बढ़ाना", en: "Build strength" },
  goal_weight_loss: { hi: "वज़न घटाना", en: "Lose weight" },
  goal_healthy_routine: { hi: "स्वस्थ दिनचर्या", en: "A healthy routine" },

  // Q3 — body focus
  q_body_focus: { hi: "किस अंग पर ध्यान दें?", en: "Where do you want to focus?" },
  q_body_focus_hint: { hi: "एक से ज़्यादा चुन सकते हैं", en: "Pick as many as you like" },

  // Q4 — level
  q_level: { hi: "आपका अनुभव कितना है?", en: "What's your experience level?" },

  // Q5 — days per week
  q_days: { hi: "हफ़्ते में कितने दिन?", en: "How many days a week?" },
  days_3: { hi: "3 दिन", en: "3 days" },
  days_5: { hi: "5 दिन", en: "5 days" },
  days_7: { hi: "हर दिन", en: "Every day" },

  // Q6 — age band (18+ gate)
  q_age: { hi: "आपकी आयु?", en: "How old are you?" },
  age_under_18: { hi: "18 से कम", en: "Under 18" },
  age_18_25: { hi: "18–25", en: "18–25" },
  age_26_35: { hi: "26–35", en: "26–35" },
  age_36_50: { hi: "36–50", en: "36–50" },
  age_50_plus: { hi: "50+", en: "50+" },
  age_blocked_title: { hi: "क्षमा करें", en: "Sorry" },
  age_blocked_body: {
    hi: "यह ऐप 18 वर्ष और उससे अधिक आयु के लिए है। बड़े होने पर ज़रूर आइए — तब तक अपने माता-पिता और शिक्षक से मार्गदर्शन लें।",
    en: "This app is for ages 18 and over. Please come back when you're older — until then, take guidance from your parents and teachers.",
  },

  // Q7 — diet
  q_diet: { hi: "आपका आहार?", en: "What do you eat?" },
  diet_veg: { hi: "शाकाहारी", en: "Vegetarian" },
  diet_sattvic: { hi: "सात्विक", en: "Sattvic" },
  diet_egg: { hi: "अंडा खाते हैं", en: "Eggs are fine" },
  diet_nonveg: { hi: "मांसाहारी", en: "Non-vegetarian" },

  // Q8 — workout mode
  q_workout_mode: { hi: "व्यायाम कहाँ करेंगे?", en: "Where will you work out?" },
  mode_home_full: { hi: "घर पर (बिना सामान)", en: "At home (no equipment)" },
  mode_later: { hi: "बाद में तय करेंगे", en: "I'll decide later" },

  // Q9 — deity (optional)
  q_deity: { hi: "आपके इष्ट देव?", en: "Your chosen deity?" },
  q_deity_hint: {
    hi: "आपकी दैनिक प्रेरणा इनसे जुड़ी रहेगी — चाहें तो छोड़ सकते हैं",
    en: "Your daily inspiration will be shaped around them — feel free to skip",
  },
  deity_error: { hi: "देव सूची लोड नहीं हो सकी", en: "Couldn't load the list" },

  // Q10 — DPDP consent
  q_consent: { hi: "आपकी जानकारी", en: "Your information" },
  consent_intro: {
    hi: "आपका plan बनाने के लिए हम यह जानकारी सहेजते हैं:",
    en: "To build your plan, we save the following:",
  },
  consent_item_answers: {
    hi: "• आपके ऊपर दिए उत्तर (लक्ष्य, स्तर, आहार, आयु-वर्ग)",
    en: "• Your answers above (goal, level, diet, age band)",
  },
  consent_item_activity: {
    hi: "• आपकी गतिविधि — कौन सा व्यायाम, ध्यान या जप आपने पूरा किया",
    en: "• Your activity — which workouts, meditation or jap you complete",
  },
  consent_item_account: {
    hi: "• आपका फ़ोन नंबर या ईमेल, केवल आपके खाते के लिए",
    en: "• Your phone number or email, only for your account",
  },
  consent_item_use: {
    hi: "• इसका उपयोग आपका plan बनाने, प्रगति दिखाने और ऐप सुधारने के लिए होता है",
    en: "• We use this to build your plan, show your progress, and improve the app",
  },
  consent_checkbox: {
    hi: "मैं सहमत हूँ",
    en: "I agree",
  },
  consent_privacy_link: { hi: "गोपनीयता नीति पढ़ें", en: "Read the privacy policy" },

  // Q11 — plan ready
  ready_title: { hi: "आपका plan तैयार है", en: "Your plan is ready" },
  ready_body: {
    hi: "आज से आपकी यात्रा शुरू। एक दिन, एक कदम।",
    en: "Your journey starts today. One day, one step at a time.",
  },
  ready_cta: { hi: "शुरू करें", en: "Let's begin" },
  onboarding_saving: { hi: "आपका plan बन रहा है…", en: "Building your plan…" },

  // auth (OTP — src/lib/auth.tsx)
  auth_title: { hi: "अपना plan सुरक्षित करें", en: "Save your plan" },
  auth_why: {
    hi: "ताकि आपकी प्रगति और दीये कभी न खोएँ — नया फ़ोन हो या ऐप दोबारा इंस्टॉल।",
    en: "So your progress and diyas are never lost — new phone or fresh install.",
  },
  auth_phone_label: { hi: "मोबाइल नंबर", en: "Mobile number" },
  auth_email_label: { hi: "ईमेल", en: "Email" },
  auth_send_code: { hi: "कोड भेजें", en: "Send code" },
  auth_skip: { hi: "अभी नहीं", en: "Not now" },
  auth_code_title: { hi: "कोड डालें", en: "Enter the code" },
  auth_code_sent: { hi: "हमने 6 अंकों का कोड भेजा है", en: "We sent you a 6-digit code" },
  auth_verify: { hi: "पुष्टि करें", en: "Verify" },
  auth_resend: { hi: "कोड दोबारा भेजें", en: "Resend code" },
  auth_resent: { hi: "नया कोड भेज दिया ✓", en: "New code sent ✓" },
  auth_invalid_identifier: { hi: "सही जानकारी डालें", en: "Enter a valid value" },
  auth_invalid_code: { hi: "कोड ग़लत है — दोबारा कोशिश करें", en: "That code isn't right — try again" },
  auth_send_failed: { hi: "कोड नहीं भेजा जा सका", en: "Couldn't send the code" },
  auth_saved: { hi: "सब सुरक्षित है 🙏", en: "Everything's saved 🙏" },
  auth_flush_failed: {
    hi: "आपके उत्तर सुरक्षित हैं, पर सहेजे नहीं जा सके — दोबारा कोशिश करें",
    en: "Your answers are safe but couldn't be saved — try again",
  },

  error_generic: { hi: "कुछ गड़बड़ हुई — दोबारा कोशिश करें", en: "Something went wrong — try again" },
  jap_error: { hi: "मंत्र लोड नहीं हो सके", en: "Couldn't load the mantras" },
  sleep_error: { hi: "ध्वनियाँ लोड नहीं हो सकीं", en: "Couldn't load the sounds" },

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
  my_workouts_signin: {
    hi: "अपने वर्कआउट बनाने के लिए साइन-इन करें",
    en: "Sign in to build your own workouts",
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

  // settings (stack route behind the Home header icon — slice 1b)
  settings_title: { hi: "सेटिंग्स", en: "Settings" },
  settings_language: { hi: "भाषा", en: "Language" },
  settings_account: { hi: "खाता", en: "Account" },
  settings_about: { hi: "ऐप के बारे में", en: "About" },
  settings_feedback: { hi: "कंपन और ध्वनि", en: "Haptics & sound" },
  settings_haptics: { hi: "कंपन", en: "Vibration" },
  settings_sound: { hi: "ध्वनि", en: "Sound" },
  settings_guest: { hi: "अतिथि", en: "Guest" },
  settings_guest_hint: {
    hi: "अपनी प्रगति और दीये सुरक्षित रखने के लिए साइन-इन करें।",
    en: "Sign in to keep your progress and diyas safe.",
  },
  sign_in: { hi: "साइन-इन करें", en: "Sign in" },
  sign_out: { hi: "साइन-आउट", en: "Sign out" },
  sign_out_q: { hi: "साइन-आउट करें?", en: "Sign out?" },
  sign_out_body: {
    hi: "आपकी प्रगति आपके खाते में सुरक्षित रहेगी — दोबारा साइन-इन करके वापस पा सकते हैं।",
    en: "Your progress stays saved to your account — sign back in anytime to restore it.",
  },
  cancel: { hi: "रद्द करें", en: "Cancel" },
  settings_privacy: { hi: "गोपनीयता नीति", en: "Privacy policy" },
  settings_version: { hi: "ऐप संस्करण", en: "App version" },

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
  // 'english' is the pre-choice default only — owner decision 2026-07-13,
  // mirrored by profiles.language_mode's default in migration 0010. Onboarding
  // question #1 overwrites it, and the choice is restored below on every start.
  const [mode, setModeState] = useState<LanguageMode>("english");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(LANG_STORAGE_KEY)
      .then((stored) => {
        if (alive && isLanguageMode(stored)) setModeState(stored);
      })
      // Unreadable storage is not worth blocking the app for — the default stands.
      .catch(() => {})
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: LanguageMode) => {
    setModeState(m); // flip the UI now
    void AsyncStorage.setItem(LANG_STORAGE_KEY, m).catch(() => {}); // storage catches up
  }, []);

  const value = useMemo<I18nCtx>(
    () => ({
      mode,
      setMode,
      t: (k) => (mode === "english" ? strings[k].en : strings[k].hi),
      tSub: (k) => (mode === "mixed" ? strings[k].en : null),
      loc: (hi, en) => (mode === "english" ? en : hi),
      locSub: (hi, en) => (mode === "mixed" ? en : null),
    }),
    [mode, setMode],
  );

  // Hold the first paint until the stored choice is known, otherwise a Hindi
  // user sees a frame of English before it swaps. The splash covers this.
  if (!hydrated) return null;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
