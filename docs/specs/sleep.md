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

---

## v2 — Night material (UI9 slice A, 2026-08-14)

> Status: BUILDING on `redesign`. Source of truth: the UI9 artifact, plate 14 +
> slice A. This is a **visual + one-behavior** pass. The run-logging machinery
> (the `run*` refs, `logRunIfQualified`, `beginSleepRun`/`markSleepAlive`/
> `clearSleepRun`, the focus-blur stop, the `subscribeAudio` sync, the crash
> reconcile) is **untouched** — the diff reads as styles around it.

### What changes

1. **The one material language arrives.** Sound-row icon wells become the shared
   `IconSlot` metal, recast in night steel — a new `tone="night"` on `IconSlot`
   (colors `nightSurface → night`, border `pillar.mindWash`). Default `tone`
   stays `"soul"`, so no other caller changes.
2. **Indigo is the accent of night.** The saffron on this screen (playing border,
   playing well tint, countdown text) becomes `pillar.mind` indigo. Gold still
   appears only at the reward. The playing row also gets a **breathing glow** —
   an indigo ring whose opacity pulses ~3.8 s per cycle (`PlayingGlow`, one
   Reanimated shared value, UI-thread), rendered only while playing **and**
   `useMotion()` is true.
3. **Auto-stop becomes a segmented dial.** The four timer `Chip`s become one
   segmented control (`SegmentedDial`): same `TIMERS = [15, 30, 60, 0]`, same
   `pickTimer`, tokens only (`nightSurface`/`nightLine` track, `pillar.mind`
   +`mindWash` for the active segment). Labels: the minutes as bare numbers,
   `0 → t("timer_off")`.
4. **Wind-down header.** Subtitle becomes `sleep_winddown` — "Wind down. Sounds
   stop themselves." The `sleep_needs_five` points-honesty line stays. A small
   `sleep_dim_hint` caption sits under the dial, shown only when `useMotion()`.
5. **Screen dims while playing.** `SleepDim` — a full-screen `scrim` overlay that
   fades in 30 s after playback starts (opacity only, UI-thread), showing the
   dim countdown; any tap wakes it and re-arms the 30 s timer. It clears the
   moment playback stops or the tab blurs (keyed on `playingId`). Gated on
   `useMotion()` (reduce-motion / web never auto-dim). It is an opacity fade,
   never a re-render.
6. **A gentler ending (the one sanctioned behavior change).** When the auto-stop
   timer completes, `finishTimer` fades the sound out over ~1.2 s
   (`fadeOutStop`, the same soft ending meditation has) instead of the hard
   `stopAudio`. Order is preserved: `logRunIfQualified(true, true)` runs first,
   then the fade — so the logging math never sees the difference. UI state
   (`playingId`/`secLeft`) is reset **synchronously** so the countdown interval
   tears down and the dim clears at once; `fadeOutStop` calls `stopAudio` itself
   when the ramp lands, and the existing `subscribeAudio` sync is a no-op by then.
   Manual stop (tapping the playing row) stays a hard stop — in scope only the
   timer-end softens.

### Files

- `src/ui/IconSlot.tsx` — add `tone?: "soul" | "night"` (default `"soul"`).
- `app/(tabs)/sleep.tsx` — restyle + `SegmentedDial` / `PlayingGlow` / `SleepDim`
  helpers; `finishTimer` fade; header copy. No change to any `run*` ref, callback,
  or effect other than `finishTimer`'s audio-exit call.
- `src/lib/i18n.tsx` — `sleep_winddown`, `sleep_dim_hint` (en + hi).

### Acceptance checklist

- [ ] Night ground, indigo (never saffron) accents; gold only at the reward.
- [ ] Playing row shows the breathing indigo ring on device; static indigo
      border on web/reduce-motion.
- [ ] Segmented dial picks 15/30/60/Off; `pickTimer` behavior identical
      (restarts countdown mid-play).
- [ ] After 30 s of play the screen dims; a tap wakes it and re-arms; stopping or
      leaving the tab clears it; reduce-motion never dims.
- [ ] Auto-stop fades the sound out; a run of ≥5 real minutes still logs exactly
      once with the same meta; manual stop still hard-stops.
- [ ] `typecheck` + `lint` + `build` green; reviewer confirms the run-logging
      machinery is byte-identical in behavior.
