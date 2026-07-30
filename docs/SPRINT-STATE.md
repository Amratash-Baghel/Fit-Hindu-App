# Sprint State — Feature Sprint

> **Read this second, after `CLAUDE.md`, at the start of every session.**
> This sprint runs across multiple sessions on two machines with two Claude Code
> identities. Sessions cannot be resumed across devices — every device switch is
> a cold start. This file must always reflect reality **as of the last commit**,
> not as of the last thing that happened in a chat window.
>
> Contract: `docs/specs/feature-sprint.md`. Source prompt: `prompts/feature-sprint.md`.

**Last updated:** 2026-07-30 · slice 7 in progress.
**Migrations 0013 AND 0014 are written and validated but NOT yet applied in Supabase.**

---

## Slice 7 — push (in progress)

- ✅ **7a** migration 0014 (`push_sends` ledger, `push_audience()`,
  `push_claim()`, prefs row for every user) + 25 new schema checks.
  **76/76 PGlite green** (was 51). ⚠️ **NOT applied in Supabase.**
- ⬜ 7b expo-notifications install + app.json
- ⬜ 7c client push service + prefs
- ⬜ 7d Settings section + i18n
- ⬜ 7e `supabase/functions/send-push/`
- ⬜ 7f verify, review, docs, commit

---

## Where we are

**Slice 6 — workout tracking + progress bars. Built, reviewed, verified.**

⚠️ **USER MUST RUN migration 0013 in Supabase.** The Progress screen and the
plan / body-area bars read three RPCs that do not exist in the database yet.
Until it runs, those reads error and the screen falls back to its empty state.
Everything else in the slice (session tracking, the in-session bar) works
without it.

Four commits: `34df88b` migration 0013, `bc1e61c` the session write path,
`1296731` the player rewrite + ProgressBar, and the progress screen + reviewer
fixes.

The core change: the player held every set in a `useRef` and wrote one
`activity_log` row at the very end, so an app kill at set 9 of 10 lost the lot.
`src/lib/session.ts` is now local-first — AsyncStorage mirror → durable queue →
try to send — and the database owns dedup, so every replay is
`on conflict do nothing` and the queue never has to reason about what landed.
`reconcile()` at launch closes out a session the user was killed out of:
completed if any set was logged, abandoned if none.

Migration 0013 adds `progress_summary`, `body_area_progress`, `plan_progress` —
all `stable`, none `security definer`, so RLS applies. **PGlite 51/51 green**
(was 34). The harness also had a latent ordering bug (a `!startsWith("0012")`
filter would apply 0013+ *before* 0012); fixed.

Progress screen sits behind the Home sankalp card — not a sixth tab, five is
full and Hindi labels are wide at 360dp. Empty states are load-bearing: a guest
sees why there is nothing plus a sign-in; a new signed-in user sees an
invitation. Neither ever sees a wall of zeros.

**Lint is now 2 errors, down from the 11-error baseline** — all 9 in
`session.tsx` were cleared by the rewrite. The remaining 2 (`(tabs)/workout.tsx`,
`workout/template/[id].tsx`) are setState-in-effect in screens this slice does
not otherwise touch; fixing them needs a UX call on loading states, so they were
left rather than done as a drive-by.

**The reviewer caught four real data-loss bugs**, all fixed before commit:
1. `finishSession` marked the mirror finished *before* enqueueing the finish op.
   A kill in that window left `finished: true` with nothing queued → reconcile
   skipped it forever → the row stayed `active` → every already-flushed set was
   excluded from all progress aggregates.
2. The streak's `activity_log` row bypassed the queue (a direct write, no
   retry), so an offline finish recorded the session and its sets but silently
   lost the row the streak reads. Now queued, with `client_event_id` so a retry
   can't double-credit a day in an append-only table.
3. `enqueue`/mirror updates were unsynchronised read-modify-write — two
   overlapping taps and the second clobbered the first.
4. One permanently-failing op wedged the entire FIFO, stalling every future
   workout.

Plus: set-write batching (the spec's own 2G mitigation), a `finishSet`
double-tap guard, and a side effect removed from inside a `setState` updater
that StrictMode would have double-fired on every timed set.

Verified in preview: session player against seeded data (14 sets across 5
exercises, countdown ticking once per second, a timed set completing exactly
once, 0/14 → 1/14 → Rest), ProgressBar at 0 / half / full / overflow-clamped /
max-0 and both tones, a 30-day strip with today rightmost and gaps filled, the
guest progress state, and Home → Progress navigation. Zero console errors.

**Physical-device / real-session only:** the offline queue actually draining on
reconnect, reconcile after a real app kill, the RPCs returning real numbers
(needs 0013 applied plus a signed-in user with history), and haptics.

---

## Slice 5 (previous)

**Plan-ready ceremony. Built, reviewed, verified.**

The guest→user bridge (`flushOnboarding`) was running invisibly inside
`app/auth/verify.tsx` behind a disabled button, and its one interesting outcome —
no assignment rule matched, `plan.ts` returns null — was indistinguishable from
success, dropping the user into the tabs with no plan and no explanation. That
write now belongs to a real screen.

New `src/ui/CeremonyLoader.tsx`: full-screen, parameterised on stage labels +
status + outcome copy, reusing the slice 3 artwork (field, ogee arch, gada) so
the two ceremonies read as one product. Deliberately generic — workout-plan
generation is meant to be its second caller with no change to the file. New
`app/plan/ready.tsx` drives it.

**Staged progress is real.** The four stages map 1:1 onto the four awaits in
`flushOnboarding`; `FLUSH_STAGES` lives beside them in `src/lib/auth.tsx` so
labels can't drift from the work. The bar fills to `(stage+1)/(stages+1)` — 0.8
with four stages — and only a terminal status reaches 1, so the last stage cannot
claim completion before the data lands. Errors hide the bar rather than showing a
full gold one under a failure headline. `flushOnboarding` now returns a
`FlushOutcome` and no longer fires its own chirp (the ceremony owns that moment).

Three outcomes, no dead screens: assigned → celebrate; no-plan → its own honest
screen; failure → retry, answers still on disk. Back blocked for the whole route
(`gestureEnabled: false` + Android hardware back). Cold start resumes an
interrupted flush via a new `isFlushPending()`.

**Four bugs caught before commit** — two by verifying in the preview instead of
assuming, two by the reviewer:
1. The art composition never rendered — `onLayout` never delivered a box, so the
   arch and gada were absent entirely. Replaced measure-then-render with flexbox
   `aspectRatio` (no measurement pass, nothing can pin it at zero).
2. Both animations sat frozen: they were gated on
   `AccessibilityInfo.isReduceMotionEnabled()`, which never settles under RNW.
   The bar would have hung at zero while the writes ran fine. Now defaults to
   "animate" and downgrades when the query answers.
3. Cold-start resume could replay an already-completed flush and write a
   duplicate `questionnaire_responses` row (append-only, no unique key). Fixed by
   gating on the onboarded marker, not just the answers.
4. Retry had no reentrancy guard — a double-tap could fire two concurrent
   flushes. Added an in-flight ref.

Also added a `progressBar` token (slice 6 needs three progress bars).

Typecheck green; lint at the 11-error baseline (new files add zero). Verified in
web preview: all four stages (bar 0.2 → 0.4 → 0.6 → 0.8 with correct labels, and
it stops at 0.8), all four states, mixed-language mode, the no-answers redirect,
zero console errors.

**Physical-device only:** the motion itself. An isolated probe established that
Reanimated does not animate under react-native-web in this setup at all — the web
preview verifies layout, copy and state, never motion. Also untested from here:
the real Supabase round-trip through all four stages, and the haptic/chirp on
outcome.

Slice 5's deferred item is now much cheaper — see "Next up" at the top of this
file.

## Next up (read this first on a cold start)

**0 · DO THIS FIRST: merge `origin/main` into this branch.** Before any new
feature work. The branch is 14 ahead / 3 behind and main has moved with the diet
section (incl. the owner-approved AI custom-plan), admin Meals/Mantras, the Bunny
video-upload fix, and the legal package — 49 files.

    git fetch origin && git merge origin/main

**Nine files are touched on both sides.** The two onboarding ones are the real
work; the rest are mostly append-vs-append:

| File | Collision |
|---|---|
| `app/onboarding/index.tsx` | main edited the questionnaire; this branch rewrote it as v2 |
| `app/(tabs)/index.tsx` | main added a diet card; this branch added StreakCard + the `/progress` link |
| `src/lib/onboarding.ts`, `src/lib/i18n.tsx`, `src/types/db.ts`, `src/ui/index.ts` | both sides appended |
| `docs/decisions.md`, `docs/progress.md` | **guaranteed conflict** — both prepend new entries at the top |
| `docs/specs/onboarding-questionnaire.md` | both edited |

`CLAUDE.md` is NOT among them — this branch never touched it, so main's
owner override on AI diet plans (2026-07-16) survives the merge untouched. Do
not resurrect the older no-AI wording from anything on this branch.

After merging, check the tab bar at 360dp: main added a **sixth tab**
(`app/(tabs)/diet.tsx` + `_layout.tsx`). Slice 6 deliberately put Progress on a
stack route because five tabs already crowded Hindi labels — that still holds,
but the crowding is now real rather than hypothetical.

It only gets worse the longer this branch runs. Do not start it right before a
device switch — it is exactly the kind of multi-file work that must not be left
half-done.

**1 · Owner actions, both blocking.** Run migration **0013**. Upload the **FCM v1
service-account JSON** to EAS and confirm a **dev build is installed on a
physical Android device** — slice 7 cannot start or be tested without both.

**2 · Recommended engineering: the guest-merge slice.** It is no longer a whole
slice, and this is the single most valuable thing left that is not blocked.

The problem is unchanged and it undercuts everything shipped: onboarding is
deliberately guest-first with skippable sign-in, but `activity.ts` and
`startSession` both no-op without a user. The **default** new user completes a
workout and banks nothing — no streak, no session, no progress. The retention
engine does not run for the audience it was built for. (Recorded as an owner
decision 2026-07-28; flagged in the Phase 1 audit as the blocker the sprint
prompt did not anticipate.)

What changed in slice 6: the machinery now exists. The queue already holds ops
when there is no user, stamps `user_id` at **send** time rather than enqueue time
(`src/lib/session.ts:276`), flushes on sign-in (`src/lib/auth.tsx`
`onAuthStateChange`), and dedupes via `client_event_id` / the exercise_logs PK.
That IS the guest-merge design. The only thing blocking it is one line:

    src/lib/session.ts:342   if (!user) return null;

So the work is: let guests open a local session, require auth only at flush, and
give `activity.ts` the same treatment so meditation and jap bank too.

**Settle before building:** a guest who never signs in grows the queue without
limit. It needs a cap or a TTL — decide which rather than letting storage grow
unbounded.

**3 · Also open:** 2 lint errors remain (`(tabs)/workout.tsx`,
`workout/template/[id].tsx`) — setState-in-effect; fixing them needs a UX call on
whether a tab switch flashes a spinner or shows stale content. And the
physical-device verification backlog listed under each slice above.

## Session start checklist

1. `git pull`
2. Read `CLAUDE.md`, then this file
3. `git log --oneline -10`
4. State back to owner: which slice, what is done, what is next. **Do not start
   work until they confirm.**

## Slice board

| # | Slice | Status | Notes |
|---|---|---|---|
| 0 | Audit + spec | ✅ done | Spec approved 2026-07-28 |
| 1 | Migrations 0011 + 0012 | ✅ applied | 34/34 PGlite checks. Owner ran both in Supabase. |
| 1b | Settings screen | ✅ done | Verified in web preview. Language/Account/About. |
| 2 | Feedback service | ✅ done | expo-haptics; Toggle; wired call sites; reviewed. |
| 3 | Splash | ✅ done | reanimated+worklets+babel; ceremony palette; arch + gada SVG; reviewed. |
| 4 | Streak | ✅ done | `useStreak()` + live `StreakCard`; 34/34 tests; reviewed. Guest local streak deferred. |
| 5 | Plan-ready ceremony | ✅ done | `CeremonyLoader` + `/plan/ready`; real staged awaits; 3 outcomes; reviewed. |
| 6 | Workout tracking + progress | ✅ done | Local-first session queue; 3 bars; Progress screen. **0013 NOT applied.** 51/51 PGlite. |
| 7 | Push end-to-end | ⬜ next | Blocked on FCM credentials + a dev build on a physical device |

Ordering rationale: schema first because four slices depend on it. Slices 1 and
4 must not be interrupted — start them on a fresh quota window. Slices 3 and 5
are the safest to cut off: iterative, visual, and they lose nothing on a cold
restart.

## Dependencies

- `expo-haptics` ~57.0.1 — **installed** (slice 2).
- `react-native-reanimated` ~4.5.1 + `react-native-worklets` 0.10.2 —
  **installed + declared** (slice 3). Needs `babel.config.js` (added) +
  New Architecture (Expo SDK 57 default). Reanimated 4 required the worklets
  peer + its babel plugin.
- `expo-notifications` — approved, install in slice 7.

Install at the slice that needs each, not up front.

## Migration ledger

| Migration | Written | **Applied in Supabase** |
|---|---|---|
| 0001-0010 | ✅ | ✅ (per `docs/progress.md`) |
| 0011 sessions + push | ✅ | ✅ (owner ran 2026-07-28) |
| 0012 activity_log + streak | ✅ | ✅ (owner ran 2026-07-28) |
| 0013 progress aggregates | ✅ | ❌ **NOT APPLIED — owner must run** |

**Never assume a migration has been applied.** Never leave one partially
applied — either it runs clean and is committed, or it is not started.

Re-run the schema checks any time with:
`node supabase/tests/validate.mjs`
(51 checks. PGlite is not a package.json dependency by design — install it for
the run with `npm install --no-save @electric-sql/pglite`, which leaves
package.json and the lockfile untouched. The previously documented
`npx --yes -p @electric-sql/pglite node …` form does not put the package on
Node's resolution path on Windows and fails with ERR_MODULE_NOT_FOUND.)

**What that harness does NOT prove:** RLS enforcement. PGlite runs as table
owner and owners bypass RLS, so a green run says the policies exist and are
well-formed, not that they hold against a hostile client. Spot-check in
Supabase with a real anon session before launch.

## Open items on the owner

- ⚠️ **RUN MIGRATION 0013** (`supabase/migrations/0013_progress_aggregates.sql`)
  in Supabase. Additive only — three read functions, no table or policy touched,
  and reverting is a `drop function`. Until it runs, the Progress screen's reads
  error and it shows its empty state.
- **FCM v1 service-account JSON** uploaded to EAS — blocks slice 7.
- **APNs key** — iOS, later.
- **Confirm a dev build is installed on a physical Android device.** Everything
  in slice 7 depends on it; remote push does not work in Expo Go on Android from
  SDK 53 onward, and we are on 57.
- Physical-device testing of haptics, push delivery, silent-switch behaviour,
  and animation smoothness. None of these can be verified from here.

## Open questions

None blocking. All four Phase 1 decisions were settled on 2026-07-28 and are
recorded in `docs/decisions.md`.

## Anything half-finished needing cleanup

None from this sprint.

**Pre-existing, not ours:** `npm run lint` fails at HEAD with 11 errors and 5
warnings — verified identical before and after slice 1, so it is a baseline, not
a regression. Most of them are `react-hooks` errors in `app/workout/session.tsx`,
which slice 6 rewrites anyway; clean them there rather than in a drive-by.
`npm run typecheck` is green.

## Checkpoint discipline

- Commit after every meaningful sub-step, not just slice boundaries. A usage
  limit can end a session without warning and anything uncommitted is invisible
  to the other machine.
- Update this file **at each checkpoint**, not at the end.
- Before starting anything uninterruptible (schema change, multi-file refactor),
  say so and confirm quota headroom first.
- Before a deliberate session end: commit, push, update this file and
  `CLAUDE.md`, and leave a two-line summary of exactly where to resume.
