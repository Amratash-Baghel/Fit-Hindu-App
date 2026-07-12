# Fit Hindu — Idea Document (v1)

> Status: DRAFT for owner discussion. Rewritten 2026-07-12 after the scope
> pivot. Working name is **"Fit Hindu"** — name/trademark availability is being
> checked; treat as provisional until confirmed. Company: Herbal Deck.
> Supersedes the v0 "Bajrangvati companion app" framing (see docs/decisions.md
> 2026-07-12).

## The pivot in one paragraph

We are no longer building a companion app locked to Bajrangvati buyers. We are
building a **standalone devotional-fitness app for Hindu India** — a daily
routine of workouts, diet, meditation, and mantra jap, wrapped in a devotional
identity. It acquires users on its own (not only post-purchase) and builds a
daily habit through the devotional hook. How it ultimately monetises is **not
locked** — first-party data and a later premium tier are on the table, and
Herbal Deck product cross-sell is a *possible* pillar but **not confirmed**
(decision deferred). v1's job is the audience and the habit, not revenue.

## One-line pitch

A daily fitness and devotion companion for the Hindu household — your workout,
your diet, your meditation, and your mantra jap, in one place, in your language.

To the customer (caller / QR / ad line):
**"Fit Hindu — roz ki exercise, diet, dhyan aur mantra jap, sab ek app mein.
Bilkul free."**

## The user

- **Primary:** Hindu, health-conscious, devotionally inclined Android users
  across a wide age range. Hindi-first, mid-range phone, Jio/Airtel data.
- **Seed audience (fastest to reach):** existing Herbal Deck / Bajrangvati
  buyers — already trust the brand, reachable for free via our own channels.
- **Growth audience:** the much larger set of Hindus who never bought a
  product but want a fitness + devotional daily routine. Ads target the
  devotional-fitness intent; the app converts and retains them.
- UI must be simple, large-type friendly, minimal steps, devotionally warm.

## Why this app (business goals, priority order)

1. **Daily habit → owned audience.** Devotion is the strongest daily-habit
   anchor in India (Sri Mandir ~55% six-month retention). Attach fitness and
   diet to the devotional ritual and we own a daily touchpoint with a large,
   trusting Hindu audience — for free, via push.
2. **First-party data moat.** The questionnaire + behaviour (goals, diet,
   deity affinity, festival engagement, adherence) sharpens ad targeting and
   caller scripts. See "The data advantage" below.
3. **Revenue — deferred.** How the app makes money is an open decision (see
   "How the money works"). Product cross-sell, a premium tier, and devotional
   transactions are all candidates; none is committed. v1 doesn't gate or sell.

## The core loop (v1)

Onboarding questionnaire (goal, age band, diet type, routine, chosen deity,
language)
→ rule-based plan assignment from team-authored templates
→ **daily home screen**: today's workout (video), today's meals, today's
meditation/mantra, today's devotional (shloka + deity of the day)
→ streaks + push reminders framed as ritual ("aarti / jap ka samay")
→ plan completion + festival moments = natural re-engagement hooks (what we do
with those moments commercially is a later decision).

## v1 modules

> **Primary functionality = workout, diet, meditation, sleep sounds, and
> chants (mantra jap).** That is the product core the app must nail. The
> devotional layer (shloka, deity-of-the-day, festival awareness) is the
> identity/hook wrapped around that core — a flavour that drives daily
> retention, not a separate product. Content series/stories and any revenue
> surfaces sit on top of this core, later.

- **Onboarding questionnaire + rule-based plan engine** — templates authored by
  the team, no AI generation of health advice in v1 (predictable, safe).
  **Question 1 is language:** three display modes — **हिंदी only / English
  only / Mixed** (Hindi lead + small English caption, the default look). Every
  screen renders in the chosen mode; switchable anytime in profile.
- **Daily home screen** — the habit surface; most polished screen in the app.
  Blends fitness + devotion into one daily card set.
- **Fitness / workout player** — in-house exercise videos demonstrated by our
  **custom avatar**, level-tagged (beginner/intermediate/advanced) inside
  goal-based multi-week programs. **The workout section is the v1 build
  priority — stand it up first.** Three workout modes:
  - **Home** — no-equipment desi exercises (Surya Namaskar, dand baithak…)
  - **Gym / regular** — equipment-based routines
  - **Custom** — user picks a body area (chest, legs, back…) and browses the
    exercise library filtered to it, building their own session.
  Exercises are named, admin-uploaded **exercise objects** (name hi/en, avatar
  video, body-area + mode + level tags) — plans are assembled from these same
  objects, never duplicated content. (Spec: docs/specs/workout.md)
- **Diet day view** — veg-first / sattvic-friendly Indian meals, regional.
- **Meditation mode** — a fast, guided 3-click flow: **"Start Meditation" →
  sound/chant selector (default ॐ starts playing immediately) → Next →
  instruction screen (video demo + timer selector, default 15 min) → Start →
  meditation screen** (chant visual + ticking timer + gentle bell when time
  completes). Customisation is visible but skippable — Start → Next → Start
  and you're meditating. (Spec: docs/specs/meditation.md)
- **Mantra jap** — per-deity chanting: **Hanuman, Ram, Shiv, Krishna** (extend
  later). Jap counter (mala / 108), audio chant loop, optional target count,
  written mantra + meaning in Hindi.
- **Sleep sounds** — ambient + devotional audio for sleep (offline-capable).
- **Devotional layer** — daily shloka/quote + deity-of-the-day on home,
  devotional audio in meditation, festival-aware greetings and content spikes
  (Navratri, Shravan, Ekadashi, Ram Navami, Janmashtami, Mahashivratri).
- **Tracking, streaks & profile** — every activity is recorded: today's
  exercise / meal / meditation / sleep each get a **✓ tick** on the home
  screen; daily streak; a **profile** with activity history and per-habit
  streaks (fitness streak, meditation streak…) so the app gets more personal
  the longer you use it. Push notifications framed as ritual reminders.
  (Spec: docs/specs/tracking-streaks.md)
- **Admin panel (web)** — content team runs everything without engineering:
  create/name **exercise objects** and upload their avatar videos; **upload and
  add sounds** (meditation chants, sleep sounds, jap audio); author diet
  templates, plans, mantras, devotional content. (Spec:
  docs/specs/content-model.md)

### Roadmap-adjacent (design the schema for it now, build later)

- **Devotional content series & stories** — generated/curated multi-part
  devotional series (deity stories, aarti explainers, festival guides) as a
  standalone daily habit surface even on fitness rest days. Kuku-Bhakti-style
  engagement engine. Content plumbing (series → episodes → media) should be
  program-shaped from day one so this is a content job later, not a rebuild.
- **Points & rewards** — *fitness points / bhakti points* earned per completed
  activity; milestone rewards (e.g. a Bajrangvati discount at a streak
  milestone). Schema-ready in v1 (activity log makes points a computed layer),
  switched on later — reward mechanics touch monetization, which is deferred.
- **Friends & leaderboard** — see friends' activity, compare on a leaderboard.
  Big retention lever but social features need moderation + privacy work;
  design the activity log so a social layer reads from it later.

## How the money works (all deferred — none committed for v1)

v1 does not sell or gate anything. Its job is audience + habit. These are the
*candidate* revenue paths, to be decided once the habit loop is proven; the
schema and design should leave room for them without building any yet.

1. **First-party data dividend (invisible but real).** The one revenue lever
   that's active from day one, indirectly — clean questionnaire + behaviour
   data sharpens ad targeting and caller scripts. See "The data advantage".
2. **Sliding promo banner (later — the most likely first surface).** A
   Cult.fit-style rotating banner on the home screen. Candidate uses, in
   order of trust-safety: (a) our own Herbal Deck products / offers, (b)
   third-party **sponsors** (relevant, brand-safe — devotional/wellness/FMCG),
   (c) festival campaigns. Build it as a **generic, admin-driven slot**
   (image + link + schedule + targeting), product- and sponsor-agnostic, so
   filling it is content work later, not a rebuild. Sponsor ads in a
   devotional app spend trust — keep them relevant, sparse, and clearly not
   medical claims.
3. **Product cross-sell (candidate, not confirmed).** In-app "shop / reorder"
   for Herbal Deck physical goods — exempt from store commission. Deity
   affinity + goals could surface the right product per user. Deferred until
   the owner confirms whether the app sells at all.
4. **Premium tier (v2+).** Advanced plans, live/recorded sessions, dietician
   consults, premium devotional catalogue. Digital → store fees apply
   (15% small-business rate). Build the audience first.
5. **Devotional micro-transactions (v2+, careful).** Sri-Mandir-style e-puja /
   sankalp / chadhava offerings. High potential but must never feel
   exploitative of faith — a trust fence-line, not just a compliance one.

## The data advantage (internal strategy — not user-facing)

> **Guardrail first.** Everything below is legitimate first-party-data business
> strategy, but under the DPDP Act 2023 + Rules 2025 we may only *collect* and
> *use* data for purposes we itemise in the consent notice, with affirmative
> opt-in, minimisation, and a deletion path. The strategy here must stay inside
> what docs/research/compliance.md permits: disclose these purposes in the
> notice, keep health-condition questions optional, never repurpose data beyond
> the stated purposes. Data as an asset only holds if it's collected cleanly —
> a Play takedown or DPDP penalty destroys the asset. Design the consent notice
> to *cover* these uses, don't hide them.

Why owning this data is a genuine competitive moat for Herbal Deck:

- **What we learn per user:** goal (weight, strength, stamina, general
  wellness), diet type (veg/sattvic/non-veg), age band, routine, **chosen
  deity / devotional affinity**, festival engagement, workout & diet
  adherence, meditation/jap frequency, churn signals, reorder timing.
- **Sharper paid acquisition.** Real goal + affinity data feeds Meta/Google
  custom audiences and lookalikes — we stop guessing who converts and target
  the devotional-fitness intent precisely; lower CAC over time.
- **Retargeting & win-back.** Behavioural signals (lapsed streak, plan near
  completion, festival window) trigger the right ad or push at the right time.
- **Caller intelligence.** Herbal Deck's ~600 callers get per-user context —
  goal, adherence, likely-needed product — turning cold pitches into informed
  ones. The app becomes a CRM enrichment engine for the call centre.
- **Segmentation & cross-sell.** Deity affinity + goal → the right product
  bundle for each user ("your sleep answers suggest X"). Festival calendar →
  timed campaigns. This is what makes the catalogue-wide v2 cross-sell work.
- **Churn prediction & reorder timing.** Adherence + streak decay predict who's
  about to lapse and who's about to run out of product — the two moments where
  a nudge pays for itself.
- **Product & content R&D.** Aggregate goals/affinities tell the company which
  new products and devotional content to make next.

The rule: **collect the minimum, disclose every purpose, use it aggressively
inside those disclosed purposes.** Clean data used well beats dirty data
used once.

## The unfair advantage — our traffic and leads

We don't only buy users; we already own a launch base. Every existing
touchpoint funnels in (each with a tracked link so we know what works):

- **QR code inside every product box** — "Scan karo, apna free Fit Hindu plan
  pao." Highest-intent moment we have. (Print lead time: start early.)
- **Order confirmation SMS/WhatsApp** with the app link.
- **~600 callers** add one closing line after every sale.
- **Website** post-purchase page + banner for past buyers.
- **Influencers** — devotional-fitness creators demo the app.
- **Paid ads** — the growth engine beyond our own base, targeting the
  devotional-fitness intent.

## Architecture — a platform, not a single-program app

The key decision holds and is now even more central: **build a "programs"
platform.** A program = questionnaire mapping + plan templates + content
library. Nothing hardcodes one product, one deity, or one goal.

- **v1 ships as Fit Hindu** (focused promise, simple pitch) — but under the
  hood everything is program/content-shaped. Adding a fitness program, a new
  deity's mantra set, or a devotional series is content work in the admin
  panel, not a rebuild.
- **v2 — the Herbal Deck wellness ecosystem:** every product maps to a program;
  in-app shop + cross-sell; subscription refill plans.
- **v2/v3 — services & devotional layers:** paid dietician / AYUSH tele-consults
  (call-centre muscle already exists), community/challenges (group streaks,
  festival challenges), the full devotional content-series surface, UGC/
  testimonials feeding the ad-creative team, referrals.
- **Long-term option — white-label:** the same platform (programs + admin panel
  + funnel playbook) could deploy for other D2C brands. An option the
  architecture keeps open, not a commitment.

## Compliance & trust fence-lines (read before writing any copy)

- **Health claims:** the app is *Health & Fitness*, never *Medical*. Never
  "treats/cures/prevents." Disclaimers on onboarding, first workout, and any
  product screen. Full table in docs/research/compliance.md — unchanged and
  now more important (standalone health app, not just a product companion).
- **Religious/political framing:** the *emotional hook* is Hindu devotional
  identity and pride — welcome and validated by the market. But **public store
  listing and in-app copy must stay devotional/cultural, not politically
  partisan.** Overtly political "Hindutva" wording in the listing risks
  Apple/Google rejection (content promoting division) and Indian ad-law
  scrutiny. Keep political-emotion targeting in the *ad campaigns and internal
  strategy*; keep the app itself a warm devotional-fitness product. Get the
  final public name + tagline reviewed against store policy before submission.
- **Devotional respect:** never gate core worship (aarti/mantra) behind a
  paywall in a way that feels like charging for faith; monetise the fitness/
  premium/product layers, keep the devotional core generous.
- **DPDP:** consent notice must itemise and cover the data uses above.

## Not in v1 (protective list)

AI plan/health-advice generation, chat/community, consultations, referral
system, third-party ads, premium/paywall, devotional micro-transactions,
**iOS/App Store listing (Play-only for v1; iOS ships from the same codebase
later)**. Devotional content *series/stories* are schema-ready in v1 but
authored later.

## Owner decisions (meeting 2026-07-12)

1. **Store scope:** **Google Play only for v1.** iOS/App Store deferred. This
   removes the Apple D-U-N-S/enrollment black-hole from the critical path.
2. **D-U-N-S + Play listing:** owned by someone else on the team — off the
   build owner's plate.
3. **Budget:** approved (Bunny hosting + Play account).
4. **Standalone:** confirmed — open to everyone, not buyer-gated.
5. **Devotional identity:** owner's own direction — lean into the Hindu
   identity as hard as possible in v1 to maximise the emotional hook. (Still
   inside the fence-lines above: warm/cultural in public copy, political
   framing stays in internal strategy + ad campaigns.)
6. **Monetization:** none in v1. Audience + habit first; revenue surfaces later.
7. **Data:** green light to make the most of all data the app collects, for the
   app's and company's benefit. Engineering keeps this inside DPDP-disclosed
   consent + the Play Data Safety declaration — not a blocker, just how we
   collect and disclose (see "The data advantage" guardrail).
8. **Build priority:** stand up the basic structure first, **workout section
   first**.
9. **Content:** exercises are demonstrated by an **in-house custom avatar**
   (their own asset). Owner/team provides the exercise videos, audio (meditation
   sounds, chants, sleep sounds), and other content. Build owner authors the
   template/plan structure; the content team fills it via the admin panel.

## Still open / deferred

- **Name lock** — "Fit Hindu" availability still being confirmed by the team.
- **Deity set for v1** — Hanuman/Ram/Shiv/Krishna assumed; confirm final list
  when the mantra-jap section is built.
- **Content ops owner** for after WFH — not needed yet.
