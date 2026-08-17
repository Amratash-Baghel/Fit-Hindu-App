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

---

## v3 — Re-stacked (UI9 slice B, 2026-08-17)

> Status: BUILDING on `redesign`. Source of truth: the UI9 artifact, plates
> 09–10 + slice B. A **structure** pass on the browse tab only. The session
> player (`app/workout/session.tsx`), the three detail routes, and the content
> queries are untouched — "the session player is already the strong half".
>
> The thesis: *a gym has a front desk, not a card catalogue at the door.* Today
> the tab stacks mode chips → template rows → My Workouts → a permanently-open
> two-figure muscle picker → the grid, all in one scroll. The person opening
> this tab wants to **train, now**. The re-stack puts action first and folds
> browsing beneath it.

### What changes

1. **Mode moves into the header, and Custom retires.** The three `Chip`s become
   a two-way Home/Gym toggle on the title row. `Custom` was never a third
   place — it was the same library with a filter — and the muscle filter now
   lives in *every* mode, so the third chip goes. Its create-flow role passes to
   "+ New workout" on the shelf.
   - Consequence: area filtering is now always **within the current mode**,
     using the client-side `body_areas` path `home`/`gym` already use. The
     server-side `listExercisesByArea` union query is no longer called.
     Empty selection = full body = no filter — the semantics already in
     `workout.tsx`. **The fold changes geometry, not logic.**
2. **A resume strip, when a session is open.** `src/lib/session.ts` already
   mirrors the session in progress to AsyncStorage for crash recovery, and that
   mirror has no surface. A new `getInterruptedSession()` reads it; when it
   returns a session the screen shows a saffron-edged strip above everything
   else that routes back into `/workout/session` with the saved source.
   **Honesty about what this covers** (the artifact's "crash-safe mirror" line
   overstates it): `reconcile()` runs at app launch and closes out + clears any
   unfinished mirror, so after an app kill there is nothing to resume — by
   design, the training was already banked. The strip therefore covers the
   common live case: *the user left the player mid-workout and the app is still
   running*. That is the case it must handle, and the copy says "Continue", not
   "recovered".
3. **Today's workout hero.** The first template of the current mode, in the
   `EmberCard` material with the one gold `Start`, deep-linking straight to the
   player. Ordering is whatever the content team publishes (slice E adds the
   `sort` column that makes the hero pickable without a release — until then it
   is `name_en` order, and this slice adds no query change).
   - **Done state:** once today's log holds a workout, the hero flips to a quiet
     "done ✓" and drops its gold action, reading `todayTypes` from the existing
     `usePillars()` context — the same day-status Home's rings compute, no new
     fetch. The shelf then leads.
4. **Templates + My Workouts become one horizontal shelf.** `ShelfCard`s
   (`IconSlot` + name + `minutes · exercises · level`) replace the two stacked
   text-row sections: the mode's remaining templates, then the user's own
   workouts, then a "+ New workout" card. Signed out, the shelf ends with the
   same *offering* (not blocking) sign-in card the stacked section had.
5. **The muscle picker folds.** `BodyModel` is the best moment on the screen and
   a toll-booth every time after the first. It stays, unchanged, but moves
   behind a "Filter by muscle" row that shows the selected areas as chips when
   closed and opens the figures + chips on tap.
6. **Search.** A `TextField` above the grid filters the already-loaded list
   client-side on `name_hi` + `name_en` (case-insensitive, trimmed) — for the
   person who already knows the exercise's name. No query, no schema change.

### The one machinery change, and why

Re-entering the player calls `startSession()`, which writes a **new** mirror
over the old one. Today that orphans the previous session: its server row stays
`status = 'active'` forever (nothing will ever close it — `reconcile` reads the
mirror that was just overwritten), and since every progress aggregate filters
`status = 'completed'`, its sets become training that is on the server and
invisible. That is precisely the data loss `session.ts` exists to prevent, and
the resume strip turns this rare path into a **one-tap invitation**.

So `startSession()` closes out any existing unfinished mirror before writing its
own, using `reconcile`'s existing rules extracted verbatim into a shared
`closeOutLocal()`: sets logged → `completed`, none → `abandoned`; the
`activity_log` row only when the session began today in IST. `reconcile()` then
calls the same helper, so there is **one** set of close-out rules, not two.

This is a deliberate deviation from the artifact's "add a getter, no write
changes" guard — spelled out here so review checks it on purpose rather than
finding it. Nothing else in the module moves.

One ordering guard comes with it: `getInterruptedSession()` awaits the in-flight
`reconcile()` before reading. Child effects run before the root layout's, so a
deep link straight into the workout tab could otherwise read the mirror in the
same tick launch clean-up is clearing it — and a strip for an already-banked
session is one tap from making the user redo it. `reconcile()` therefore keeps
its promise in a module-level `reconciling`; the reader awaits it when set.

### Files

- `app/(tabs)/workout.tsx` — the re-stack (header toggle, resume strip, hero,
  shelf, folded filter, search, grid).
- `src/lib/session.ts` — `getInterruptedSession()` (read-only) + `closeOutLocal()`
  shared by `startSession` and `reconcile`.
- `src/ui/ShelfCard.tsx` — new, assembled from `Card` + `IconSlot`; exported
  from `src/ui/index.ts`.
- `src/lib/i18n.tsx` — `workout_today`, `workout_done_today`, `resume_workout`,
  `resume_generic`, `sets_logged`, `search_exercises`, `filter_muscle`,
  `new_workout_sub`, `time_ago_h`, `time_ago_m` (en + hi).

### Edge cases

- **Name resolution for the strip.** The mirror stores `source_ref_id`, not a
  name. Resolve it against the already-loaded templates / user workouts /
  exercises; when it is not in the current mode's lists (started in the other
  mode, or since unpublished), fall back to a generic "Workout in progress".
  Never fetch just to label the strip.
- **Guests.** `startSession` returns null before writing anything for a signed-
  out user, so the mirror never exists and the strip never appears. The
  My-Workouts sign-in offer is unchanged.
- **Empty mode.** No templates → no hero, shelf shows only My Workouts + "+ New".
  No exercises → the existing `workout_empty` state, now below the filter row.
- **Search + muscle filter compose** (AND, both client-side). A search that
  matches nothing shows the empty state, not a blank scroll.
- **Deep links unchanged**: `/workout/[id]`, `/workout/template/[id]`,
  `/workout/my/[id]`, `/workout/my/new`, `/workout/session`.
- `listExercisesByArea` loses its last caller with Custom's retirement. It stays
  in `content.ts` as the by-area content API (the programs-by-goal path and
  admin work will want it) — noted here so review reads it as intent, not an
  oversight.

### Acceptance checklist

- [ ] Header carries the Home/Gym toggle; no Custom chip anywhere; switching
      mode re-queries exactly as before.
- [ ] Resume strip appears after leaving the player mid-session and routes back
      into the same workout; it disappears once that session is finished; it
      never appears for a guest.
- [ ] Re-entering the player after leaving one open leaves **no** session row
      stuck at `active` — the previous one closes out (`completed` with sets,
      `abandoned` without) with at most one `activity_log` row per session.
- [ ] Today's hero shows the mode's first template with a gold Start; after a
      workout is logged today it reads "done ✓" with no gold action.
- [ ] Shelf scrolls horizontally: templates → my workouts → "+ New workout".
- [ ] Filter row is closed by default, shows selected areas as chips, and opens
      `BodyModel` unchanged; empty selection = full body.
- [ ] Search narrows the grid on Hindi and English names and composes with the
      muscle filter.
- [ ] `typecheck` + `lint` + `build` green; verified in the web preview;
      `/code-review` clean.
- [ ] No migration in this slice.
