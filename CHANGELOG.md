# Changelog

Notable user-facing and structural changes, newest on top. Engineering detail
lives in `docs/progress.md`; dated decisions in `docs/decisions.md`.

## 2026-08-01 — Regression fixes + polish (B1–B7)

### Restored (were never merged into this branch)
- **Jap counter** — the 108-bead mala counter with deity chips and the glowing
  ॐ tap button, counting down to a completed mala.
- **Sleep module** — auto-stop timers (15/30/60 min or off), a live countdown,
  and tappable, looping sleep sounds (no more dead list).
- **Diet** — the diet tab is back: the AI custom-plan questionnaire (n8n) plus
  the admin-authored template list; the home "Today's diet" card opens it.

### Added
- **Two bundled audio tracks** — a low Om chant (in both meditation and sleep)
  and a sleep flute, shipped in-app for offline, instant playback.
- **Haptics + sound cues** — a light tick per jap count and a distinct cue at
  mala completion (108); a gentle bell at the end of a meditation; selection
  taps. All respect the Settings haptics/sound toggles.
- **8 more mantras** — for Shiv, Ram, Krishna and Hanuman (pending team review
  of the Sanskrit before production; see `docs/mantra-review.md`).

### Changed
- **Onboarding** — reworked to one large-card question per screen; picking an
  answer advances automatically. Faster (target under 90 seconds). The deity
  question was removed (it never affected your plan); deity stays in the
  devotional content itself.
- **Ceremony animations** — the plan-ready loader no longer stalls at 80%, and
  the launch splash settles more gracefully (no bounce, no mid-sequence
  pile-up, no shimmer flash).

### Fixed
- **Cut-off numbers** (jap counter, meditation timer) — clipped on Android at
  large glyph sizes and at bigger accessibility font scales.
- **ॐ glow** on the meditation screen rendering as a hard-edged box.
- **Diya cut off** on the "your plan is ready" screen (was an emoji; now the
  app's own diya, consistent across all Android phones).

### Migrations (owner must run in Supabase)
- `0015` diet plan requests + profile fields · `0016` launch audio ·
  `0017` drop profiles.deity_id · `0018` new mantras (after review).
