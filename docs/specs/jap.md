# Spec — Mantra Jap

> Status: DRAFT — written 2026-07-15, awaiting owner confirmation.
> Scope decision (owner, 2026-07-15): the tab ships now as a **content-driven
> surface with 2–3 placeholder items**. Publishing a row in the admin panel
> fills it; no code change, no release.

## Purpose

Per-deity mantra repetition — the devotional heart of the app. A user opens
the tab, sees their deity's mantra, and chants along with a counted mala.

This is core worship: **never gated, never paywalled** (standing rule).

## User flow

**Tab → mantra list → jap session.**

1. **Mantra list** — published `mantras`, joined to their deity. The user's
   chosen deity (`profiles.deity_id`, onboarding Q9) sorts first; everything
   else follows. A mantra shows its Devanagari text and, per language mode,
   its transliteration/meaning.
2. **Jap session** — the mantra held large and legible, an optional looping
   chant audio (`sounds.kind = 'jap_loop'`, deity-tagged first), and a **mala
   counter**: tap to count, 108 completes a mala. Screen stays awake. The
   count is the whole interaction — nothing else competes with it.
3. **Completion** — at 108 a gentle moment (🪔), session logged.

## Rules

- Content-driven end to end: mantras, chant audio, and deities are all admin
  authored. Nothing about a specific deity is hardcoded (platform standing
  rule) — the tab renders whatever is published.
- A mantra with no `chant_audio_media_id` is a **placeholder**: it renders and
  counts silently rather than hiding. Publishing discipline (draft/published)
  is the gate, not the presence of media — same posture as `exercises` and
  `sounds` (migration 0008).
- Completion logs `activity_type = 'jap'` to `activity_log` (the enum member
  already exists, 0001:18) with `{ mantra_id, count, malas }` in meta.
- Audio uses the singleton player (`src/lib/audio.ts`) so a chant survives
  navigation, and keeps playing with the screen locked.
- All UI strings through i18n; the mantra text itself is Devanagari and is
  **never translated** — transliteration/meaning are the localised parts.

## States

- **Empty (nothing published)** — the honest state, and the expected one at
  launch: a calm "coming soon" card, not an error. This is what ships until
  the content team publishes.
- Loading: skeleton list. Error: retry CTA.
- No chosen deity (skipped Q9): plain published order, no personalisation.

## Not doing (v1)

- No jap goals/targets, reminders, or multi-day jap sankalp.
- No voice detection or automatic counting.
- No sharing/leaderboards.

## Data

`mantras` (deity_id, text_devanagari, transliteration, meaning_hi/en,
chant_audio_media_id, status) joined to `deities`; `sounds` where
`kind = 'jap_loop'`; `activity_log` for completions. No schema change needed —
all of it exists as of migration 0003.
