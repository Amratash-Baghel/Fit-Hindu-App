# Decision Log

One dated line per decision, with the why. Newest on top.

- **2026-07-12** — Scope pivot: from "Bajrangvati companion app for product
  buyers" to **"Fit Hindu"** (working name), a standalone devotional-fitness
  app for Hindu India — workouts + diet + meditation (timer/sounds) + per-deity
  mantra jap (Hanuman/Ram/Shiv/Krishna) + sleep sounds + devotional layer, with
  devotional content series planned later. Why: devotion is India's strongest
  daily-habit anchor (Sri Mandir/Kuku data); a standalone app acquires a much
  larger Hindu audience than a buyer-gated companion, while Herbal Deck products
  cross-sell inside. Programs-platform architecture unchanged (now product- and
  deity-agnostic). idea.md rewritten to v1. Name/trademark availability pending.
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
