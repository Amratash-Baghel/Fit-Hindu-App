# Spec — Meditation Session

> Status: CONFIRMED by owner 2026-07-12. Flow designed for "3 clicks and
> you're meditating."

## Purpose

A guided meditation flow where customisation is *visible but skippable*.
A first-time user can explore sounds and instructions; a regular can be
meditating in exactly three taps: **Start → Next → Start.**

## User flow (3 screens)

**Entry:** "Start Meditation / ध्यान शुरू करें" button (from meditation tab or
the home card).

1. **Sound selector** — on entry, the **default ॐ sound starts playing
   immediately** (instant feedback, nothing silent). A selector (chips/list)
   of sounds & chants — tapping one switches the preview live. Admin-uploaded
   library (see content-model spec). CTA: **Next**.
2. **Instructions + timer** — short avatar/video demonstration + written
   instructions (hi/en per language mode). Timer selector with presets
   (5 / 10 / **15 (default)** / 20 / 30 min). CTA: **Start**.
3. **Meditation screen** — minimal, dark, serene: a **chant visual** (e.g.
   the mantra/om pulsing softly), the selected sound looping, a **ticking
   countdown timer**. Screen stays awake. Pause / end-early available but
   understated. When the timer completes, a **gentle bell/alarm** rings and a
   completion moment shows (session logged: tick + streak credit).

Quick path: Start → Next (keeps ॐ) → Start (keeps 15 min) — meditating in 3
taps with sound already playing from tap 1.

## Rules

- Sound keeps playing across screens 1→3 (no restart between screens).
- Background audio must keep playing with screen locked.
- Completion logs to activity_log (ticks/streaks); partial sessions ≥3 min
  count as completed (be generous — retention over strictness).
- All sounds/chants are admin-uploaded content objects; nothing hardcoded.
  Deity-tagged chants surface by the user's chosen deity first.

## States

Loading (sound buffering → show selector immediately, buffer in background),
offline (previously downloaded/cached sounds playable; else message), error,
interrupted (call/alarm → auto-pause, resume prompt).

## Not doing (v1)

- No multi-day guided courses (that's the series/stories roadmap item).
- No breath detection, no haptic pacing.
- No social/shared sessions.

## Data

`sounds` (name hi/en, audio URL, type: chant/ambient/sleep, deity tag,
duration), `meditation_sessions` in `activity_log` (sound_id, duration_set,
duration_actual, completed_at IST).
