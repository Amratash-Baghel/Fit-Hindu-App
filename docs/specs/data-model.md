# Spec — Data Model (v1 schema)

> Status: DESIGNED 2026-07-12 (plan-mode session, approved). Source of truth =
> `supabase/migrations/0001–0007`. This doc is the map; the SQL is the law.
> TS mirror: `app/types/db.ts` (swap for `supabase gen types` once linked).

## The 5 layers

```
5  scheduling      daily_devotional · festivals · (deity weekday fallback)
4  programs        programs · program_days · assignment_rules · user_plans
3  templates       workout_templates(+exercises) · diet_templates(+meals)
2  content atoms   exercises · sounds · mantras · meals · devotional_items · deities
1  media           media (Bunny refs only — provider/external_id/playback_url)
                   + the spine: activity_log → daily_activity view → streak fns
```

**Reuse rule enforced by shape:** templates hold *references + per-slot
overrides*, never copies. Editing an exercise object propagates everywhere.

## Key decisions (and why)

- **Deities are a table, not an enum** — content team adds Ganesh/Durga in
  admin, no migration. Same logic later for any taxonomy that might grow.
  True enums only for closed vocabularies (language_mode, level, meal_time,
  activity_type, content_status…). All in migration 0001.
- **`media` is the swappable hosting layer** — one row per file with
  `provider` + `external_id` + `playback_url`. Bunny→Mux migration = row
  updates, zero app changes (per docs/research/media-hosting.md).
- **`activity_log` is append-only** (RLS has no update/delete policies).
  Ticks = `daily_activity` view (security_invoker). Streaks =
  `current_streak(uid)` + `current_streak_for(uid, type)` SQL functions —
  computed, never stored counters that drift. Day boundary: `ist_today()`
  (Asia/Kolkata, standing rule).
- **Plan engine = `assignment_rules`** — jsonb conditions evaluated by
  priority, first match wins; absent key = "any". Authored in admin.
  Owner-confirmed: templates only in v1; AI custom plans later slot in as a
  `user_plan_day_overrides` table beside `user_plans` — no rework.
- **One active plan per user** — partial unique index on
  `user_plans(user_id) where status='active'`.
- **Exercises carry `body_areas[]` + `modes[]`** (GIN-indexed) — the three
  workout modes (home/gym/custom-by-body-area) are *filters over one
  library*, exactly as the workout spec requires.
- **Auth trigger** creates a `profiles` row on signup; questionnaire answers
  land in typed profile columns + versioned `questionnaire_responses` jsonb.

## RLS posture (every table, same migration as its creation)

| Class | Read | Write |
|---|---|---|
| Content (atoms/templates/programs/rules/deities/festivals) | public, `status='published'` only (admins see drafts) | `is_admin()` |
| Junctions (template_exercises, program_days, daily_devotional…) | public | `is_admin()` |
| media | public | `is_admin()` |
| User rows (profiles, questionnaire, user_plans) | own | own |
| activity_log | own | own INSERT only (append-only) |
| admin_users | own row | dashboard/service role only |

`is_admin()` is security-definer over `admin_users`.

## Deferred, schema-ready

Points/rewards (ledger view over activity_log) · friends/leaderboard
(`friendships` table later; log already has the data) · AI plans
(`user_plan_day_overrides`) · promo banner slot · devotional series tables.

## Seed (`supabase/seed.sql`, dev only)

4 deities · 6 exercises · 5 sounds · 2 mantras · 3 meals · 1 workout + 1 diet
template · 1 28-day program (rest every 7th day) · 1 assignment rule · today's
daily_devotional. Media URLs are placeholders until real Bunny uploads.

## How the app reads it (the three core queries)

1. **Today screen:** `user_plans(active)` → day# from `started_on` vs
   `ist_today()` → `program_days` → templates → atoms; ticks from
   `daily_activity where ist_date = ist_today()`.
2. **Custom workout:** `exercises where body_areas && {chest} and modes @>
   {home} and status='published'`.
3. **Streaks:** `current_streak(uid)`; per-habit via `current_streak_for`.
