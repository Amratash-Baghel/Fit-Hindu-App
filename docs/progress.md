# Progress Log

Running build log — one entry per shipped item, newest on top. This is the
standup doc for the owner and the resume-from-home lifeline.

- **2026-07-29** — **Feature sprint slice 4: streak wired to the UI.** The Home
  "sankalp" card showed three permanently-dim diyas — a mockup stub. Replaced it
  with a live `StreakCard` driven by a new `useStreak()` hook (`src/lib/streak.ts`)
  that reads the server-side `streak_state()` RPC (migration 0012, already
  applied): the streak is computed in Postgres in Asia/Kolkata with the
  one-freeze-per-week rule, never on the untrustworthy device clock. The card
  now renders the real day count (gold headline + a seven-diya week row, lit =
  min(streak, 7)), the longest-streak line, the at-risk nudge, and the gentle
  "a forgiveness day kept your sankalp" line off `freezes_used`. Framing stays
  no-guilt: a broken streak reads as an invitation to begin again. Guests (no
  session) and the first-read window show that invitation rather than a zero or
  a flash of "start over". Streak logic itself was already proven by the PGlite
  harness — re-ran `supabase/tests/validate.mjs`, **34/34 green**, covering
  same-day double, one/two-day gaps, freeze bridging, at-risk, dead-streak,
  longest-survives, `freezes_used`, and per-user isolation. Two new i18n pairs
  (`sankalp_at_risk`, `sankalp_freeze_saved`) plus `{n}`-interpolated
  `sankalp_days`/`sankalp_longest` — all copy in the catalog. Reviewer
  (`.claude/agents/reviewer.md`) run on the diff: RLS/program-scoping/secrets/
  health-claims/perf all clean; flagged and fixed a slow-network flash of the
  invitation for returning streak-holders, and moved the dynamic strings into
  the catalog. Typecheck green, lint at the 11-error baseline (new files add
  zero). Verified in web preview: Home renders the StreakCard (8 diya SVGs = 1
  header + 7 week), invitation state for a guest, zero console errors. The
  lit-diya active state and the RPC round-trip are physical-device / real-session
  only. **Deferred, and now flagged:** the "guests bank a local streak" decision
  (2026-07-28) is recorded but NOT built — `activity.ts` still no-ops for guests,
  so the default signed-out user banks nothing. Left for its own slice.
- **2026-07-29** — **Feature sprint slice 3: splash / launch screen.** Replaced
  the bare `null` cold-start frame (the C4 "dead frame") with an animated
  oxblood-and-gold ceremony. `preventAutoHideAsync()` holds the native splash
  from module load; a `SplashGate` inside AuthProvider paints the animated
  overlay, hides the native splash on its first frame (seam-free — `app.json`
  splash background now matches `ceremony.field` maroon), plays the motion, then
  cross-fades to the home screen mounted underneath. Artwork is all
  `react-native-svg` paths in `src/ui/ceremony/art.tsx` (no bitmaps): radial
  field, gold ogee arch drawn via stroke-dash, gada emblem on a gold ring,
  terracotta filigree panels. Motion is Reanimated on the UI thread (added
  `babel.config.js` for the `react-native-worklets` plugin; `react-native-reanimated`
  + `react-native-worklets` declared in package.json — owner-approved). Budget
  1.6–2.2 s, 1.2 s min beat, gold-shimmer idle hold for slow data, 6 s hard
  timeout, reduce-motion → static. Completion runs on plain timers, not rAF
  callbacks, so a frozen frame loop can never trap the user — verified in web
  preview that the splash mounts (19 SVG paths, wordmark + tagline) and reliably
  self-dismisses to onboarding even in a backgrounded tab. Ceremony palette
  namespaced `tokens.ceremony.*` (splash + plan-ready only). Reviewer
  (`.claude/agents/reviewer.md`) run on the diff: no high/critical findings;
  fixed an idle-shimmer restart and recorded the brand-wordmark i18n exception.
  Motion smoothness on low-end hardware and the native handoff seam are
  physical-device-only.
- **2026-07-28** — **Feature sprint slice 2: haptics + sound feedback.** The app
  had zero tactile/audio feedback (not broken — never built). Added
  `src/lib/feedback.ts` — one service, `tap/success/complete/error`, each a
  haptic paired with a short chime, gated by two settings toggles (Vibration,
  Sound; local, default on) that persist to AsyncStorage. Players preloaded
  once at startup, never per tap. Four placeholder SFX synthesised into
  `assets/sfx/` (~49 KB total) for the sound designer to replace. Wired into:
  every set completed, workout complete, meditation complete, plan assigned, and
  the destructive sign-out confirm. Fixed the audio-mode leak the spec flagged —
  ambient meditation's `playsInSilentMode:true` no longer bleeds into UI chirps.
  Added `expo-haptics`, a `Toggle` UI primitive, and the Feedback section in
  Settings. Reviewer (`.claude/agents/reviewer.md`) caught an unhandled
  `seekTo` rejection and a misleading comment — both fixed. Verified in web
  preview (toggles persist, sound path fires clean); haptics + silent-switch
  are physical-device-only.
- **2026-07-28** — **Feature sprint slices 1 + 1b.** Migrations 0011 (workout
  sessions, exercise logs, push tokens, notification prefs + a security_invoker
  session_summary view) and 0012 (activity_log gets program_id + client_event_id,
  streak rewritten for one forgiveness day per rolling 7 days, new streak_state()
  RPC) — validated against real Postgres via PGlite (34 checks) and applied in
  Supabase. Then slice 1b: the app finally has a **settings screen**, a stack
  route behind a Home header gear. Three sections that are real today — Language
  (the first way to change language after onboarding; writes through to
  profiles.language_mode when signed in so it survives a reinstall), Account
  (guest → sign in, user → inline sign-out confirm), and About (privacy link
  when live, wellness disclaimer, build version). Slices 2 and 7 add Haptics/
  Sound and Notification sections. Verified by clicking through in web preview.
- **2026-07-15** — **Onboarding v2 + auth + plan engine — the app now has a
  middle.** Before today every user-data surface was wired but dead: no auth
  anywhere, onboarding was unreachable dead code (nothing routed to it, so the
  language question no user ever saw), language reset to English on every
  restart, and `assignment_rules` existed in the DB with nothing reading it.
  Shipped: migration 0010 (profiles.level + body_focus body_area[] +
  days_per_week, language_mode default 'mixed'→'english' to match the app);
  **11-step questionnaire** as one state machine (progress dots, back,
  resume-at-last-answered, ~45 new i18n pairs, questions as data in
  src/lib/onboarding.ts); **plan engine** (src/lib/planRules.ts pure +
  plan.ts I/O — first-match-by-priority, absent key = any, supersedes the
  active plan rather than violating one-active-per-user); **guest-first OTP
  auth** (src/lib/auth.tsx, channel-agnostic behind AUTH_CHANNEL) with the
  guest→user bridge flushing AsyncStorage answers → profiles +
  questionnaire_responses + user_plans; **app/index.tsx cold-start router**
  (what finally makes onboarding reachable). Jap + sleep tabs became
  content-driven lists (mantras deity-first, sounds kind='sleep') per new
  specs — publishing a row fills them, no release. APK config: RECORD_AUDIO
  removed, expo-splash-screen installed (legacy splash block was inert).
  Verified: PGlite all 10 migrations + seed + 13 assertions PASS; 16 plan-rule
  assertions PASS against the real module (incl. the seed rule → home wins,
  gym/later/unanswered → null not a crash); preview — full flow in Hindi,
  language flips live AND survives restart, 18+ gate blocks and is escapable,
  consent unticked by default and blocks until ticked, deity list loads 4 real
  deities from live Supabase, resume returns mid-flow, jap/sleep render live
  rows, zero console errors, typecheck green. Fixed en route: aria-checked was
  never reaching the DOM on the consent checkbox and answer rows
  (accessibilityState is dropped by RN Web) — a consent control that doesn't
  announce its state isn't acceptable. Lint ran for the first time (eslint was
  never installed): 11 errors + 6 warnings, ALL pre-existing, none in the new
  code — spun out as a separate task.
  ⚠️ USER MUST RUN migrations 0008 + 0009 + 0010 in Supabase.
  ⚠️ Auth is UNVERIFIED end-to-end: it needs a real OTP inbox — owner action.
  ⚠️ `eas init` still not run (no extra.eas.projectId) — blocks any APK.
- **2026-07-15** — Play Store setup delegated: wrote docs/play-store-setup.md
  — a non-technical, step-by-step runbook (documents to collect, D-U-N-S
  lookup → application, company Google account, Organization registration +
  $25, verification, inviting Amratash, listing assets, report-back
  checklist). Research doc updated for **Play-only** (Apple sections marked
  out of scope; timeline + gotchas revised). **Key finding: D-U-N-S is
  mandatory for a Play org account (PAN/GST/CIN don't substitute) and the
  free track runs up to 30 business days — paid expedited is 5–7 days and is
  the recommendation. It is now the entire critical path.** Also confirmed:
  individual accounts cannot publish Health & Fitness apps since 28 Jan 2026
  → Organization is mandatory, not just preferred. Privacy policy URL is a
  hard publishing blocker and still undrafted.
- **2026-07-15** — Workout v2 (reference-app model) + deploy pipeline:
  guided session player (work → rest → done; set tracking, timed sets,
  +20s/skip rest with next-up preview, gym weight input, completion stats →
  activity_log journal meta), My Workouts builder (migration 0009,
  own-row RLS, reliable 1..n ordering) with pre-auth placeholder, workout
  spec v2 + onboarding question-set v2 docs, eas.json (preview=APK) +
  docs/deploy.md runbook, admin production build verified green
  (Vercel-ready). Verified in preview: full session Squats 3 sets with
  weight, rest +20s/skip, completion 1/3/2min; PGlite: all 9 migrations +
  0009 smoke PASS. Learning log restarted (2 entries).
  ⚠️ USER MUST RUN migrations 0008 + 0009 in Supabase.
- **2026-07-14** — Premium pass + audit: SVG icon set replaces every emoji
  (tab bar, cards, tiles, meditation); AvatarTile component (gradient +
  silhouette + gold play) on all video placeholders; gold-gradient buttons
  with glow; daily home rebuilt to mockup quality with LIVE devotional data
  (deity-of-the-day via scheduled row → weekday fallback — verified: Tuesday
  → Hanuman → Hanuman Stuti shloka), sankalp/diya card, today cards; workout
  tab restructured — admin-composed templates first (verified: "Full Body —
  Beginner" template + ordered 5-exercise detail with effective sets/reps),
  library grid below; new /workout/template/[id] route. Audit fixes:
  migration 0008 (sounds.audio_media_id nullable — admin New-sound was
  broken against NOT NULL), root tsconfig excludes admin/. All flows
  re-verified in preview, zero console errors, both typechecks green.
  ⚠️ USER MUST RUN migration 0008 in the Supabase SQL editor.
- **2026-07-14** — Meditation section shipped (3-click flow per spec):
  entry (Start) → sound selector (default ॐ chant auto-plays on open, live
  switch, Silent option) → instructions + timer presets (15-min default) →
  session screen (pulsing ॐ, ticking countdown, keep-awake, pause/resume,
  end-early with ≥3-min generosity) → completion moment (🪔). Singleton
  audio service (expo-audio) so sound survives across screens; unreachable
  media fails silent by design. Activity logging call sites in place —
  no-op until app auth ships. Verified in preview: exactly 3 clicks to a
  running session, pause freezes timer, 1-min session reaches completion,
  zero console errors, typecheck green.
- **2026-07-14** — Admin panel v1 built (admin/ Next.js app): login +
  middleware auth gate + is_admin() check (no service-role key anywhere —
  RLS is the boundary); Library area (exercises + sounds: list, full editor,
  draft/publish) with the upload-into-placeholder flow — file upload → Bunny
  via server-only key OR paste-URL fallback (works before Bunny exists),
  media row + FK set in one action, inline preview player (hls.js/audio);
  Compose area (workout templates: add from library, reorder, per-slot
  overrides, single-save rewrite). Both apps typecheck green; root tsconfig
  excludes admin/. Login gate verified in browser. ⚠️ E2E content-flow
  verification pending USER bootstrap: create admin auth user + admin_users
  row (steps in session notes), then log in and click through.
- **2026-07-13** — Workout section v1 shipped (owner build priority): browse
  screen with 3 modes (Home / Gym / Custom-by-body-area, 7 area chips), tile
  cards with avatar placeholder + "Our Avatar" badge, exercise detail screen
  (avatar video hero, sets/reps/rest stat chips, instructions, gold Start,
  safety disclaimer). Typed content query layer (src/lib/content.ts) with
  media FK joins. Default language switched to English (owner call).
  Verified live against real Supabase: 6 home exercises load, Legs filter
  returns exactly Dand Baithak + Squats, detail renders seeded data, zero
  console errors, typecheck green. Content-model decision recorded (library
  + composed sessions; admin Library/Compose areas; upload-into-placeholder
  flow with server-side Bunny key + inline preview player).
- **2026-07-13** — Expo scaffold shipped: Expo Router (SDK 57) + TypeScript,
  5 tabs (home/workout/meditation/jap/sleep), design tokens + base components
  (src/ui: Screen/Card/Chip/Button/T/B) from the approved black-saffron-gold
  design, i18n layer with the 3 language modes (hindi/english/mixed) wired to
  onboarding question #1, Supabase client + .env.example, night mood on the
  sleep tab. Verified in web preview: all routes render, all 3 language modes
  switch live app-wide, onboarding → tabs navigation works, zero console/
  server errors, typecheck green. CLAUDE.md updated: design system lives in
  src/ui (app/ is the routes folder).
- **2026-07-12** — Data model v1: 7 migrations (enums/helpers → identity →
  media+content atoms → templates → programs+rules → user state+activity →
  devotional calendar), dev seed, TS types (app/types/db.ts), schema spec
  (docs/specs/data-model.md). RLS on every table. Syntax-validated with a
  real PG engine (PGlite): all 7 migrations apply, seed loads, streak
  functions + daily_activity view + custom body-area filter return correct
  results. Fixed two bugs found by executing (not just parsing): `date -
  bigint` in the streak functions (cast row_number to int), and a
  text→uuid cast in the seed's program_days insert. Added
  supabase/reset_dev.sql for clean re-apply. ⚠️ USER MUST RUN reset_dev.sql
  then migrations 0001–0007 then seed.sql in Supabase (a partial apply left
  some tables behind).
- **2026-07-12** — Product locked with owner: Fit Hindu pivot recorded; 5
  feature specs written (onboarding w/ 3 language modes, workout w/ 3 modes +
  exercise objects, meditation 3-click flow, tracking/streaks, content
  model); black/saffron/gold design mockups approved (6 screens) + owner
  review doc/PDF; design brief. Play-only v1.
- **2026-07-10** — Phase 0 research complete: store requirements, health/
  claims compliance, competitor teardown, media hosting (docs/research/).
  Key outcomes: D-U-N-S request is the critical path (owner action THIS
  WEEK); org accounts on both stores; Bunny Stream for video; free-for-buyers
  model validated; devotional daily ritual = strongest retention hook.
- **2026-07-10** — Project scaffold: idea doc (docs/idea.md), CLAUDE.md
  standing rules, workflow skills (/screen, /migration, /ship), decision +
  progress logs. Phase 0 research agents pending relaunch (first run was cut
  off by a session limit).
