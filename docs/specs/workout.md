# Spec — Workout Section (v2, reference-app model)

> Status: v2 CONFIRMED 2026-07-15 after owner tried the reference apps.
> Model: **Fitness & Bodybuilding (VGFIT/Softin)** for structure ("our final
> implementation should be similar"), **Home Workout (Leap Fitness)** for the
> guided execution flow, **Lifty** for builder simplicity. v1 (browse +
> detail) shipped 2026-07-13; v2 adds the session player, My Workouts, and
> the session journal.

## Purpose

The fitness core of the app. Exercise videos are demonstrated by the
**in-house custom avatar**. Everything is assembled from reusable
admin-authored exercise objects; users can additionally compose their own
routines (My Workouts) from the same library.

## The exercise object (unchanged from v1)

Created and named in the admin panel; video uploaded there (Bunny; DB stores
refs). Fields: name (hi+en), slug, avatar video + thumbnail, **body areas**
(the muscle-group organization, F&B-style), **modes** (home/gym), level,
default sets/reps/duration/rest, instructions (hi+en), safety note.
Plans, composed workouts, and user workouts all REFERENCE these objects.

## Structure (what the user browses)

1. **Workouts (composed templates)** — admin-built via Compose; surfaced
   first on Home/Gym modes. ≙ F&B pre-set routines.
2. **Exercise library** — tile grid; filterable by mode; **Custom mode =
   pick a body area → filtered library** (F&B muscle-group browsing).
3. **My Workouts** — user-built routines from the library (F&B "add your own
   workout"): name + ordered exercises + per-item overrides. Own-row data;
   requires auth (pre-auth: placeholder card). Ordering must be reliable —
   positions rewritten 1..n on save (the reference app's ordering is
   notoriously buggy; ours is not).
4. **Programs by goal** (existing schema; assigned via questionnaire) — the
   F&B "plans by goal" ≙ our programs/program_days; surfaced on the home
   screen as "today's workout" once auth + plan assignment ship.

## Execution — the guided session player (the heart of v2)

Entry points: template detail "Start workout", a My Workout's "Start", or a
single exercise's "Start" (session of one). One player for all three.

**State machine:**

```
[Exercise · Set k/N] --set done--> [Rest] --countdown 0/skip--> next set
                                     |                     (or next exercise)
                              (last set of last exercise)
                                     v
                               [Complete]
```

1. **Exercise screen** — avatar video/AvatarTile hero; name (hi/en); set
   progress "Set 2/3"; the target: **reps** ("×12" — user taps the gold
   button when done) or **timed hold** (countdown auto-runs, e.g. plank 30s);
   optional **weight input (kg)** per set for gym-mode exercises (F&B
   journal); instructions one tap away; pause/exit understated.
2. **Rest screen** (Leap pattern) — between sets and between exercises:
   big countdown from the item's effective rest_seconds, **+20s** extend,
   **Skip**, and a "Next up" preview (next exercise name + set x/y).
3. **Auto-advance** through the ordered items. Effective values everywhere =
   per-item override ?? exercise default.
4. **Completion screen** — diya moment + session stats (exercises, sets,
   minutes) → one `activity_log` row: type `workout`, meta
   `{source: template|user_workout|single, ref_id, minutes,
   sets: [{exercise_id, set_no, reps?, seconds?, weight_kg?}]}` — the
   F&B-style journal lives in this meta; history/graphs read it later.
5. Screen keep-awake during the session; leaving mid-session ≥50% of items
   done still logs (generosity, consistent with meditation's ≥3-min rule).

## States

Loading (buffering video → thumbnail + spinner), offline (message + retry),
empty template (route back), error. Mid-range Android baseline. Timed sets
keep counting if the video fails — video is presentation, not the clock.

## Not doing (v2)

- No rep counting via camera/motion. No voice coach yet (later: audio cues).
- No user-uploaded exercise videos/photos (admin content only — differs from
  F&B deliberately; content quality is a brand asset).
- No history graphs UI yet (the journal data model is complete in
  activity_log meta; profile graphs are a later cycle).
- No paid gating of routines (reference apps paywall aggressively; we don't).

## Data

v1 tables unchanged. **Migration 0009**: `user_workouts` (id, user_id, name,
created_at) + `user_workout_items` (workout_id, position, exercise_id, sets,
reps, duration_seconds, rest_seconds; PK (workout_id, position)) — own-row
RLS. Session journal = `activity_log.meta` (no new table).
