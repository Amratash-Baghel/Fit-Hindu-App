# Sprint State — Feature Sprint

> **Read this second, after `CLAUDE.md`, at the start of every session.**
> This sprint runs across multiple sessions on two machines with two Claude Code
> identities. Sessions cannot be resumed across devices — every device switch is
> a cold start. This file must always reflect reality **as of the last commit**,
> not as of the last thing that happened in a chat window.
>
> Contract: `docs/specs/feature-sprint.md`. Source prompt: `prompts/feature-sprint.md`.

**Last updated:** 2026-07-28 · slice 1b built + verified, not yet committed.

---

## Where we are

**Slice 1b — settings screen. Built, verified in web preview.** Owner confirmed
migrations 0011 + 0012 applied clean in Supabase.

Settings ships as a stack route (`app/settings/index.tsx`) behind a Home header
gear, with three real sections: Language (changeable post-onboarding for the
first time; persists to `profiles.language_mode` when signed in), Account
(guest → sign in / user → inline sign-out confirm), and About (privacy link when
live, wellness disclaimer, version). Slices 2 and 7 add their toggle sections.

Next action: **slice 2, feedback service** (haptics + sound). Needs
`expo-haptics` installed and builds the Switch/Toggle primitive + wires the
Haptics/Sound toggles into the settings screen.

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
| 2 | Feedback service | ⬜ next | Install expo-haptics; add Toggle; wire settings section |
| 3 | Splash | ⬜ not started | Safe to interrupt |
| 4 | Streak | ⬜ not started | **Uninterruptible.** Needs 0012. |
| 5 | Plan-ready ceremony | ⬜ not started | Safe to interrupt. Reuses splash system. |
| 6 | Workout tracking + progress | ⬜ not started | Needs 0011 |
| 7 | Push end-to-end | ⬜ not started | Blocked on FCM credentials |

Ordering rationale: schema first because four slices depend on it. Slices 1 and
4 must not be interrupted — start them on a fresh quota window. Slices 3 and 5
are the safest to cut off: iterative, visual, and they lose nothing on a cold
restart.

## Dependencies not yet installed

`expo-haptics`, `expo-notifications`, `react-native-reanimated` — all approved
by owner 2026-07-28, none installed yet. Install at the slice that needs each,
not up front.

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
