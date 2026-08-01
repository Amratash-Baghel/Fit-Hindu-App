# Sprint State — Feature Sprint

> **Read this second, after `CLAUDE.md`, at the start of every session.**
> This sprint runs across multiple sessions on two machines with two Claude Code
> identities. Sessions cannot be resumed across devices — every device switch is
> a cold start. This file must always reflect reality **as of the last commit**,
> not as of the last thing that happened in a chat window.
>
> Contract: `docs/specs/feature-sprint.md`. Source prompt: `prompts/feature-sprint.md`.

**Last updated:** 2026-08-01 · regression-fix + polish batch (B1–B7) built +
committed on branch `onboarding-auth-plan-engine`.
**Migrations 0013 AND 0014 — owner confirmed both run in Supabase 2026-07-30.**
**⚠ Migrations 0015, 0016, 0017, 0018 — NOT YET RUN. Owner must apply them in
Supabase** (0018 only after signing off `docs/mantra-review.md`). All four were
validated against real Postgres (PGlite) and apply cleanly.

---

## Regression-fix + polish batch (B1–B7) — 2026-08-01

Diagnosis first (Phase A): the jap counter, sleep timers and diet were **not
regressions** — they were written on `origin/main` (diet) and
`claude/sad-payne-d01fff` (jap/sleep) and never merged into this branch. Fixed
by **surgical port** onto this branch's current APIs, not a branch merge.

- **B1** `4b9150f` — restored jap counter, sleep timers/playback, diet (AI/n8n
  custom plan). Diet tab + home card rewired. Migration **0015** (renumbered
  from origin/main's colliding 0010; omits body_focus/days_per_week, already on
  this branch).
- **B2** `a42d45f` — Android glyph/shadow/SVG clipping: systemic `lineHeight`
  headroom in `Text.tsx`, meditation ॐ glow, onboarding diya (🪔 emoji →
  `DiyaIcon`). **Web can't show these — owner confirms on device at 1.3× font.**
- **B5** `bede6bf` — bundled Om + sleep flute (offline), `localAudio.ts`
  resolver, `fadeOutStop`. Migration **0016** seeds the media/sounds rows.
- **B4** `4bc6f8c` — feedback cues (jap tick + mala, meditation `chime`,
  selection taps). New `chime.wav` placeholder.
- **B3** `3bfc3fb` — ceremony loader creep (no 80% stall) + splash polish
  (gada bounce, mid-sequence stagger, shimmer exit). Native-only motion.
- **B6** `6413923` — card-based auto-advancing onboarding (<90s); **deity
  question removed** (engine never read it). Migration **0017** drops
  `profiles.deity_id`. Deleted dead `src/lib/profile.ts`.
- **B7** `97e10dd` — 8 new mantras. Migration **0018**, gated on
  `docs/mantra-review.md` team sign-off.

Deferred (task chip): the admin-panel Meals *authoring* pages (separate Next.js
app; needs a small enum port). Not blocking the app.

Typecheck green throughout; the batch added **zero** new lint problems (the 5
that remain are pre-existing in `workout*`/`MediaTile`). Reviewer agent run at
the end of the batch.

---

## Post-slice-7 fix: bottom safe-area insets

Not part of the sprint's six workstreams — an unrelated bug reported after
slice 7 shipped. Expo SDK 54+ renders edge-to-edge on Android: content sits
BEHIND the system nav bar (gesture pill or 3-button bar) unless a screen
reserves that space itself. `Screen.tsx`, `FooterAction` (`Button.tsx`), and
the tab bar (`(tabs)/_layout.tsx`) never did, so their bottom row of
buttons/tabs was partly unclickable — `CeremonyLoader.tsx` already had the
right pattern (`insets.bottom + space.lg`) from slice 3, just never applied to
the other three. Fixed, typecheck/lint clean, confirmed harmless in the web
preview (insets.bottom is 0 there, so it degrades to the original numbers).
**Needs a physical-device confirmation** — the web preview cannot simulate a
system nav bar. Commit `25f63f7`.

---

## Where we are

**Slice 7 — push notifications. Code complete, reviewed. Migrations 0013 and
0014 applied (owner-confirmed 2026-07-30). Delivery still unverified** — that
needs the FCM upload, the deployed Edge Function, and a physical device; see
the owner action list below, now down to four items.

Six commits: `30bedde` migration 0014, `e6dfce9` the install + app.json,
`318a126` the client service, `808c9e4` the Settings section, `05f9055` the
Edge Function, `a463bf9` the reviewer fixes.

**The shape of the slice: eligibility is SQL, the sender is dumb.**
`push_audience()` answers "who is due for this kind right now" — master switch,
per-type switch, not-already-sent-today, nothing-logged-today, and for the
daily reminder, whether their chosen IST time has passed by under two hours.
`push_claim()` writes the `(user, kind, ist_date)` ledger row *before* handing
back the devices, so an at-least-once cron and two racing invocations both
collapse into one send. The Edge Function renders copy and talks to Expo; it
decides nothing. That split is the point — those rules are the compliance
surface of the feature, and in Postgres they are reviewable and tested.

`push_sends` and `push_receipts` have RLS on with **zero policies**:
service_role only. A client that could write `push_sends` could mark itself
already-notified and silence its own reminders.

`supabase/functions/send-push/` is the first Edge Function in the repo. Four
invocations — two cron fan-outs, an app-triggered plan-ready, and a receipts
sweep. **Both halves of the delivery contract are implemented:** tickets catch
tokens Expo already knows are dead; receipts, collected 15 minutes later
through the `push_receipts` work queue, catch the app-uninstalled-after-send
case that tickets never report. Skip the receipts cron and `push_tokens` grows
dead devices forever.

**The recipient is never read from the request body.** Cron authenticates with
`CRON_SECRET` and may fan out; the app authenticates with the user's own JWT,
may only ask for `plan_ready`, and gets itself as the target. Worst case for a
malicious client is one notification to itself, once a day.

Client side: one token row per install, registered on sign-in and deleted on
sign-out (shared handsets are normal here). A tap maps through a **closed**
kind→route table, so a payload can never steer navigation. The permission is
asked twice — an in-app card on the workout completion screen, and only a yes
reaches the one-shot OS prompt; a "not now" is remembered but never spends it,
so Settings keeps a permanent way in.

**PGlite 79/79 green** (was 51). Typecheck green. Lint held at the 2-error
baseline — slice 7 adds zero.

**The reviewer caught three real bugs**, all fixed before this was called done:
1. The reminder window did bare `time` arithmetic. Across midnight two times
   subtract to a negative interval — 00:00 − 23:30 = −23:30, which satisfies
   "less than two hours late" — so a 23:30 reminder would have fired at every
   midnight, and the stepper lets users pick 23:30. Now compared as instants.
2. `plan_ready` trusted the caller that a plan existed. `requestPlanReadyPush()`
   is reachable from any signed-in client, so a user the rules engine never
   matched could be told "your plan is ready". Now requires an active
   `user_plans` row.
3. The cold-start notification response was re-read on every root-layout
   remount, replaying the navigation and yanking the user back to a screen they
   had already left. Consumed once per JS runtime now.

No RLS, secret-exposure, health-claim or `program_id` defects found.

**Verified in the web preview** (360dp, English and Hindi): all four shapes of
the Settings section render — the three the web build can never reach were
checked behind temporary stubs, since removed (`grep TEMP-VERIFY` is clean) —
stepper 19:00 → 20:30, wrap 23:30 ↔ 00:00 both directions, master-off collapses
the section, daily-off hides the stepper, no horizontal overflow, zero console
errors.

**Cannot be verified from here, at all:** actual push delivery, the FCM path,
the Android channel, the OS permission prompt, tap-to-deep-link, and
`deno check` on the Edge Function (Deno is not installed on this machine; the
file is parse- and type-checked with `tsc`).

---

## Slice 6 (previous)

**Workout tracking + progress bars. Built, reviewed, verified.**

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
feature work. The branch is now **21 ahead / 3 behind** and main has moved with
the diet section (incl. the owner-approved AI custom-plan), admin Meals/Mantras,
the Bunny video-upload fix, and the legal package — 49 files.

    git fetch origin && git merge origin/main

This was already the top item before slice 7 and it was not done — slice 7 was
run against an explicit "slice 7 only" instruction. The collision surface has
grown accordingly: slice 7 appended to `src/lib/i18n.tsx`, `src/types/db.ts` and
`docs/decisions.md` / `docs/progress.md`, all of which were already on the list.
Nothing new was added to the list, but every one of those four is now a bigger
hunk.

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

**1 · Owner actions remaining.** Migrations 0013 and 0014 are done (owner
confirmed 2026-07-30) and `eas init` has run (project `@amratashs-team/fit-hindu`,
`extra.eas.projectId` written to `app.json`). In order, what's left:

1. Upload the **FCM v1 service-account JSON** to EAS (`eas credentials`).
2. `supabase functions deploy send-push --no-verify-jwt`, then
   `supabase secrets set CRON_SECRET=…`.
3. Create the three pg_cron jobs — the `cron.schedule` calls are written out at
   the bottom of `supabase/migrations/0014_push_fanout.sql` and are deliberately
   not run by the migration (they embed the project ref and the secret). The
   receipts job is not optional: skip it and `push_tokens` accumulates
   uninstalled devices forever.
4. Install a **dev build on a physical Android device**. Remote push does not
   work in Expo Go on Android from SDK 53 onward and we are on 57. This build
   also needs to be a NEW one — `eas init` and `expo-notifications` both changed
   native config since the last dev build was installed.

`supabase/functions/send-push/README.md` has the exact commands and a smoke
test, including how to force yourself into the audience.

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
| 6 | Workout tracking + progress | ✅ done | Local-first session queue; 3 bars; Progress screen. 0013 applied. 51/51 PGlite. |
| 7 | Push end-to-end | ✅ code done | 0014 + `send-push` Edge Function + client + Settings; reviewed. 79/79 PGlite. 0014 applied; `eas init` done. **Delivery untested — four owner actions above.** |

**All seven slices of the sprint are now built.** What remains is not
engineering: it is the owner action list above, the `origin/main` merge, and the
physical-device verification backlog.

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
- `expo-notifications` ~57.0.8 — **installed** (slice 7). `extra.eas.projectId`
  now present (`eas init`, project `@amratashs-team/fit-hindu`). Still needs a
  fresh dev/EAS build — remote push does not work in Expo Go on Android from
  SDK 53 onward, and neither `expo-notifications` nor the projectId were in the
  last build that shipped to the test device.

Install at the slice that needs each, not up front.

`expo-device` was installed briefly during slice 7 and **removed** — it was not
on the approved list, and the only thing it offered was `isDevice`, which
`getExpoPushTokenAsync` already covers by throwing on a simulator. Do not
re-add it without asking.

`@electric-sql/pglite` is still deliberately not a dependency. Note that any
`npm uninstall` prunes it, so re-run `npm install --no-save @electric-sql/pglite`
before the schema checks if they fail with `ERR_MODULE_NOT_FOUND`.

`eas init` (2026-07-30) resolved the native config for the first time since
`expo-audio` was added, and synced three Android permissions into `app.json`
that were implied but never written: `MODIFY_AUDIO_SETTINGS`,
`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` — all from
`expo-audio`'s own config plugin (meditation/sleep background audio), not a new
capability being requested. Confirmed against `node_modules/expo-audio/plugin/src/withAudio.ts`.
Worth knowing before the next store listing, since it changes the permission
list shown there.

## Migration ledger

| Migration | Written | **Applied in Supabase** |
|---|---|---|
| 0001-0010 | ✅ | ✅ (per `docs/progress.md`) |
| 0011 sessions + push | ✅ | ✅ (owner ran 2026-07-28) |
| 0012 activity_log + streak | ✅ | ✅ (owner ran 2026-07-28) |
| 0013 progress aggregates | ✅ | ✅ (owner ran 2026-07-30) |
| 0014 push fan-out | ✅ | ✅ (owner ran 2026-07-30) |

Not independently re-verified from this session — no direct Supabase access
here. If the Progress screen or `send-push` behave as if either migration is
missing, that is the first thing to check, not the second.

**Never assume a migration has been applied.** Never leave one partially
applied — either it runs clean and is committed, or it is not started.

Re-run the schema checks any time with:
`node supabase/tests/validate.mjs`
(79 checks. PGlite is not a package.json dependency by design — install it for
the run with `npm install --no-save @electric-sql/pglite`, which leaves
package.json and the lockfile untouched. The previously documented
`npx --yes -p @electric-sql/pglite node …` form does not put the package on
Node's resolution path on Windows and fails with ERR_MODULE_NOT_FOUND.)

**What that harness does NOT prove:** RLS enforcement. PGlite runs as table
owner and owners bypass RLS, so a green run says the policies exist and are
well-formed, not that they hold against a hostile client. Spot-check in
Supabase with a real anon session before launch.

## Open items on the owner

- ✅ Migration **0013** — owner ran 2026-07-30.
- ✅ Migration **0014** — owner ran 2026-07-30.
- ✅ **`eas init`** — done 2026-07-30. Project `@amratashs-team/fit-hindu`,
  `extra.eas.projectId` in `app.json`. Also synced three Android permissions
  from `expo-audio` into `app.json` that were implied but never written before
  — see the Dependencies section above.
- **FCM v1 service-account JSON** uploaded to EAS (`eas credentials`).
- **Deploy the Edge Function** and set its secret:
  `supabase functions deploy send-push --no-verify-jwt`, then
  `supabase secrets set CRON_SECRET=…`. See
  `supabase/functions/send-push/README.md`.
- **Create the three pg_cron jobs** — SQL is written out at the bottom of
  `0014_push_fanout.sql`, deliberately not run by the migration because it
  embeds the project ref and the secret. The receipts job is not optional.
- **APNs key** — iOS, later.
- **Confirm a dev build is installed on a physical Android device.** Everything
  in slice 7 depends on it; remote push does not work in Expo Go on Android from
  SDK 53 onward, and we are on 57.
- Physical-device testing of haptics, push delivery, the Android channel, the
  permission prompt, tap-to-deep-link, silent-switch behaviour, and animation
  smoothness. None of these can be verified from here.

## Open questions

None blocking. All four Phase 1 decisions were settled on 2026-07-28 and are
recorded in `docs/decisions.md`.

## Anything half-finished needing cleanup

None from this sprint.

**Pre-existing, not ours:** `npm run lint` is at **2 errors and 4 warnings**
(down from an 11-error baseline; slice 6's rewrite cleared the nine in
`app/workout/session.tsx`). The two survivors are setState-in-effect in
`app/(tabs)/workout.tsx` and `app/workout/template/[id].tsx`; fixing them needs a
UX call on whether a tab switch flashes a spinner or shows stale content.
Slice 7 adds zero. `npm run typecheck` is green.

`supabase/functions/**` is excluded from both tsconfig and eslint — it is Deno,
not React Native, and Metro never bundles it. Type-check it with
`deno check supabase/functions/**/*.ts`. **That was not run for slice 7:** Deno
is not installed on this machine, so the Edge Function was parse- and
type-checked with `tsc` instead (clean apart from the expected unresolvable
`Deno` global and `jsr:` import). Run `deno check` on a machine that has it, or
rely on `supabase functions deploy` to type-check at deploy time.

## Checkpoint discipline

- Commit after every meaningful sub-step, not just slice boundaries. A usage
  limit can end a session without warning and anything uncommitted is invisible
  to the other machine.
- Update this file **at each checkpoint**, not at the end.
- Before starting anything uninterruptible (schema change, multi-file refactor),
  say so and confirm quota headroom first.
- Before a deliberate session end: commit, push, update this file and
  `CLAUDE.md`, and leave a two-line summary of exactly where to resume.
