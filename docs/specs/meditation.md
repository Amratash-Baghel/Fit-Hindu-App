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

---

## v2 — A home for the mind (UI9 slice C, 2026-08-17)

> Status: BUILDING on `redesign`. Source of truth: the UI9 artifact, plates
> 11–12 + slice C. This slice **changes routes**, so it wants a full
> click-through. The session screen itself is untouched — its params contract
> (`sound`, `min`), its ≥3-minute generosity, the completion diya, the points
> delta and the `meditation` activity row all stay exactly as they are. Slice D
> is what opens up the session.
>
> The thesis: *a practice has a room of its own, with your seat still warm in
> it.* Today the Mind pillar — the one the whole redesign is named for — is a
> tab holding one glyph and one button, opening a three-screen corridor. It is
> the emptiest room in the house.

### What changes

1. **The tab becomes a hub.** One glyph + one button is replaced by: quick
   start, the practices as first-class rows, your week in Mind indigo, and a
   "How to sit" fold. This is the first screen where `pillar.mind` lives as the
   surface's own colour rather than a ring tint.
2. **Quick start — one tap, not three.** "Begin · 15 min · ॐ Chant", using the
   last setup remembered locally, straight into the session. New users see the
   same card on defaults. The old "3 clicks" promise is kept better by one.
   - The hub loads the published sound list (it needs it for the *name* anyway)
     and **starts the loop itself before navigating**, because the session
     screen has never started audio — `sounds.tsx` did, and the sound carried
     across unrestarted. That rule is preserved, the starting point just moves.
   - **Fallback chain:** saved sound still published → else the first published
     sound → else silent. A deleted or unpublished sound must never strand the
     one-tap path.
3. **Practices as rows.** Timer (today's flow → the new Start screen), Breath,
   Guided. **Breath and Guided both show "soon" in this slice** — Breath is
   plate 13 / slice D and Guided is a Chapter 3 content type. A row that routes
   nowhere would be worse than a row that says so; slice D flips Breath on by
   changing this row and nothing else on the hub.
4. **Your week.** Seven indigo bars of meditation minutes over the last 7 IST
   days, plus "N min this week · longest sit M min". Read with a new
   `fetchMeditationWeek()` beside the other progress reads: `activity_log`
   filtered to `meditation`, summed per `ist_date` on the device. No new table,
   no RPC, and RLS ("read own") is the boundary as always.
   - Hidden entirely for guests and for a week with nothing in it — the
     MirrorCard rule: never open a screen with a wall of zeros.
5. **Three screens become one.** `sounds.tsx` + `setup.tsx` retire into
   `app/meditation/start.tsx`: the sound list (live preview kept — the default
   chant still plays on arrival, tapping switches it, it carries into the
   session unrestarted) and the minute chips on one screen, then Begin.
6. **"How to meditate" stops being a toll.** The instructions card and the
   demo-video placeholder move into a collapsed fold on the hub — read when you
   want it, not on the way to every single session. It is a fold rather than a
   new route, so this slice still ends with one fewer file than it started.
7. **The setup is remembered.** `medPrefs.ts` writes `{soundId, minutes}` to
   AsyncStorage the moment a session starts, from both entry points (the
   `sleepRun.ts` pattern: best-effort, never blocking, failures forfeit only
   the memory). Today nothing is remembered and everyone re-picks 15 minutes
   forever.

### Deliberate deviation from the artifact

Slice C's bullet list puts a **bell-interval chip** on the Start screen, but the
interval bell itself is slice D (it fires inside the session). Shipping the chip
now would mean shipping a control that does nothing. It is therefore **not in
this slice** — slice D adds the chip together with the behavior, and `medPrefs`
gains its `mode`/`bell` fields at the same time.

### Published is not the same as playable

Found in review, and it shapes both entry points: a `provider = 'placeholder'`
sound is *published content whose audio has not been uploaded yet*, and
`audioSourceFor` was handing its stand-in URL (`https://example.com/...`) to the
player, which threw `NotSupportedError`. It now returns null for those rows, as
its own doc always claimed and as `sleep.tsx` already assumed.

So the fallback chain is over **playable** sounds, not merely published ones —
`resolvePlayable(rows, preferredId)`, shared by the hub and the Start screen.
Otherwise a placeholder at the top of the library would make quick start begin a
sit that names a sound and plays nothing, and "arriving is never silent" would
be quietly false. The Start screen also shows placeholder rows dimmed with a
"soon" tag and no tap target — the same treatment the sleep list already gives
them, rather than a dead row that answers a tap with silence.

The Start screen preselects the remembered sound too (not just the remembered
minutes), through that same chain.

### Files

- `app/(tabs)/meditation.tsx` — rebuilt as the hub.
- `src/lib/localAudio.ts` — placeholder rows resolve to null; `resolvePlayable`.
- `app/meditation/start.tsx` — new; the sound list + minutes + Begin.
- `app/meditation/sounds.tsx`, `app/meditation/setup.tsx` — deleted.
- `app/meditation/_layout.tsx` — header comment only (the flow is two screens
  now, not three); the flow-boundary `stopAudio` is unchanged and still correct.
- `src/lib/medPrefs.ts` — new; `getMedPrefs()` / `saveMedPrefs()`.
- `src/lib/progress.ts` — `fetchMeditationWeek()` + `MeditationWeek`.
- `src/lib/i18n.tsx` — hub + practice + week strings (en + hi); the strings the
  retired screens owned alone (`choose_sound`'s companions) are re-used or
  removed, never left orphaned.

### Edge cases

- **Quick start with no sounds at all** (empty library, or the query fails):
  the card still works and begins a silent sit. Silence is a first-class
  choice here, not an error state.
- **Guest**: everything works; the session logs nothing, as it already does.
  The week strip is hidden rather than empty.
- **Audio ownership**: the hub starts the loop and immediately pushes into the
  flow, so `_layout`'s focus-cleanup `stopAudio` still owns the ending. Leaving
  the session back to the hub stops the sound exactly as before.
- **The Start screen keeps preview-on-land** — arriving must never be silent.
- **A saved duration that is no longer a preset** still works: minutes are
  written and read as a number, and the chips highlight only on an exact match.

### Acceptance checklist

- [ ] Hub shows quick start, three practice rows, the week (when there is one),
      and the "How to sit" fold; no route dead-ends.
- [ ] Quick start goes tab → session in **one** tap, with sound already playing
      and the remembered minutes.
- [ ] A saved sound that has been unpublished falls back to the first published
      sound, then to silent — never a broken start.
- [ ] Start screen plays the default chant on arrival, switches live on tap, and
      carries the sound into the session without restarting it.
- [ ] Finishing a session still logs one `meditation` row with the same meta,
      still shows the diya + points, and ≥3 minutes still counts.
- [ ] Week strip reads real minutes per IST day; hidden for guests and for an
      empty week.
- [ ] `/meditation/sounds` and `/meditation/setup` no longer exist, and nothing
      links to them.
- [ ] `typecheck` + `lint` green; verified in the web preview; `/code-review`
      clean. No migration.
