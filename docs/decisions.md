# Decision Log

One dated line per decision, with the why. Newest on top.

- **2026-07-10** — Programs-platform architecture: nothing hardcodes
  Bajrangvati; it is program #1. Why: enables every future product + possible
  white-label without a rebuild (see docs/idea.md "Beyond Bajrangvati").
- **2026-07-10** — v1 plan engine is rule-based (questionnaire → team-authored
  templates), no AI generation. Why: predictable, safe for health content,
  shippable in the office window.
- **2026-07-10** — Stack: Expo + TypeScript + Supabase; Next.js admin panel;
  Android-first. Why: reuses portal knowledge, one codebase, OTA updates for
  post-office fixes.
