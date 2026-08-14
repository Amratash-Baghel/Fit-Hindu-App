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

  // splash / launch ceremony (slice 3) — wordmark is the brand name (rendered
  // raw, not translated); only the tagline is bilingual. Kept devotional and
  // non-medical per the health-claim rule.
  splash_tagline: { hi: "आपकी दैनिक साधना", en: "Your daily sadhana" },

  // BMS redesign (docs/specs/redesign-bms.md) — splash tagline, pillars, tabs
  bms_tagline: { hi: "तन, मन और आत्मा को जगाइए", en: "Unlock your Body, Mind & Soul" },
  splash_skip: { hi: "छोड़ने के लिए टैप करें", en: "Tap to skip" },
  tab_body: { hi: "तन", en: "Body" },
  tab_mind: { hi: "मन", en: "Mind" },
  tab_soul: { hi: "आत्मा", en: "Soul" },
  pillar_body: { hi: "तन", en: "Body" },
  pillar_mind: { hi: "मन", en: "Mind" },
  pillar_soul: { hi: "आत्मा", en: "Soul" },
  pillar_body_sub: { hi: "व्यायाम और आहार", en: "Exercise & diet" },
  pillar_mind_sub: { hi: "ध्यान और ज्ञान", en: "Meditation & wisdom" },
  pillar_soul_sub: { hi: "जप और विश्राम", en: "Jap & rest" },
  /** ring caption — {n}/{m} interpolated by the screen */
  pillar_done: { hi: "{n}/{m} पूरा", en: "{n}/{m} done" },
  pillar_complete: { hi: "आज पूरा 🙏", en: "Complete" },
  today_saadhana: { hi: "आज की साधना", en: "Today's practice" },
  /** {n}/{m} pillars complete — the one number that says whether today is done */
  saadhana_count: { hi: "{m} में से {n} पूर्ण", en: "{n} of {m} complete" },
  /** guest ring centre — an open door, never a cold 0/2 */
  ring_begin: { hi: "शुरू", en: "Begin" },

  // time-of-day greeting (redesign "surface that keeps time") — Home's greeting
  // follows the IST clock. Brahma Muhurta is the pre-dawn devotional hour.
  greet_brahma: { hi: "ब्रह्म मुहूर्त", en: "Brahma Muhurta" },
  greet_morning: { hi: "सुप्रभात", en: "Good morning" },
  greet_day: { hi: "नमस्ते", en: "Good afternoon" },
  greet_evening: { hi: "शुभ संध्या", en: "Good evening" },
  greet_night: { hi: "शुभ रात्रि", en: "Good night" },

  // Purna — the once-a-day "all three pillars done" moment (redesign). Celebrates
  // the ROUTINE (body·mind·soul), never worship, never a paywall — a quiet beat,
  // then it rests until tomorrow. Non-medical by rule.
  purna_title: { hi: "आज की साधना पूर्ण", en: "Your day is whole" },
  purna_body: { hi: "तन, मन और आत्मा — आज तीनों।", en: "Body, mind and soul — all three, today." },
  purna_tap: { hi: "जारी रखने के लिए दबाएँ", en: "Tap to continue" },
  /** the hero's quiet settled state once all three rings have closed */
  saadhana_settled: { hi: "पूर्ण — मध्यरात्रि तक स्वर्णिम", en: "Purna — settled in gold till midnight" },

  // My Path (redesign — the reflective progress screen). Gentle by rule: a quiet
  // day is quiet, never "missed"; nudges stay effort-based, never a health claim.
  mypath_title: { hi: "मेरी राह", en: "My Path" },
  mypath_sub: { hi: "हर वह दिन जब आप आए", en: "Every day you showed up" },
  mypath_current: { hi: "अभी", en: "Current" },
  mypath_days_word: { hi: "दिन", en: "days" },
  mypath_week: { hi: "इस सप्ताह", en: "This week" },
  // the month of diyas — a constellation, never a scoreboard. Days are
  // "quiet", never "missed"; the dim dot is dim, never red.
  mypath_month: { hi: "दीयों का महीना", en: "A month of diyas" },
  legend_full: { hi: "पूर्ण दिन", en: "full day" },
  legend_part: { hi: "आंशिक दिन", en: "part day" },
  legend_quiet: { hi: "शांत", en: "quiet" },
  mypath_points: { hi: "फिट अंक → अगला पड़ाव", en: "Fit Points → next milestone" },
  // {p} → the localized name of the quietest pillar, filled at the call site.
  mypath_nudge: {
    hi: "इस सप्ताह आपका सबसे शांत स्तंभ {p} रहा — कुछ मिनट भी उसका दीया जला देते हैं।",
    en: "Your quietest pillar this week is {p} — even a few minutes lights its diya.",
  },
  mypath_nudge_all: {
    hi: "तीनों स्तंभ इस सप्ताह जगमगाए — यही लय बनाए रखें।",
    en: "All three pillars shone this week — keep the rhythm.",
  },

  // pillar pages — tiles
  tile_exercise: { hi: "व्यायाम", en: "Exercise" },
  tile_exercise_sub: { hi: "घर या जिम — आज का व्यायाम", en: "Home or gym — today's workout" },
  tile_diet: { hi: "आहार", en: "Diet" },
  tile_diet_sub: { hi: "आपका आहार, आपकी योजना", en: "Your diet, your plan" },
  tile_meditation: { hi: "ध्यान", en: "Meditation" },
  tile_meditation_sub: { hi: "शांति के कुछ क्षण", en: "A few quiet minutes" },
  tile_gita: { hi: "दैनिक गीता", en: "Daily Gita" },
  tile_gita_sub: { hi: "श्लोक, अर्थ और ज्ञान", en: "Shloka, meaning & wisdom" },
  tile_jap: { hi: "मंत्र जप", en: "Mantra jap" },
  tile_jap_sub: { hi: "अपने इष्ट का नाम जपें", en: "Chant your ishta's name" },
  tile_sleep: { hi: "नींद की ध्वनियाँ", en: "Sleep sounds" },
  tile_sleep_sub: { hi: "शांत नींद की ओर", en: "Toward restful sleep" },
  tile_ucharan: { hi: "मंत्र उच्चारण", en: "Mantra ucharan" },
  tile_alarm: { hi: "भजन अलार्म", en: "Bhajan alarm" },

  // workout — muscle model filter
  muscle_pick: { hi: "मांसपेशियाँ चुनें", en: "Tap muscles to filter" },
  muscle_pick_hint: { hi: "एक से ज़्यादा चुन सकते हैं", en: "Select one or more" },
  muscle_clear: { hi: "पूरा शरीर", en: "Full body" },
  model_front: { hi: "सामने", en: "Front" },
  model_back: { hi: "पीछे", en: "Back" },

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

  // plan-ready ceremony (slice 5) — the four stage labels map 1:1 onto the four
  // real awaits in flushOnboarding (see FLUSH_STAGES in src/lib/auth.tsx). Copy
  // stays descriptive: a plan is matched and assembled, never prescribed, and
  // nothing here claims a health outcome.
  plan_stage_profile: { hi: "आपकी जानकारी सहेजी जा रही है…", en: "Saving your details…" },
  plan_stage_answers: { hi: "आपके उत्तर दर्ज हो रहे हैं…", en: "Recording your answers…" },
  plan_stage_matching: { hi: "आपके लिए कार्यक्रम चुना जा रहा है…", en: "Matching your program…" },
  plan_stage_assembling: { hi: "आपका plan जोड़ा जा रहा है…", en: "Assembling your plan…" },
  plan_working_title: { hi: "आपका plan बन रहा है", en: "Building your plan" },
  plan_working_body: {
    hi: "बस कुछ क्षण — आपके उत्तरों के अनुसार।",
    en: "Just a moment — shaped by the answers you gave.",
  },
  // No rule matched yet. A real state, not an error: the write succeeded, the
  // content team simply has no program for this combination so far.
  plan_none_title: { hi: "अभी आपका plan तैयार नहीं है", en: "Your plan isn't ready yet" },
  plan_none_body: {
    hi: "आपके उत्तर सुरक्षित हैं। तब तक व्यायाम, ध्यान और जप आपके लिए खुले हैं — plan बनते ही यहीं दिखेगा।",
    en: "Your answers are safe. Workouts, meditation and jap are open to you meanwhile — your plan will appear here as soon as it's ready.",
  },
  plan_error_title: { hi: "सहेजा नहीं जा सका", en: "Couldn't save it" },
  plan_enter: { hi: "ऐप में जाएँ", en: "Go to the app" },
  plan_progress_label: { hi: "प्रगति", en: "Progress" },

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
  // {n} → seconds left; substituted at the call site (see StreakCard pattern).
  auth_resend_in: { hi: "नया कोड {n}s में", en: "New code in {n}s" },
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

  // jap counter (mantra jap tab) — a mala is 108
  jap_title: { hi: "मंत्र जप", en: "Mantra jap" },
  jap_remaining: { hi: "शेष", en: "remaining" },
  jap_complete: { hi: "एक माला पूरी 🙏", en: "One mala complete 🙏" },
  jap_meaning: { hi: "अर्थ", en: "Meaning" },
  jap_tap_hint: { hi: "हर जप पर दबाएँ", en: "Tap for each chant" },
  jap_start_again: { hi: "फिर से", en: "Start again" },
  jap_empty: { hi: "अभी कोई मंत्र नहीं", en: "No mantras yet" },

  // sleep sounds tab
  sleep_title: { hi: "नींद की ध्वनियाँ", en: "Sleep sounds" },
  sleep_tagline: { hi: "धीरे-धीरे शांत हो जाएँ", en: "Drift off gently" },
  sleep_timer: { hi: "अपने आप बंद", en: "Auto-stop" },
  timer_off: { hi: "बंद नहीं", en: "Off" },
  sleep_empty: { hi: "अभी कोई ध्वनि नहीं", en: "No sounds yet" },
  sleep_playing: { hi: "बज रहा है", en: "Playing" },
  sleep_stop: { hi: "रोकने के लिए दबाएँ", en: "Tap to stop" },

  // home (habit surface)
  todays_shloka: { hi: "आज का श्लोक", en: "Today's shloka" },
  sankalp_start: { hi: "संकल्प आज से शुरू करें", en: "Start your sankalp today" },
  sankalp_hint: { hi: "पहली गतिविधि पूरी करें और पहला दीया जलाएँ", en: "Complete your first activity to light the first diya" },
  sankalp_at_risk: { hi: "आज पूरा करें और अपना दीया जलाए रखें", en: "Complete today to keep your diya lit" },
  sankalp_freeze_saved: { hi: "एक क्षमा-दिवस ने आपका संकल्प बचाया", en: "A forgiveness day kept your sankalp" },
  // {n} is replaced with the streak count at the call site — the frame stays in
  // the catalog so all user-facing copy is reviewable in one place.
  sankalp_days: { hi: "{n} दिन का संकल्प", en: "{n}-day sankalp" },
  sankalp_longest: { hi: "सबसे लंबा: {n} दिन", en: "Longest: {n} days" },
  soon_badge: { hi: "जल्द", en: "Soon" },

  // Fit Points (slice 5, migration 0020). Descriptive and effort-based — points
  // are for showing up, never framed as a health outcome. {n}/{d}/{b} are
  // filled at the call site so the copy stays reviewable here.
  points_label: { hi: "फिट अंक", en: "Fit Points" },
  points_today: { hi: "आज +{n}", en: "+{n} today" },
  points_next_milestone: { hi: "{d} दिन और · {b} अंक बोनस", en: "{d} more days · {b} bonus" },
  points_next_milestone_one: { hi: "1 दिन और · {b} अंक बोनस", en: "1 more day · {b} bonus" },
  points_milestone_max: { hi: "सभी पड़ाव पूरे 🎉", en: "All milestones reached 🎉" },
  sleep_needs_five: { hi: "अंक पाने के लिए 5 मिनट सुनें", en: "Listen 5 minutes to earn points" },

  // the reward moment — shown when an activity completes (workout/meditation/
  // jap/sleep). `reward_earned` labels the counted-up "+N फिट अंक"; `reward_total`
  // is the running all-time total; `reward_capped` is the honest state when this
  // activity added nothing because the day's cap for it was already reached.
  reward_earned: { hi: "आपने अर्जित किए", en: "You earned" },
  reward_total: { hi: "कुल {n} फिट अंक", en: "{n} Fit Points total" },
  reward_capped: { hi: "आज के अंक पहले ही पूरे — लगे रहें 🙏", en: "Today's points already claimed — keep it up 🙏" },
  sleep_reward_title: { hi: "विश्राम पूर्ण 🙏", en: "Rest complete 🙏" },
  sleep_reward_body: { hi: "सुंदर विश्राम। शुभ रात्रि।", en: "Rest well. Good night." },

  // daily blessing (docs/specs/ui-polish.md slice E) — a once-a-day tap-to-reveal
  // devotional well-wish, the gentle come-back-tomorrow loop. The blessing IS the
  // reward (never a points number the client can't honestly source), and it stays
  // a warm well-wish — a blessing, never a product health claim.
  daily_blessing_title: { hi: "आज का आशीर्वाद", en: "Today's blessing" },
  daily_blessing_tap: { hi: "खोलने के लिए दबाएँ", en: "Tap to reveal" },
  daily_blessing_footer: { hi: "कल फिर एक नया आशीर्वाद", en: "A new blessing tomorrow" },
  blessing_1: { hi: "आज का दिन शुभ और शांत हो 🙏", en: "May today be gentle and blessed 🙏" },
  blessing_2: { hi: "आपके हर कदम में धैर्य और शक्ति हो", en: "May there be patience and strength in every step" },
  blessing_3: { hi: "मन शांत रहे, संकल्प दृढ़ रहे", en: "May your mind stay calm and your sankalp firm" },
  blessing_4: { hi: "आज भी अपने संकल्प का एक दीया जलाएँ", en: "Light one more diya on your sankalp today" },
  blessing_5: { hi: "जो करें, श्रद्धा और मन से करें", en: "Whatever you do, do it with heart and devotion" },
  blessing_6: { hi: "हर सुबह एक नई शुरुआत है", en: "Every morning is a fresh beginning" },
  blessing_7: { hi: "आपकी साधना आपको भीतर से शांत रखे", en: "May your sadhana keep you calm within" },

  // progress screen (slice 6). Numbers are rendered at the call site and the
  // labels stay separate, so nothing here needs interpolation. Copy is
  // descriptive and effort-based — never a health outcome or a body claim.
  progress_title: { hi: "आपकी प्रगति", en: "Your progress" },
  progress_this_week: { hi: "इस सप्ताह", en: "This week" },
  progress_sessions: { hi: "सत्र", en: "sessions" },
  progress_minutes: { hi: "मिनट", en: "minutes" },
  progress_sets: { hi: "कुल सेट", en: "total sets" },
  progress_days_trained: { hi: "दिन अभ्यास", en: "days trained" },
  progress_all_time: { hi: "अब तक", en: "All time" },
  progress_plan: { hi: "आपका plan", en: "Your plan" },
  progress_plan_days: { hi: "दिन पूरे", en: "days done" },
  progress_areas: { hi: "अंग के अनुसार", en: "By body area" },
  progress_activity: { hi: "पिछले 30 दिन", en: "Last 30 days" },
  progress_streak: { hi: "संकल्प", en: "Sankalp" },
  progress_longest: { hi: "सबसे लंबा", en: "Longest" },
  // Empty state — a brand-new user must meet encouragement, not a wall of
  // zeros (spec slice 6: "empty states are load-bearing").
  progress_empty_title: { hi: "आपकी यात्रा यहीं से दिखेगी", en: "Your journey will show up here" },
  progress_empty_body: {
    hi: "पहला व्यायाम पूरा करें — उसी क्षण से आपके दिन, मिनट और अंग यहाँ जुड़ने लगेंगे।",
    en: "Finish your first workout — your days, minutes and body areas start filling in from that moment.",
  },
  progress_empty_cta: { hi: "व्यायाम शुरू करें", en: "Start a workout" },
  progress_signin_body: {
    hi: "अपनी प्रगति सहेजने के लिए साइन-इन करें — नया फ़ोन हो या ऐप दोबारा इंस्टॉल, कुछ नहीं खोएगा।",
    en: "Sign in to save your progress — new phone or fresh install, nothing is lost.",
  },

  // workout structure
  workouts_section: { hi: "वर्कआउट", en: "Workouts" },
  all_exercises: { hi: "सभी व्यायाम", en: "All exercises" },
  exercises_word: { hi: "व्यायाम", en: "exercises" },

  // tile meta rows (redesign "tiles that speak") — the "what's inside" stats.
  // Numbers come from content counts at the call site; these are the words.
  sounds_word: { hi: "ध्वनियाँ", en: "sounds" },
  mantras_word: { hi: "मंत्र", en: "mantras" },
  meta_home_gym: { hi: "घर और जिम", en: "Home & gym" },
  meta_guided: { hi: "टाइमर के साथ", en: "With a timer" },
  meta_mala: { hi: "१०८ जप की माला", en: "108-bead mala" },
  meta_sleep_timer: { hi: "स्लीप टाइमर", en: "Sleep timer" },

  // the week mirror (redesign "reflect — never ask"): the app never asks about
  // anyone's devotion; it reflects the practice they already chose. {p} is the
  // localised pillar name, filled at the call site.
  mirror_title: { hi: "आपका सप्ताह", en: "Your week, reflected" },
  mirror_lead: { hi: "इस सप्ताह आपकी साधना {p} की ओर झुकी।", en: "This week your practice leaned into {p}." },
  mirror_footer: { hi: "पूछा नहीं — बस देखा गया।", en: "Noticed, never asked." },

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
  stop_sound: { hi: "ध्वनि रोकें", en: "Stop sound" },
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

  // notifications (slice 7)
  //
  // NOTE: the text of the notifications THEMSELVES is not here. It cannot be —
  // a scheduled push is composed by supabase/functions/send-push at 19:00 IST
  // with the app not running, so it renders from that function's own hi/en
  // catalog against the recipient's profiles.language_mode. That file is the
  // second place user-facing copy lives in this project, and the only one; it
  // carries the same non-medical, behaviour-only rule as everything below.
  //
  // These strings are the app's side: the invitation, and the controls.
  push_offer_title: { hi: "रोज़ याद दिला दें?", en: "Shall we remind you daily?" },
  push_offer_body: {
    hi: "एक छोटी सूचना, आपके चुने हुए समय पर — ताकि आपका संकल्प छूटे नहीं।",
    en: "One small nudge at a time you choose, so your sankalp doesn't slip.",
  },
  push_offer_yes: { hi: "हाँ, याद दिलाएँ", en: "Yes, remind me" },

  settings_notifications: { hi: "सूचनाएँ", en: "Notifications" },
  notif_master: { hi: "सूचनाएँ चालू रखें", en: "Allow notifications" },
  notif_daily: { hi: "रोज़ का अनुस्मारक", en: "Daily reminder" },
  notif_time: { hi: "समय", en: "Time" },
  notif_time_hint: { hi: "भारतीय समय (IST)", en: "India time (IST)" },
  notif_streak: { hi: "संकल्प छूटने पर", en: "When your sankalp is at risk" },
  notif_plan: { hi: "plan तैयार होने पर", en: "When your plan is ready" },
  notif_guest_hint: {
    hi: "अनुस्मारक सेट करने के लिए साइन-इन करें — ये आपके खाते के साथ सहेजे जाते हैं।",
    en: "Sign in to set reminders — they're saved to your account, not this phone.",
  },
  // The OS switch is off. We cannot turn it on from here, so say so plainly and
  // offer the one thing that does work.
  notif_blocked: {
    hi: "फ़ोन की सेटिंग्स में इस ऐप की सूचनाएँ बंद हैं।",
    en: "Notifications for this app are turned off in your phone's settings.",
  },
  notif_enable_cta: { hi: "सूचनाएँ चालू करें", en: "Turn on notifications" },
  notif_open_settings: { hi: "फ़ोन सेटिंग्स खोलें", en: "Open phone settings" },
  notif_unavailable: {
    hi: "इस बिल्ड में सूचनाएँ उपलब्ध नहीं हैं।",
    en: "Notifications aren't available in this build.",
  },
  notif_save_failed: { hi: "बदलाव सहेजा नहीं जा सका", en: "Couldn't save that change" },

  // disclaimers (compliance — docs/research/compliance.md)
  wellness_disclaimer: {
    hi: "यह ऐप केवल सामान्य स्वास्थ्य जानकारी देता है — यह चिकित्सा सलाह नहीं है। कोई भी नया व्यायाम या आहार शुरू करने से पहले चिकित्सक से परामर्श करें।",
    en: "This app provides general wellness information only — it is not medical advice. Consult a physician before starting any new exercise or diet programme.",
  },

  // diet tab + AI custom-plan (ported from origin/main; owner override 2026-07-16)
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
  // Today's meal — the diet pillar's daily completion. Tracking adherence, not
  // medical advice (health-claims fence-line): the copy stays "kept your plan",
  // never curative. Logging one "meal" activity closes the Body ring's diet half.
  diet_today_title: { hi: "आज का आहार", en: "Today's meals" },
  diet_today_sub: { hi: "आज अपने प्लान पर टिके रहे? इसे पूर्ण करें।", en: "Kept to your plan today? Mark it done." },
  diet_mark_meal: { hi: "मैंने अपना प्लान निभाया", en: "I kept my plan today" },
  diet_meal_done: { hi: "आज पूर्ण ✓", en: "Kept today ✓" },
  meal_reward_title: { hi: "आज का आहार पूर्ण 🙏", en: "Meal kept 🙏" },
  meal_reward_body: { hi: "आज की साधना का एक और अंश।", en: "One more piece of today's practice." },
  diet_ai_disclaimer: {
    hi: "यह योजना AI द्वारा बनाई गई सामान्य स्वास्थ्य जानकारी है — चिकित्सा सलाह नहीं। किसी भी नए आहार से पहले चिकित्सक से परामर्श करें।",
    en: "This plan is AI-generated general wellness guidance — not medical advice. Consult a physician before any new diet.",
  },
  auth_required_note: {
    hi: "यह सुविधा साइन-इन के साथ सक्रिय होगी।",
    en: "This feature activates once sign-in is available.",
  },
  // diet questionnaire
  dq_height: { hi: "आपकी लंबाई", en: "Your height" },
  dq_weight: { hi: "आपका वज़न", en: "Your weight" },
  dq_region: { hi: "आपका क्षेत्र", en: "Your region" },
  dq_activity: { hi: "आपकी दिनचर्या कितनी सक्रिय है?", en: "How active are you?" },
  dq_submit: { hi: "मेरा प्लान बनाएं", en: "Generate my plan" },
  region_north: { hi: "उत्तर भारतीय", en: "North Indian" },
  region_south: { hi: "दक्षिण भारतीय", en: "South Indian" },
  region_east: { hi: "पूर्वी भारतीय", en: "East Indian" },
  region_west: { hi: "पश्चिमी भारतीय", en: "West Indian" },
  region_central: { hi: "मध्य भारतीय", en: "Central Indian" },
  region_northeast: { hi: "पूर्वोत्तर भारतीय", en: "North-East Indian" },
  activity_sedentary: { hi: "कम सक्रिय", en: "Mostly sitting" },
  activity_moderate: { hi: "मध्यम सक्रिय", en: "Moderately active" },
  activity_active: { hi: "बहुत सक्रिय", en: "Very active" },
  // diet plan (AI generation status)
  plan_preparing_title: { hi: "आपका प्लान तैयार हो रहा है…", en: "Preparing your plan…" },
  plan_preparing_sub: {
    hi: "इसमें कुछ पल लग सकते हैं। आप बाद में यहाँ वापस आ सकते हैं।",
    en: "This can take a moment. You can come back here later.",
  },
  plan_failed: { hi: "प्लान तैयार नहीं हो सका", en: "Couldn't prepare your plan" },
  plan_failed_retry: { hi: "फिर से कोशिश करें", en: "Try again" },
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
