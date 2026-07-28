# BajrangVati App — Feature Sprint Prompt (paste into Claude Code)

> **Before pasting:** drag `1785234876209_image.png` (the gada/arch reference) into the Claude Code session so the model can see it. Start in **plan mode (Shift+Tab)**. Do not let it write code until Phase 1 is approved.

---

## PHASE 0 — CONTEXT LOAD (read only, no code)

Read these before anything else:

1. `CLAUDE.md` at repo root — standing rules, conventions, current status.
2. `docs/architecture.md` and `docs/decisions.md` (or equivalent) — especially anything about `program_id` scoping.
3. `app.json` / `app.config.ts` — Expo SDK version, plugins, permissions, EAS project ID.
4. `package.json` — confirm exact versions of: `expo`, `expo-haptics`, `expo-audio`/`expo-av`, `expo-notifications`, `expo-splash-screen`, `react-native-reanimated`, `react-native-svg`, `@supabase/supabase-js`.
5. The Supabase schema files / migrations — every table touching sessions, completions, streaks, plans.
6. The existing theme/design-token file and any existing splash or loading component.
7. `.claude/agents/reviewer.md` — you will run this at the end.

Then state, in one short block: current Expo SDK, whether the project runs in Expo Go or a dev build, and which of the six features below already have partial implementations.

---

## PHASE 1 — AUDIT + SPEC (still no code)

Produce a written spec covering all six workstreams. For each: what exists now, what's broken and **why** (root cause, not symptom), the exact files you will touch, the schema changes needed, and the risk to low-end Android.

Do not begin Phase 2 until I approve this spec.

---

## THE SIX WORKSTREAMS

### 1. Haptics + sound feedback (currently non-functional)

- Diagnose the actual root cause before touching anything. Likely candidates: `expo-haptics` not installed or not in the plugin list, missing `VIBRATE` permission on Android, calls firing on a platform branch that never executes, a settings toggle defaulting to `false`, or `expo-av` deprecated in favour of `expo-audio` on this SDK.
- Build one central `feedback` service — `feedback.tap()`, `feedback.success()`, `feedback.complete()`, `feedback.error()` — that wraps haptics **and** sound together. No component calls `Haptics.*` directly ever again; refactor existing call sites to the service.
- Audio: preload sound assets once at app start, keep them in memory, never re-create a player per tap. Respect the device silent switch on iOS. Keep files small (short `.m4a`, mono, under ~30 KB each).
- Add a Settings entry with two independent toggles — Haptics and Sound — persisted locally and read by the service. Default both to on.
- Wire the feedback service into: exercise mark-complete, set completion, plan generation finish, streak increment, and any destructive-action confirm.
- Verify on a physical Android device, not just the simulator — iOS simulators don't fire haptics at all, which is the most common false "it's broken" report.

### 2. App launch / splash screen (themed)

Design brief — match the attached reference, don't copy it literally. You have creative liberty; the arc idea below is a starting point, not a constraint. Produce something genuinely premium.

**Visual language from the reference:**
- Deep oxblood / maroon field as the base (`#5C1A1C` – `#6B1F21` range)
- Antique gold for the emblem, arch outline and filigree (`#D4A24C`, highlight `#F0CE84`, shade `#A9762A`)
- Warm terracotta-orange side panels (`#D2582A` – `#E2703A`) carrying mandala/paisley filigree
- Cream negative space above (`#F2EDE6`), charcoal band at the base (`#2B2B2B`)
- Shapes: Mughal ogee (onion) arch, a thin gold circle behind the emblem, the gada (mace) as hero mark, radial mandala motifs bleeding off the left and right edges

**Motion (target: 1.6–2.2s total, must feel intentional, not slow):**
1. Maroon field fades up from black.
2. The two mandala arcs sweep in from the left and right edges — a slight arc/rotation as they translate, easing out.
3. The ogee arch outline draws itself in gold (stroke-dash reveal), meeting at the apex.
4. The gada scales up from ~0.9 with a soft gold bloom, and a single specular highlight sweeps diagonally across it.
5. Wordmark/tagline fades in beneath.
6. Whole thing cross-fades to the home screen.

**Hard constraints:**
- Use `expo-splash-screen` with `preventAutoHideAsync()` so there is **zero** flash of white between the native splash and the animated screen. Hide the native splash only once fonts, session and first data fetch have resolved.
- Animate with `react-native-reanimated` on the UI thread. **No** JS-driven `Animated` loops, **no** SVG blur/filter primitives, **no** large PNG cross-fades — these tank low-end Android.
- Ship the artwork as `react-native-svg` paths or a single optimised WebP/PNG at 2x and 3x. Total splash asset budget: **under 250 KB**.
- Respect `AccessibilityInfo.isReduceMotionEnabled()` — if on, show the static composition and cross-fade only.
- The animation must never block launch: if data resolves early, the splash still completes its minimum beat (~1.2s) so it doesn't stutter; if data is slow, it holds on a subtle idle loop (gentle gold shimmer) rather than freezing.
- Add a 6-second hard timeout that dismisses the splash and routes to the app or an error state — never trap the user on the splash.

### 3. Loading state for custom diet plan generation

- Full-screen themed loader reusing the splash design system (arch frame, gold accents, maroon field) so it reads as the same product.
- Because generation takes real time, show **staged progress messaging** rather than an indeterminate spinner — e.g. reading your inputs → matching your body areas → assembling your plan → finishing touches. Advance stages on real events where possible; where not possible, time them out sensibly and never let the final stage claim completion before the data actually lands.
- Determinate progress bar in gold on maroon.
- Handle the three real outcomes: success, network failure (retry button, no data loss on the quiz answers), and timeout. Never leave a dead screen.
- Block the back gesture during generation, or make backing out cancel cleanly without orphaning a half-written plan row.
- Same loader component, parameterised, should be reusable for workout plan generation later.

### 4. Streak (currently not working)

Root-cause this properly — streak bugs are almost always **date boundary** bugs.

- Decide and document the rule set explicitly in `docs/decisions.md`:
  - Timezone: compute the streak day boundary in **Asia/Kolkata**, not UTC and not device-local, otherwise a user completing at 11pm IST gets credited to the next UTC day.
  - What counts as "a day completed"? One exercise, or the whole day's plan? Pick one and write it down.
  - Grace/rest days: does a scheduled rest day break the streak? (Recommended: no — rest days preserve, they just don't increment.)
  - Retroactive completions: allowed or not?
- Compute the streak **server-side** in a Postgres function, not on the client — device clocks are untrustworthy and users change timezones.
- Schema: `streaks` table with `user_id`, `program_id`, `current_streak`, `longest_streak`, `last_completed_date` (date, IST), `updated_at`. Scoped by `program_id` per the Programs Platform rule. RLS: users read/write only their own row.
- Update via a trigger or RPC on completion insert, and make it **idempotent** — completing two exercises on the same day must not increment twice.
- Add a "streak at risk" state (completed yesterday, nothing today) that the UI can surface and that push notifications can hook into.
- Write test cases and run them: same-day double completion, midnight-IST edge, one-day gap, two-day gap, rest day, timezone change mid-streak, and a user with no history.

### 5. Push notifications

- `expo-notifications` + EAS. **Note:** remote push does not work in Expo Go on Android from SDK 53 onward — confirm we are on a dev/EAS build and say so plainly if we are not, because everything below depends on it.
- Android: FCM v1 credentials configured in EAS, a named notification channel with the right importance, and runtime `POST_NOTIFICATIONS` permission for Android 13+. iOS: APNs key, permission prompt at a sensible moment (after first completed workout, not on cold launch).
- Store tokens in a `push_tokens` table: `user_id`, `expo_push_token`, `device_id`, `platform`, `program_id`, `last_seen_at`. Upsert on the device identifier so re-installs don't create duplicates. RLS locked to the owner.
- Send via a **Supabase Edge Function** using the Expo push API. Never put a send path in the client.
- Notification types for v1:
  - Daily workout reminder at a user-chosen time
  - Streak-at-risk nudge (evening, only if today is incomplete and a streak exists)
  - Plan-ready when diet/workout generation finishes
- Handle the receipt/error path: Expo returns `DeviceNotRegistered` for dead tokens — delete those rows so we don't send into the void forever.
- Deep-link taps to the right screen (reminder → today's workout, plan-ready → the plan).
- Add a Settings section: master toggle plus per-type toggles plus reminder time picker, persisted server-side so it survives reinstall.
- Copy must stay compliant — motivational and behavioural only. **No health, medical, or therapeutic claims** in any notification string.

### 6. Workout tracking, data, and progress bars

- Schema (all `program_id`-scoped, all RLS-enforced):
  - `workout_sessions` — id, user_id, program_id, plan_id, started_at, completed_at, status
  - `exercise_logs` — session_id, exercise_id, sets, reps, duration_seconds, completed_at, skipped (bool)
  - Aggregate reads via views or RPCs, not by pulling raw rows to the client.
- Session lifecycle: start → per-exercise completion writes → finish. Must survive an app kill mid-session — persist session state locally and reconcile on next launch. Must work offline: queue writes locally, sync when connectivity returns, deduplicate on the server.
- Progress bars needed at three levels:
  1. **In-session** — exercises completed / total for today, live at the top of the workout screen
  2. **Plan** — days completed / plan length
  3. **Body area** — per-area completion, since body-area selection is core to onboarding
- Progress screen showing: current and longest streak, sessions this week, total minutes, per-body-area breakdown, and a simple 7/30-day activity view. Keep charts lightweight — no heavy charting library for v1; hand-rolled bars in Reanimated are fine and far faster on low-end Android.
- Every meaningful completion fires `feedback.complete()` from workstream 1.
- Empty states matter: a brand-new user must see something encouraging, not zeros on a blank screen.

---

## PHASE 2 — IMPLEMENTATION ORDER

Build in this sequence, one slice at a time. **Stop after each slice, tell me what changed, and let me test before moving on.** Commit at each boundary with a clear message.

1. Schema + RLS migrations for streaks, push tokens, sessions, exercise logs (one migration, reviewed before it runs)
2. Feedback service (haptics + sound) and its Settings toggles
3. Workout session tracking + the three progress bars
4. Streak logic server-side, with the test cases run and results shown
5. Splash / launch screen
6. Diet plan generation loader
7. Push notifications end-to-end, including the Edge Function

Rationale for the order: schema first because four features depend on it. Slices 1 and 4 (migrations, streak logic) are the ones that must not be cut in half — start those on a fresh quota window. Slices 5 and 6 (splash, loader) are the safest to interrupt, since they're iterative and visual and lose nothing on a cold restart.

---

## PHASE 3 — VERIFICATION (mandatory, before you report done)

1. Self-review every file you changed. Fix what you find. **Then** report.
2. Run the `.claude/agents/reviewer.md` subagent over the diff, specifically checking: RLS correctness on all four new tables, no exposed keys, no health claims in any user-facing string, and low-end Android performance on the animated screens.
3. Confirm explicitly: no secrets committed, no `console.log` left in production paths, no new dependency added without telling me first.
4. List anything you could not verify yourself and that I must test on a physical device.
5. Update `CLAUDE.md` (current status), `CHANGELOG.md`, and `docs/decisions.md` (streak rules, notification types, splash motion budget).

---

## SESSION HANDOFF PROTOCOL (two devices, sequential)

This sprint runs across multiple sessions on two different machines with two different Claude Code identities. Sessions cannot be resumed across devices — every device switch is a cold start. Work accordingly.

**At the start of every session, before anything else:**
1. `git pull`
2. Read `CLAUDE.md` and `docs/SPRINT-STATE.md`
3. `git log --oneline -10` to see what actually landed
4. State back to me: which slice we are on, what is done, what is next. Do not start work until I confirm.

**Throughout the session — checkpoint discipline:**
- Commit after every meaningful sub-step, not just at slice boundaries. A usage limit can cut a session off without warning, and anything uncommitted is lost to the other machine.
- Update `docs/SPRINT-STATE.md` at each checkpoint — not at the end. It must always reflect reality as of the last commit. Format: current slice, sub-steps done, sub-steps remaining, open questions, anything half-finished that needs cleanup.
- Never leave a migration partially applied. Either it runs clean and is committed, or it is not started.
- If you are about to begin something that cannot be safely interrupted (a schema change, a multi-file refactor), say so first and confirm I have quota headroom.

**Before I end a session deliberately:**
Commit, push, update `docs/SPRINT-STATE.md` and `CLAUDE.md`, and give me a two-line summary of exactly where to resume.

---

## STANDING RULES FOR THIS SESSION

- `program_id` scoping on every new table and query. No exceptions.
- Do not add AI plan generation. Rule-based matching stays as-is.
- Do not install a new package without asking. Prefer what's already in `package.json`.
- If something in `CLAUDE.md` contradicts this prompt, `CLAUDE.md` wins — flag the conflict to me.
- If a root cause turns out to be different from what I guessed above, say so and fix the real thing rather than the symptom.
- Target device assumption: mid-to-low-end Android on a slow network. Every decision gets judged against that.
