# Decision Log

One dated line per decision, with the why. Newest on top.

- **2026-07-28 (streak exposes `freezes_used`)** — `streak_state()` returns the
  count of forgiveness days spent in the *current* run, not just the streak
  number. Why: the 2026-07-28 freeze rule promises gentle recovery framing, and
  without this the UI cannot tell a clean 10-day run from one a freeze rescued —
  it would either stay silent about the missed day or have to guess. Caught by
  the reviewer as a silent drop from the written spec; added before slice 4
  builds against the contract, since adding it later costs another migration.
- **2026-07-28 (`notification_prefs` carries no `program_id`)** — Deliberate
  exception to program-scoping, shaped like `profiles`. Why: "do not disturb"
  and "remind me at 19:00" are properties of the person, not of whichever
  program they are on, and there is no UI through which a user could express a
  per-program notification preference. `push_tokens` keeps `program_id` because
  a send is targeted at a device.
- **2026-07-28 (offline/replay dedup keys on position, not exercise)** —
  `exercise_logs` is keyed `(session_id, item_position, set_no)`. Why: a circuit
  or superset may legitimately list the same exercise at two positions, and
  keying on `exercise_id` would make the second occurrence collide with the
  first and silently drop a real set.

- **2026-07-28 (streak: computed, never stored counters)** — The feature-sprint
  prompt asked for a `streaks` table with `current_streak`/`longest_streak`
  columns kept fresh by a trigger. Overruled in favour of the existing design:
  streaks are **computed server-side from `activity_log`**
  (`current_streak()`, 0006). Why: stored counters are a second source of truth
  that drifts from the log, and every idempotency worry in the prompt — "two
  exercises on the same day must not increment twice" — is a symptom of that
  drift. Under the computed model `count(distinct ist_date)` **cannot**
  double-count; the bug class is structurally impossible rather than defended
  against in trigger code. Matches `docs/specs/tracking-streaks.md:29-31` and
  0006's zero-backfill promise. Revisit only if a real latency problem is
  measured on a slow connection, and then as a cache, not as truth.
- **2026-07-28 (streak rules)** — Day boundary **Asia/Kolkata** (already correct
  via `ist_today()`). A day counts on **≥1 core activity**. Rest days
  **preserve, do not increment**. **One freeze per rolling 7 days**, auto-applied
  — promised by `tracking-streaks.md:26` but absent from `current_streak()`,
  so the function is being rewritten. Retroactive completion **not allowed**
  (`ist_date` is server-defaulted; no UI exists for it). "At risk" is derived,
  not stored: `last_date = ist_today() - 1 AND current > 0`. Why the freeze: a
  devotional habit app that punishes one missed day with total loss triggers
  rage-quit, and the spec already committed to gentle recovery framing.
- **2026-07-28 (guests bank a local streak, merged on sign-in)** — Guest-first
  onboarding (2026-07-15) meant `logActivity` no-ops without a session
  (`activity.ts:22`), so the default new user completed a workout and banked
  nothing. Guests now log to AsyncStorage and see a real streak; signing in
  replays it into `activity_log`. Why: it makes the streak the *reason* to sign
  in rather than a feature locked behind sign-in, without touching the
  guest-first decision. Cost: a replay path with its own dedup requirement.
- **2026-07-28 (guest-merge dedup is DB-enforced, keyed on the event)** — Replay
  idempotency is a database constraint, not app-level checking. Owner specified
  a unique key on `(user_id, program_id, activity_date)`; **corrected to
  `client_event_id` with unique `(user_id, client_event_id)`**. Why the change:
  a day key permits only one activity row per user per day, which breaks
  `daily_activity` (0006:51-59 aggregates `array_agg(distinct activity_type)`
  and `count(*) as entries`), breaks `current_streak_for()` per-habit streaks,
  and would stop a user logging a workout *and* a meditation on the same day.
  The event key preserves the owner's principle — enforcement in the DB — and
  does double duty as the offline-queue dedup key for workout sessions, so one
  mechanism covers both instead of two.
- **2026-07-28 (`activity_log` retrofitted with `program_id`)** — The table
  predates the programs-platform rule and carries no `program_id`, which made
  program-scoped streaks impossible. Added in migration 0012 as **nullable →
  backfill from `user_plans` → set not null**; a bare `not null` add fails
  against seeded rows.
- **2026-07-28 (ceremony sub-palette, splash + plan-ready only)** — The owner's
  splash reference (oxblood field, terracotta filigree panels, cream, charcoal)
  is a different system from the shipped black/saffron/gold approved 2026-07-12.
  Rather than a one-off (banned) or a re-theme (expensive, discards an approved
  system), the reference colours enter `src/ui/tokens.ts` namespaced as
  `tokens.ceremony.*`, commented as usable **only** by the splash and the
  plan-ready screen. Why: the premium reference look on the two ceremonial
  surfaces, with no one-off values anywhere and the daily-use app untouched.
- **2026-07-28 (workstream 3 is a ceremony, not a generation loader)** — The
  prompt specified staged progress messaging over a slow diet-plan generation.
  No such generation exists — the diet card is a `soon` badge, and `assignPlan()`
  is one indexed query plus one insert. Building a fake progress bar over a
  sub-second call would also drift toward implying AI generation, which the
  v1 rules forbid. Built instead as a **plan-ready ceremony** whose stages are
  driven by the real awaits inside `flushOnboarding`, parameterised for reuse
  when diet and workout generation genuinely land. Diet content itself stays out
  of scope: it is a content-model + admin-panel workstream.
- **2026-07-28 (three dependencies added)** — `expo-haptics` and
  `expo-notifications` are unavoidable for their features. `react-native-reanimated`
  is added for one specific reason: the splash's stroke-dash arch reveal.
  `strokeDashoffset` is not native-driver-able, so under RN's built-in `Animated`
  it would cost a frame of bridge traffic per tick — the exact low-end Android
  failure the sprint is trying to avoid. Every other beat in the motion brief
  (fade, translate, rotate, scale, cross-fade) runs natively without it.
- **2026-07-28 (settings screen: stack route, not a sixth tab)** — Three
  workstreams need a settings surface and none existed. Placed on a stack route
  behind a Home header icon. Why: five tabs already, and Hindi labels are wide
  at 360dp — a sixth would crowd the primary navigation for the target device.
- **2026-07-15 (auth: guest-first, OTP, channel-agnostic)** — The onboarding
  spec deferred "does auth come before or after the questionnaire" to build
  time; owner decided **after the plan-ready celebration**, and skippable.
  Why: the user sees what they get before being asked for anything; lowest
  drop-off, matching the Leap/F&B reference flow. Consequence: answers live in
  AsyncStorage during the questionnaire and are flushed to
  profiles + questionnaire_responses + user_plans the moment a session exists
  (`flushOnboarding`), so a guest loses nothing by signing in late — and a
  failed flush keeps the answers on disk for a retry.
  **Channel: phone OTP is the v1 target** (a Hindi-first mass-market audience
  has a phone habit, not an email habit) **but development runs on email OTP**
  behind a single `AUTH_CHANNEL` constant. Why: Supabase cannot send an SMS
  until a paid provider (MSG91/Twilio) is connected — and MSG91 needs Indian
  DLT sender-ID registration, which takes days. Building channel-agnostic keeps
  auth off that critical path at zero rework: the screens are identical.
  Guests keep full access to workouts, meditation, jap and sleep — only
  streaks and My Workouts need an account (core worship is never gated).
- **2026-07-15 (jap/sleep ship as content-driven surfaces)** — Owner: ship the
  jap and sleep tabs now with 2–3 placeholder items that "just update" when
  content is added. Implemented as thin DB-driven lists (`mantras` deity-first,
  `sounds` where kind='sleep') with an honest empty state; publishing a row in
  the admin panel fills the tab with no code change and no release. Why: it
  respects the programs-platform rule, puts the content team's work on the
  clock, and avoids a fake-content demo. Specs written (docs/specs/jap.md,
  sleep.md) — session players (mala counter, sleep timer) are the next layer.
- **2026-07-15 (APK: no RECORD_AUDIO)** — `expo-audio` defaults
  `recordAudioAndroid: true`, which would have shipped a microphone permission
  the app never uses (it only ever plays; there is no recorder API anywhere in
  the codebase). Set to false; verified against the resolved prebuild config —
  background-playback permissions (FOREGROUND_SERVICE +
  FOREGROUND_SERVICE_MEDIA_PLAYBACK) are kept. Why: an unused microphone
  permission on a **Health & Fitness** listing is a needless Data-safety
  declaration and a review risk. Also installed `expo-splash-screen` and moved
  the splash config into its plugin: the legacy `expo.splash` block was inert
  (nothing consumed it), so the APK would have shown a bare colour.

- **2026-07-12** — Scope pivot: from "Bajrangvati companion app for product
  buyers" to **"Fit Hindu"** (working name), a standalone devotional-fitness
  app for Hindu India — workouts + diet + meditation (timer/sounds) + per-deity
  mantra jap (Hanuman/Ram/Shiv/Krishna) + sleep sounds + devotional layer, with
  devotional content series planned later. Why: devotion is India's strongest
  daily-habit anchor (Sri Mandir/Kuku data); a standalone app acquires a much
  larger Hindu audience than a buyer-gated companion, while Herbal Deck products
  cross-sell inside. Programs-platform architecture unchanged (now product- and
  deity-agnostic). idea.md rewritten to v1. Name/trademark availability pending.
- **2026-07-15 (workout v2 — reference-app model)** — Owner benchmarked
  Fitness & Bodybuilding (VGFIT/Softin), Home Workout (Leap), and Lifty;
  adopted: F&B structure (muscle-group library ≙ body_areas, goal plans ≙
  programs, **"My Workouts" user builder** → migration 0009 user_workouts +
  items, per-session sets/reps/weight **journal** → activity_log.meta) +
  Leap execution flow (**guided session player**: set tracking, rest screens
  with +20s/skip/next-up, auto-advance, completion stats). Onboarding
  question set v2 (goal → body-focus multi → level → days/week) in the same
  style; language stays Q1, deity optional, DPDP consent explicit.
  Deliberate deviations: no user-uploaded exercise media (brand-quality
  content only), no aggressive paywall, reliable item ordering (positions
  rewritten 1..n — the reference app's ordering is buggy).
- **2026-07-14 (premium pass + audit)** — No emoji as UI iconography: a
  proper SVG icon set (src/ui/icons.tsx, ported from the approved mockup
  paths) + AvatarTile placeholder component (ember gradient, silhouette,
  gold play badge) + gold-gradient primary buttons. Why: emoji render
  inconsistently across Android OEM fonts and read as cheap/AI-generated
  (owner feedback). Workout tab restructured: admin-COMPOSED workout
  templates are the primary surface (Home/Gym), exercise library below —
  the admin Compose area now directly drives the app. Audit fix: migration
  0008 makes sounds.audio_media_id nullable (admin "New sound" previously
  violated NOT NULL — placeholder-first flow requires nullable media FKs).
- **2026-07-13 (content model: library + composed sessions)** — Exercises and
  audio tracks are standalone, reusable **library objects**; workouts and
  sound sessions are ordered **compositions** referencing library objects via
  join tables — never duplicated copies. Editing a library object (e.g. a
  better avatar video) updates it everywhere it's referenced. Admin panel gets
  two clearly separate areas: **"Library"** (add/edit atomic content — the
  fitness lead's primary workspace) and **"Compose"** (assemble library items
  into workouts/sessions with drag-reorder). The v1 user flow "select body
  area → see exercises" pulls straight from the library filtered by
  body_area; composed multi-exercise Workouts follow once the library fills.
  *Mapping to shipped schema:* audio_tracks ≈ `sounds`, workouts ≈
  `workout_templates`, workout_items ≈ `workout_template_exercises` (already
  join-table shaped, already enforce the reuse rule). **Composed sound
  sessions** (`sound_sessions` + items with optional pause_after_seconds) are
  a small additive migration when that feature ships — nothing to rework.
- **2026-07-13 (admin upload flow)** — Content upload is "upload into the
  placeholder": admin navigates to the exact slot (e.g. Workouts → Chest →
  "Incline Pushup"), drags the avatar demo video into the form, the panel
  uploads to **Bunny via its API with a server-side key that never touches
  the browser**, Bunny returns the URL/ID, the panel writes it to that row's
  media reference — one action. Same for audio (Sleep Sounds → "Rain" → MP3).
  **Inline preview player after every upload** so the team instantly verifies
  the right file landed in the right slot. Default language mode is
  **English** until the user picks in onboarding (was: mixed).
- **2026-07-12 (data model)** — v1 schema designed & written (migrations
  0001–0007 + seed): deities/programs are TABLES not enums (admin-extensible,
  platform rule); `media` table is the swappable Bunny layer; `activity_log`
  is append-only with streaks as computed SQL functions (IST); plan engine =
  jsonb `assignment_rules` (priority, first-match); one-active-plan partial
  unique index; workout modes are filters over one GIN-indexed exercise
  library. Templates-only confirmed by owner (AI custom plans later →
  `user_plan_day_overrides` slot-in). All SQL parse-validated via libpg-query.
- **2026-07-12 (product lock)** — Feature set confirmed and spec'd
  (docs/specs/): (a) **language is onboarding question #1** with three display
  modes — Hindi-only / English-only / Mixed (Hindi lead + English caption;
  mixed was too cluttered as the only option); (b) **three workout modes** —
  home (desi bodyweight), gym, custom-by-body-area — all filters over one
  admin-authored **exercise object** library (create + name + upload video in
  admin; plans reference objects, never copy); (c) **sounds are admin-uploaded
  objects** feeding meditation/sleep/jap; (d) **meditation = 3-click flow**
  Start (ॐ autoplays) → sound selector → Next → instructions + 15-min default
  timer → Start → chant visual + ticking timer + completion bell; (e)
  **everything recorded**: per-activity ✓ ticks on home, daily streak,
  per-habit streaks, growing profile/history. **Points (fitness/bhakti),
  milestone rewards (e.g. Bajrangvati discount), friends/leaderboard →
  roadmap, schema-ready via activity_log but not built in v1** (rewards touch
  deferred monetization; social needs privacy/moderation). Design direction
  (black/saffron/gold mockups) approved as app structure.
- **2026-07-12 (owner meeting)** — v1 ships **Google Play only**; iOS/App Store
  deferred. Why: owner call; also removes the Apple D-U-N-S/enrollment delay
  from the critical path. D-U-N-S + Play listing owned by another team member.
- **2026-07-12 (owner meeting)** — Build priority is the **workout section
  first**; exercises demonstrated by an **in-house custom avatar** (company
  asset). Owner/team supplies exercise videos + audio (meditation sounds,
  chants, sleep sounds) + content; build owner authors the exercise/template/
  plan structure, content team fills it via the admin panel.
- **2026-07-12 (owner meeting)** — Lean **hard into Hindu devotional identity**
  in v1 (owner's own direction) as the emotional hook; still bounded by the
  public-copy fence-line (cultural, not politically partisan). Data: owner
  green-lights maximal use of all app-collected data for the company's benefit,
  bounded by DPDP-disclosed consent + Play Data Safety. Monetization confirmed
  out of v1 (audience first).
- **2026-07-12** — Monetization deferred: v1 sells/gates nothing. Product
  cross-sell is a *candidate, not confirmed*. Revenue surfaces (esp. a
  Cult.fit-style sliding promo banner for own products and/or third-party
  sponsors) come later — but build the banner as a generic admin-driven slot
  (image + link + schedule + targeting), product/sponsor-agnostic, so it's
  content work later, not a rebuild. Why: v1's job is audience + habit;
  keep options open without over-committing or spending devotional-app trust.
- **2026-07-12** — Public copy stays devotional/cultural, not politically
  partisan; political-emotion targeting lives in ad campaigns + internal
  strategy only. Why: overtly political framing risks Apple/Google rejection
  and Indian ad-law scrutiny; protects the launch.
- **2026-07-10** — Programs-platform architecture: nothing hardcodes
  Bajrangvati; it is program #1. Why: enables every future product + possible
  white-label without a rebuild (see docs/idea.md "Beyond Bajrangvati").
- **2026-07-10** — v1 plan engine is rule-based (questionnaire → team-authored
  templates), no AI generation. Why: predictable, safe for health content,
  shippable in the office window.
- **2026-07-10** — Stack: Expo + TypeScript + Supabase; Next.js admin panel;
  Android-first. Why: reuses portal knowledge, one codebase, OTA updates for
  post-office fixes.
