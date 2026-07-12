# Spec — Workout Section (v1 build priority)

> Status: CONFIRMED by owner 2026-07-12. First feature to stand up.

## Purpose

The fitness core of the app. Exercise videos are demonstrated by the
**in-house custom avatar**. Three ways to work out; everything assembled from
reusable admin-authored exercise objects.

## The exercise object (the atom of this section)

Created and named in the admin panel; video uploaded there too (Bunny; DB
stores only the video id/URL). Fields:

- name (hi + en), slug
- avatar video (Bunny id), thumbnail
- **body areas** (chest, legs, back, shoulders, arms, core, full-body…)
- **modes** it belongs to (home / gym) — one exercise can be both
- level (beginner / intermediate / advanced)
- default sets / reps / duration / rest
- text instructions (hi + en), safety note

Plans, daily workouts, and custom sessions all reference these objects —
content is authored once and reused, never duplicated. (Same pattern as diet
templates: a customised plan places the specific exercise object into the
plan; edits to the object propagate.)

## Three workout modes

1. **Home** — no-equipment / desi bodyweight exercises (Surya Namaskar, dand
   baithak, plank…). Default for users who chose "home" in onboarding.
2. **Gym / regular** — equipment-based routines for gym-goers.
3. **Custom** — user picks a **body area** (chest, legs, back…) → sees the
   exercise library filtered to that area (+ their level & mode), and starts
   any exercise or strings a few into a session.

Mode is a filter over the same library + plan structure, not three codebases.

## User flow

- From Daily Home → "आज का व्यायाम" card → today's session (from their plan),
  OR workout tab → mode switcher (Home / Gym / Custom).
- **Session player:** avatar video hero (large card, top third) → exercise
  name (hi/en) → sets/reps/rest chips → up-next list → gold "Start" CTA.
  Auto-advance through exercises with rest countdowns; pause/skip allowed.
- **Completion:** big ✓ moment, session logged to activity (tick on home,
  streak credit — see tracking-streaks spec).
- Safety disclaimer (stop-if-pain) visible pre-session; shown on first-ever
  workout as an accepted dialog.

## States

Loading (video buffering on slow network — show thumbnail + spinner), offline
(clear message; retry), empty (no plan yet → route to questionnaire), error.
Mid-range Android + Jio data is the baseline.

## Not doing (v1)

- No rep counting / motion detection / camera anything.
- No user-uploaded videos. No live classes.
- No equipment inventory logic beyond the home/gym mode tags.

## Data

`exercises` (the object above), `workout_templates` (ordered exercise refs +
per-slot overrides), `plan_days` (template refs per day), `activity_log`
(completions). All program-scoped per the platform rule.
