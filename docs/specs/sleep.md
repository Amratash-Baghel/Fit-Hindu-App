# Spec — Sleep Sounds

> Status: DRAFT — written 2026-07-15, awaiting owner confirmation.
> Scope decision (owner, 2026-07-15): ships now as a **content-driven surface
> with 2–3 placeholder items**. Publishing a row in the admin panel fills it.

## Purpose

The last touch of the day: a calm sound to fall asleep to. Cheap to build,
strong for the daily-habit loop — it puts the app in the user's hand at night
as well as morning.

## User flow

**Tab → pick a sound → it plays with a timer.**

1. **Sound list** — published `sounds` where `kind = 'sleep'`. Night mood
   (`Screen night`, the indigo palette) — this is the one section that leaves
   the black/saffron ground, per the approved design.
2. **Playing** — the sound loops, with a **sleep timer** (15 / 30 / 60 min /
   until stopped; 30 default). Minimal, dim, thumb-reachable: someone is
   already lying down in the dark.
3. **Auto-stop** — audio fades and stops at the timer; the session logs.

## Rules

- Content-driven: sounds are admin-uploaded objects (content-model spec).
  Nothing hardcoded.
- A sound with no `audio_media_id` is a placeholder and renders without
  playing (migration 0008 made that column nullable for exactly this).
- Background playback is required — the screen will lock. `expo-audio` already
  runs with `shouldPlayInBackground: true` (`src/lib/audio.ts:19`).
- Screen does **not** stay awake here (opposite of meditation/workout): the
  point is to let the phone go dark.
- Completion logs `activity_type = 'sleep_sound'` (enum member exists, 0001:18)
  with `{ sound_id, minutes }` in meta.
- Uses the same singleton player as meditation — one audio owner in the app.

## States

- **Empty (nothing published)** — calm "coming soon" card. The launch state.
- Loading / error: consistent with the meditation flow.
- Interrupted (call/alarm): auto-pause, no resume prompt (they're asleep).

## Not doing (v1)

- No sleep tracking, alarms, or wake-up detection — that is a different product
  and a Play health-claims risk.
- No mixing multiple sounds, no per-sound volume.
- No offline download (roadmap, with meditation).

## Data

`sounds` where `kind = 'sleep'` joined to `media`; `activity_log` for sessions.
No schema change needed — all of it exists as of migration 0003 + 0008.
