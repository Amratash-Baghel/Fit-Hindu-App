# Progress Log

Running build log — one entry per shipped item, newest on top. This is the
standup doc for the owner and the resume-from-home lifeline.

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
