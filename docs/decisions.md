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
