# Spec — Tracking, Streaks & Profile

> Status: CONFIRMED by owner 2026-07-12. "Everything recorded and targeted."
> This is the retention engine; every other feature writes into it.

## Purpose

Record every completed activity, reflect it back instantly (ticks, streaks),
and let the profile grow more personal with use. Points, rewards, and social
come later but read from this same log — get the log right in v1.

## The activity log (the spine)

One append-only table every feature writes to:
`activity_log(user_id, type, ref_id, occurred_at, meta)` where type ∈
workout / meal / meditation / jap / sleep_sound / devotional. Day boundaries
in **Asia/Kolkata** (standing rule).

## v1 surfaces

1. **Today ticks (home screen)** — each daily card (exercise, meal,
   meditation, sleep) shows a **✓ done** state the moment its activity logs.
   Partial diet days: tick per meal, card ticks when all logged.
2. **Daily streak** — a day counts if ≥1 core activity logged. Streak framed
   as **संकल्प** ("21-din sankalp"), counted in diyas per the design. One
   forgiveness/freeze day per week (protect the habit, avoid rage-quit).
3. **Per-habit streaks** — fitness streak, meditation streak, jap streak
   shown in profile (computed from the log, not stored counters).
4. **Profile** — name, chosen deity, language mode, plan; **history**: past
   activity by day (calendar dots), personal bests (longest streak, total
   malas, minutes meditated). The longer you use it, the more it shows.
5. **Push reminders** — ritual-framed ("ध्यान का समय"), tied to incomplete
   ticks; quiet hours respected.

## Analytics

Every log event mirrors to PostHog (non-negotiable before testing — schedule
rule). Event names versioned; no health data in event properties beyond what
consent covers.

## Roadmap (schema-ready NOW, built later)

- **Points** — *fitness points / bhakti points* per completed activity.
  Computed from activity_log (a points ledger view), so switching it on later
  requires zero backfill.
- **Milestone rewards** — e.g. Bajrangvati discount at streak milestones.
  Touches monetization (deferred) — design the milestone check, park the
  reward fulfilment.
- **Friends & leaderboard** — friend graph + activity visibility + ranking.
  Needs privacy controls (activity sharing is opt-in) and moderation
  thinking; the log already has everything a leaderboard needs.

## Not doing (v1)

- No points UI, no rewards, no friends/leaderboard (schema-ready only).
- No weight/body-measurement tracking (avoids health-data escalation in v1).
- No streak-loss guilt mechanics (no "you lost everything!" — gentle recovery
  framing only).

## Data

`activity_log` (above), `streaks` (materialised daily job or computed),
profile fields on `profiles`. RLS: users read/write own rows only.
