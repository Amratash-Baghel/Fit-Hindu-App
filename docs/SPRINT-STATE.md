# Sprint State — Feature Sprint

> **Read this second, after `CLAUDE.md`, at the start of every session.**
> This sprint runs across multiple sessions on two machines with two Claude Code
> identities. Sessions cannot be resumed across devices — every device switch is
> a cold start. This file must always reflect reality **as of the last commit**,
> not as of the last thing that happened in a chat window.
>
> Contract: `docs/specs/feature-sprint.md`. Source prompt: `prompts/feature-sprint.md`.

**Last updated:** 2026-07-29 · slice 4 built + reviewed + verified, committing.

---

## Where we are

**Slice 4 — streak wired to the UI. Built, reviewed, verified.**

The server-side streak logic (`streak_state()` in migration 0012) was already
done in slice 1; slice 4 was the UI wiring. New `src/lib/streak.ts` exposes a
`useStreak()` hook that reads the `streak_state()` RPC for signed-in users and
returns null for guests. `app/(tabs)/index.tsx`'s hardcoded three-dim-diya
sankalp stub is replaced with a live `StreakCard`: gold day-count headline + a
seven-diya week row (lit = min(streak, 7)), the longest line, the at-risk nudge,
and the gentle `freezes_used` "a forgiveness day kept your sankalp" line. No-
guilt framing throughout; guests and the first-read window see the invitation,
not a zero or a flash of "start over". Four i18n strings added
(`sankalp_at_risk`, `sankalp_freeze_saved`, and `{n}`-interpolated
`sankalp_days`/`sankalp_longest`) — all copy in the catalog.

Re-ran the PGlite harness: **34/34 green** (same-day double, one/two-day gaps,
freeze bridging, at-risk, dead-streak, longest-survives, `freezes_used`, per-user
isolation). Reviewer (`.claude/agents/reviewer.md`) on the diff: RLS
(streak_state is stable + NOT security definer, so activity_log RLS protects the
caller), program-scoping (user-level by the 2026-07-28 decision — correct),
secrets, health-claims, and low-end perf all clean; fixed a slow-network flash of
the invitation for returning streak-holders and moved the dynamic strings into
the catalog. Typecheck green; lint at the 11-error baseline (new files add zero).

Verified in web preview: Home renders the StreakCard (8 diya SVGs = 1 header + 7
week), guest invitation state, zero console errors. Physical-device / real-session
only: the lit-diya active state, the RPC round-trip, and refresh-on-focus after a
real activity logs.

**Deferred (flagged):** the "guests bank a local streak, merged on sign-in"
decision (2026-07-28) is recorded but NOT built — `activity.ts` still no-ops for
guests, so the default signed-out user banks nothing and the streak stays an
invitation until they sign in. Its own slice (AsyncStorage log + replay on
`flushOnboarding` with the `client_event_id` dedup already in 0012).

Next action: **slice 5, plan-ready ceremony** — safe to interrupt, reuses the
splash system.

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
| 5 | Plan-ready ceremony | ⬜ next | Safe to interrupt. Reuses splash system. |
| 6 | Workout tracking + progress | ⬜ not started | Needs 0011 |
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
