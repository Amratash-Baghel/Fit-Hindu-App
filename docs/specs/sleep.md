# Spec — Sleep Sounds

> Status: CONFIRMED by owner 2026-07-16 (auto-stop timer included).
> Built 2026-07-16.

## Purpose

The night bookend of the daily habit: a calm, dark surface with a few looping
sounds to fall asleep to. Deliberately the smallest surface in the app — the
user is trying to stop looking at the phone.

## User flow

One screen:

1. **Night mood** — the one deliberate palette shift in the app
   (`color.night*`). Everything else stays black/saffron/gold.
2. **Timer chips** — 15 / 30 / 60 min, and Off. Chosen BEFORE or during play;
   changing it while playing restarts the countdown. Default: 30 min.
3. **Sound rows** — published `sounds` where `kind='sleep'`, deity-tagged ones
   labelled with the deity. Tap a row to play (looping); tap the playing row
   to stop.
4. **Now playing** — the active row shows a live remaining-time readout and a
   stop affordance.
5. **Auto-stop** — at 0 the audio stops and the row returns to rest. One
   `activity_log` row (`sleep_sound`) is written when a sound is started.

## Rules

- **Auto-stop is not optional infrastructure.** A looping sound with no timer
  runs all night and drains the battery; "Off" is an explicit user choice, not
  the default.
- Audio goes through the existing `src/lib/audio.ts` singleton (shared with
  meditation) so two surfaces can never play over each other.
- Placeholder-safe: `sounds.audio_media_id` is nullable (migration 0008). A
  row with no media is a **placeholder** — it renders greyed with a "Soon"
  badge and is not tappable. The screen must be honest that audio is missing
  rather than appear broken when a tap does nothing.
- Unreachable URLs fail silently (the audio layer's contract) — but the timer
  and UI state still behave, so the user is never stuck.
- All strings via i18n.

## States

- Loading: spinner.
- Empty (no published sleep sounds): quiet "coming soon" card.
- Error: retry CTA.
- Placeholder rows: greyed + "Soon" badge, not tappable.

## Not doing (v1)

- No background playback controls / lock-screen widget (the audio layer asks
  for background mode, but a notification control surface is out of scope).
- No mixing multiple sounds, no per-sound volume, no fade-out curve
  (auto-stop is a hard stop in v1).
- No alarm / wake-up side.

## Later

- Fade-out over the last 30s instead of a hard stop.
- Remember the last sound + timer choice (needs the local profile store).
- Lock-screen controls.

## Data

- Reads `sounds` where `status='published' and kind='sleep'`, joined to
  `media` for `playback_url` and to `deities` for the label.
- Writes `activity_log`: `activity_type='sleep_sound'`, `ref_id=sound_id`,
  `meta={minutes}`.
