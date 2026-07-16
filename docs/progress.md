# Progress Log

Running build log — one entry per shipped item, newest on top. This is the
standup doc for the owner and the resume-from-home lifeline.

- **2026-07-16** — Jap + Sleep + name/greeting shipped; app made demo-ready.
  **Jap** (new spec docs/specs/jap.md): deity chips (default = deity of the
  day) → mantra + transliteration + meaning → big gold tap button with a
  pulsing saffron halo, 108 counting down, "Start again" on completion, one
  `jap` activity row per completed mala. **Sleep** (new spec docs/specs/
  sleep.md): reads live `sounds` rows (kind='sleep'), night-indigo mood,
  15/30/60/off auto-stop, placeholder rows greyed with a Soon badge, plays via
  the shared audio singleton. **Onboarding**: name question added as Q2 (spec
  amended — it was the one "no free-text" exception, owner-approved) and the
  greeting is now DB content matched to the deity of the day, so Home reads
  "राम राम, अमरतेश". **Two latent blockers found and fixed while building:**
  (1) nothing routed to onboarding — the app booted straight to Home, so a new
  user never saw the language question; there's now a gate on the tabs layout.
  (2) language was never persisted, so Hindi users got English on every
  relaunch. **Three real bugs caught by verification/review:** the mala counter
  lost taps to React batching (proved: 3 rapid taps registered 1 — now
  ref-backed, 105 taps → exactly 0); a failed storage write trapped users in an
  infinite onboarding↔tabs loop (proved by making writes throw — now survives
  via session memory); and the sleep auto-stop tick could clobber a timer
  change (same class as the workout +20s bug). Verified in the web preview:
  full onboarding in Hindi, name normalisation, persistence across reload, jap
  108→0 + deity switch reset, sleep play/timer-change/auto-stop-at-zero
  (observed end-to-end with a temporarily shortened timer)/stop, all 5 tabs,
  and the workout player for regressions. Typecheck + lint green, zero console
  errors. Also: docs/whats-left.md — a plain-language gap list + APK runbook
  for the owner. ⚠️ **USER MUST RUN `supabase/seed_add_greetings_mantras.sql`**
  in Supabase (idempotent): greetings had ZERO rows and only 2 of 4 deities had
  a mantra. Until then the greeting won't rotate and Jap shows 2 chips.
- **2026-07-16** — Lint clean: fixed all 11 react-hooks errors + 6 unused-var
  warnings surfaced by the first `npm run lint` run (all pre-existing). The
  real work was the session player (app/workout/session.tsx): completion
  stats are now frozen into state when the session completes instead of
  recomputing `Date.now()` and reading `log.current` during render; `complete`
  became a useCallback declared before its caller; and the work/rest
  zero-crossings moved out of two setState-in-effect hooks into the 1s
  interval that already owns the countdown (reading current state through a
  latest-value mirror ref so the tick doesn't restart on every keystroke).
  The loading fetches in the workout tab and template screen moved out of
  sync-setState-in-effect: the spinner is now set by whatever triggers the
  fetch (tab/area press, retry) and the effects only fetch, with cancellation
  guards added. **The mirror-ref refactor introduced a real bug that review
  caught and this ships fixed**: the rest tick had become an absolute write
  from the last-committed value, so a +20s tap landing within a frame of a
  tick was silently clobbered (~1-2% of taps) — rest adjustments now update
  the mirror synchronously so both writers compose. Verified in the web
  preview: full Squats session (3 sets, weight entry, rest +20s stacking
  3 taps → +60s with none lost, skip, completion stats 1 exercise/3 sets),
  timed path auto-advancing work→rest→work on a template session, and
  Home/Gym/Custom tab + body-area switching. Typecheck + lint green, zero
  console errors.
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
