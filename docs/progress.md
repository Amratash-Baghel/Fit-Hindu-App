# Progress Log

Running build log — one entry per shipped item, newest on top. This is the
standup doc for the owner and the resume-from-home lifeline.

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
