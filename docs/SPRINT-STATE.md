# Sprint State — Feature Sprint

> **Read this second, after `CLAUDE.md`, at the start of every session.**
> This sprint runs across multiple sessions on two machines with two Claude Code
> identities. Sessions cannot be resumed across devices — every device switch is
> a cold start. This file must always reflect reality **as of the last commit**,
> not as of the last thing that happened in a chat window.
>
> Contract: `docs/specs/feature-sprint.md`. Source prompt: `prompts/feature-sprint.md`.

**Last updated:** 2026-07-29 · slice 5 built + reviewed + verified, committing.

---

## Where we are

**Slice 5 — plan-ready ceremony. Built, reviewed, verified.**

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

**Deferred (flagged, unchanged):** the "guests bank a local streak, merged on
sign-in" decision (2026-07-28) is recorded but NOT built — `activity.ts` still
no-ops for guests. Its own slice (AsyncStorage log + replay on `flushOnboarding`
with the `client_event_id` dedup already in 0012).

Next action: **slice 6, workout tracking + the three progress bars** — needs 0011
(applied). This one is a multi-file refactor of `app/workout/session.tsx`; it is
also where the 11 lint errors get cleaned rather than in a drive-by.

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
| 6 | Workout tracking + progress | ⬜ next | Needs 0011 (applied). Multi-file refactor — not safe to interrupt. Clean the 11 lint errors here. |
| 7 | Push end-to-end | ⬜ not started | Blocked on FCM credentials |

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

**Never assume a migration has been applied.** Never leave one partially
applied — either it runs clean and is committed, or it is not started.

Re-run the schema checks any time with:
`npx --yes -p @electric-sql/pglite node supabase/tests/validate.mjs`
(34 checks; PGlite is not a package.json dependency by design.)

**What that harness does NOT prove:** RLS enforcement. PGlite runs as table
owner and owners bypass RLS, so a green run says the policies exist and are
well-formed, not that they hold against a hostile client. Spot-check in
Supabase with a real anon session before launch.

## Open items on the owner

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
