# Fit Hindu App

Standalone devotional-fitness app for Hindu India (working name "Fit Hindu",
availability pending). Company: Herbal Deck. Daily workouts + diet plans
(video), meditation with timer/sounds, per-deity mantra jap, sleep sounds, and
a devotional layer. Business goal: build a daily habit for a large Hindu
audience → owned channel → Herbal Deck product cross-sell + first-party data.
See docs/idea.md (v1, 2026-07-12 pivot) for the full vision.

## Stack

- Mobile app: Expo (React Native) + TypeScript. Android is the primary target;
  iOS ships from the same codebase later.
- Backend: Supabase (Auth + Postgres + RLS + Storage), same patterns as the
  company portal.
- Admin panel: Next.js (separate `admin/` app) — the content team must be able
  to run ALL content without engineering help.
- Analytics: PostHog. Push: Expo notifications.

## Standing rules (do not violate)

- **Programs platform, not a single-product app.** Nothing in the schema,
  code, or design may hardcode one product, one deity, or one goal. A
  "program" = questionnaire mapping + plan templates + content library.
  Fitness programs, per-deity mantra sets, and devotional series are all
  content, authored in the admin panel — never hardcoded.
- **Plans are rule-based in v1.** Questionnaire answers map to team-authored
  plan templates. No AI generation of health advice.
- **Health claims:** the app gives general wellness guidance, never medical
  advice or disease-cure claims. Diet/workout screens carry disclaimers.
  When writing user-facing copy about the product, stay descriptive
  ("supports your routine"), never curative.
- **Devotional framing:** the emotional hook is Hindu devotional identity —
  in the app, keep it warm, respectful, and cultural. Public store copy and
  in-app UI stay devotional/cultural, never politically partisan ("Hindutva"
  political wording is a store-rejection + ad-law risk — keep that to internal
  strategy and ad campaigns). Never gate core worship (aarti/mantra) behind a
  paywall. See docs/idea.md "Compliance & trust fence-lines".
- **Hindi-first.** All user-facing strings go through the i18n layer from day
  one (hi + en). Never hardcode display text in components.
- **Design system only.** Screens are assembled from the tokens + base
  components in `src/ui/`. No one-off colors, fonts, or spacing values.
  (Expo Router owns `app/` as the routes folder; all non-route source lives
  in `src/`.)
- **Migrations:** any change under `supabase/migrations/` must be flagged
  loudly at the end of the session: "USER MUST RUN migration NNNN in
  Supabase." Never assume a migration has been applied.
- **Media:** video/audio files never go in the database or Supabase storage
  directly — object storage / CDN behind a swappable layer (see
  docs/decisions.md once hosting is chosen).
- **Time:** day boundaries and streaks use Asia/Kolkata (IST).
- **Not in v1** (do not build even if it seems easy): payments, AI plan
  generation, chat/community, consultations, referrals, third-party ads.

## Workflow

- Anything bigger than a tweak: plan first, and check `docs/specs/` for the
  feature's spec before writing code. If no spec exists, write one and get it
  confirmed before building.
- Definition of done for a feature: typecheck + lint + build green, verified
  by clicking through the flow in the web preview, `/code-review` run on the
  diff, `docs/progress.md` updated, committed.
- Record notable choices in `docs/decisions.md` (one dated line + rationale).

## Key docs

- `docs/idea.md` — product vision, money model, growth loops, beyond-v1 map
- `docs/specs/` — one file per feature (source of truth over chat)
- `docs/decisions.md` — dated decision log
- `docs/progress.md` — running build log (updated every ship)
