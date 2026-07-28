# Spec — Feature Sprint (haptics · splash · plan-ready · streak · push · tracking)

> Status: APPROVED by owner 2026-07-28. Source prompt: `prompts/feature-sprint.md`.
> Live state lives in `docs/SPRINT-STATE.md` — this file is the contract, that
> file is the progress. Where the two disagree, SPRINT-STATE is newer.

Six workstreams, delivered as eight slices. Target device throughout:
mid-to-low-end Android on a slow, intermittent connection.

---

## Audit — what was actually wrong

The sprint prompt guessed at root causes. Four were wrong, and the corrections
changed the plan, so they are recorded here rather than lost in chat.

| Prompt's guess | Reality |
|---|---|
| Haptics broken — bad permission / platform branch / toggle | **Never implemented.** Zero `Haptics.*` call sites repo-wide. Greenfield, not a fix. |
| `expo-av` deprecated in favour of `expo-audio` | Already on `expo-audio`. Non-issue. |
| Streak broken — date-boundary bug | **Boundary is correct.** `ist_today()` (0001) + `current_streak()` (0006) work and were PGlite-tested. The bug is `app/(tabs)/index.tsx:106-110` renders three hardcoded dim `<DiyaIcon>`. No client read path exists. |
| Diet plan generation is slow, needs staged progress | **No diet generation exists.** Home's diet card is a `soon` badge. `assignPlan()` is one indexed query + one insert, sub-second, and runs inside `flushOnboarding()` after OTP verify. |

The real blocker the prompt did not anticipate: **guests log nothing.**
`src/lib/activity.ts:22` returns `false` with no session, and onboarding is
deliberately guest-first with skippable sign-in. The default new user completes
a workout and banks nothing — so streaks, push, and tracking would all ship to
an audience that never triggers them. Resolved by the guest-merge decision
below.

## Starting state

Expo SDK 57 (`expo ~57.0.4`, RN 0.86.0, React 19.2.3). Dev build, not Expo Go —
`eas.json` carries a `developmentClient: true` profile and `app.json` has config
plugins Expo Go cannot apply. **Unverified:** that a dev build is actually
installed on a physical device. Push (slice 8) depends on it.

Three packages added for this sprint, all owner-approved 2026-07-28:
`expo-haptics`, `expo-notifications`, `react-native-reanimated`.

| Workstream | State at sprint start |
|---|---|
| 1 Feedback | Nothing. `src/lib/audio.ts` is a looping *ambient* player, not an SFX service. |
| 2 Splash | Plugin config only. `preventAutoHideAsync()` never called. |
| 3 Plan-ready | Nothing. |
| 4 Streak | Backend complete (`current_streak`, `current_streak_for`, `daily_activity`), frontend absent. |
| 5 Push | Nothing. No `supabase/functions/` directory exists. |
| 6 Tracking | Session player works; writes one `activity_log` row at the very end. No session tables, no progress bars, no offline queue. |

## Decisions taken (full rationale in `docs/decisions.md`)

1. **Streak stays computed from `activity_log`**, server-side. Overrides the
   prompt's stored-counter design. Idempotency becomes structural.
2. **Guests get a local streak**, replayed into `activity_log` on sign-in.
3. **Workstream 3 is a plan-ready ceremony**, not an AI-generation loader.
4. **Ceremony palette** namespaced `tokens.ceremony.*`, splash + plan-ready only.
5. **Guest-replay dedup is DB-enforced** via `client_event_id` — see below.

### On decision 5 — the constraint was corrected

Owner specified a unique constraint on `(user_id, program_id, activity_date)`.
That key permits **one activity row per user per day**, which breaks three
shipped things: `daily_activity` (0006:51-59) aggregates
`array_agg(distinct activity_type)` and `count(*) as entries` and would always
return one; `current_streak_for(uid, a_type)` needs per-type rows for per-habit
streaks; and a user could not log a workout *and* a meditation on the same day.
The column is also named `ist_date`, not `activity_date`.

The principle — **DB-enforced idempotency, not app-level** — is kept. The key
identifies the event rather than the day:

```sql
client_event_id uuid not null default gen_random_uuid()
unique (user_id, client_event_id)
-- replay: insert … on conflict (user_id, client_event_id) do nothing
```

This is the same constraint slice 6's offline queue needs, so one mechanism
covers both guest replay and offline sync instead of two.

## Conflicts with CLAUDE.md, resolved

- **C1 stored vs computed streak** → computed wins (matches
  `docs/specs/tracking-streaks.md:29-31` and 0006's zero-backfill design).
- **C2 forgiveness day** → `tracking-streaks.md:26` promises one freeze per
  week; `current_streak()` has no freeze logic and must be rewritten.
- **C3 `program_id` on `activity_log`** → missing on an existing seeded table;
  retrofitted in migration 0012 as nullable → backfill → not null.
- **C4 dead frame on cold start** → `app/index.tsx:31` returns `null` while
  auth resolves. That window is the flash slice 3 closes.

---

## Slices

### 1 · Migrations

Two migrations, not one — 0011 creates, 0012 alters shipped and seeded tables.
Splitting keeps the risky half independently revertible.

**0011 — new tables.** `workout_sessions` (id, user_id, program_id, plan_id,
started_at, completed_at, status), `exercise_logs` (session_id, exercise_id,
set_no, sets, reps, duration_seconds, weight_kg, completed_at, skipped),
`push_tokens` (user_id, expo_push_token, device_id, platform, program_id,
last_seen_at — upsert on device_id so reinstalls do not duplicate),
`notification_prefs` (server-side, or the Edge Function cannot honour them when
it fans out). All `program_id`-scoped, all RLS own-row, `with check` on every
insert and update. Unique `(session_id, exercise_id, set_no)` for offline dedup.
Aggregate reads as `security_invoker` views or RPCs — never raw rows to the
client.

**0012 — alter existing.** Add `activity_log.program_id` **nullable → backfill
from `user_plans` → set not null** (a bare `not null` add fails against seeded
rows). Add `client_event_id` + unique `(user_id, client_event_id)`. Rewrite
`current_streak()` for freeze days. Add `streak_state(uid, program_id)` RPC
returning `{current, longest, freezes_used, at_risk}` in one round-trip.
`activity_log` keeps **no** update or delete policy — append-only is load-bearing.

Validated against PGlite before it goes near Supabase, per the pattern in
`docs/progress.md` that caught two real bugs in 0006.

### 1b · Settings screen

Unscoped by the prompt; needed by slices 2, 6 and 8. Stack route behind a Home
header icon — **not** a sixth tab (five tabs already, and Hindi labels are wide
at 360dp). Ships empty-ish and gains sections as later slices land.

### 2 · Feedback service

`src/lib/feedback.ts` exposing `tap()` / `success()` / `complete()` / `error()`,
each a haptic plus optional SFX. Players created **once at module scope** and
reused, mirroring the proven singleton in `src/lib/audio.ts`.

The fiddly part: `audio.ts:19` sets `playsInSilentMode: true` globally for
ambient meditation audio. UI sound effects must **not** inherit that — the
silent switch has to be respected for chirps and ignored for meditation, so the
audio mode becomes per-context rather than set-once.

Two independent toggles (Haptics, Sound), AsyncStorage, both default on. Wired
into: `app/workout/session.tsx` (`finishSet`:96, `complete`:129),
`app/meditation/session.tsx:64`, plan assigned (`src/lib/auth.tsx:94`), streak
increment, and every destructive confirm. No component calls `Haptics.*`
directly, ever.

Budget: four mono `.m4a` under ~30 KB each.

### 3 · Splash

`preventAutoHideAsync()` at module scope in `app/_layout.tsx`; native splash
hidden only once fonts, session and first data have resolved; `app.json`
background aligned to the ceremony maroon so the native→animated handoff is
invisible; the bare `null` in `app/index.tsx` replaced.

Artwork as `react-native-svg` paths (~15-25 KB, resolution-independent, no
2x/3x variants). Composition from the owner reference: oxblood field,
double-line gold ogee arch, gold gada on a thin gold ring, terracotta side
panels with paisley/mandala filigree bleeding off both edges, cream corners,
charcoal base band.

Motion, 1.6-2.2 s: maroon fades up from black → mandala arcs sweep in from both
edges with slight rotation, easing out → arch outline draws itself in gold
(stroke-dash) → gada scales from 0.9 with a gold bloom and a diagonal specular
sweep → wordmark fades in → cross-fade to home.

Perf contract: Reanimated on the UI thread. The stroke-dash reveal is the one
effect that genuinely requires it — `strokeDashoffset` is not native-driver-able
and would otherwise be a frame of bridge traffic per tick. The gold bloom is a
layered `<RadialGradient>`, **never** `<FeGaussianBlur>` (software-rasterized on
Android). Minimum beat 1.2 s so early data does not cause a stutter; a gentle
gold shimmer idle loop if data is slow; **6-second hard timeout** to the app or
an error state. `AccessibilityInfo.isReduceMotionEnabled()` → static composition
plus cross-fade only.

### 4 · Streak

Wire the existing backend to the UI and replace the hardcoded diyas. Client
reads `streak_state` once per foreground.

**Rules, to be recorded in `docs/decisions.md`:**
- Boundary **Asia/Kolkata** (already correct via `ist_today()`).
- A day counts on **≥1 core activity** (matches `tracking-streaks.md:26`).
- Rest days **preserve, do not increment**.
- **One freeze per rolling 7 days**, auto-applied.
- Retroactive completion **not allowed** — `ist_date` is server-defaulted and
  there is no UI for it.
- Idempotency is **free**: `count(distinct ist_date)` cannot double-count. This
  is the strongest argument for the computed model.

**Guest path:** activity banked to AsyncStorage with a device-generated
`client_event_id`; on sign-in, replayed as an idempotent upsert. A guest who
already synced cannot double-log.

**At-risk** is derived, not stored: `last_date = ist_today() - 1 AND current > 0`.
Slice 8 reads the same RPC.

**Test cases, run against PGlite, results shown:** same-day double completion,
midnight-IST edge, 1-day gap, 2-day gap, freeze consumption, rest day, timezone
change mid-streak, user with no history, guest replay of already-synced events.

### 5 · Plan-ready ceremony

`src/ui/CeremonyLoader.tsx`, parameterised on stage labels and outcome, reusing
the arch/gold system so it reads as the same product. Stages driven by **real
awaits** inside `flushOnboarding` (`src/lib/auth.tsx:72-101`) — profile upsert →
questionnaire_responses insert → rule resolution → plan insert. No faked timers,
and the final stage never claims completion before the data lands.

Three outcomes, all handled: success; failure with a retry CTA (`flushOnboarding`
already leaves answers on disk for exactly this, `auth.tsx:68-70`); and the
`plan.ts:38` null return, which needs a real "no plan yet, here is what you can
still do" screen rather than dumping the user into tabs. Back gesture blocked
during the write.

Diet plan generation itself is **out of scope** — it is a content-model plus
admin-panel workstream, not a loader.

### 6 · Workout tracking + progress bars

Current data loss: sets live in a `useRef` (`session.tsx:67`) and only reach the
server on completion (`:134`). Kill the app at set 9 of 10 and everything is
gone.

Lifecycle start → per-exercise write → finish, mirrored to AsyncStorage on every
set, with an offline queue flushed on reconnect and server-side dedup via the
`(session_id, exercise_id, set_no)` unique constraint. Reconciles on next launch.

Three progress bars: in-session (sets done / total), plan (days done / plan
length), body area (per-area — `profiles.body_focus` from 0010 makes this cheap).
Progress screen: current and longest streak, sessions this week, total minutes,
per-body-area breakdown, 7/30-day activity view. Charts hand-rolled — a 30-day
view is 30 `<View>`s with a width interpolation. No charting library.

Every meaningful completion fires `feedback.complete()`. Empty states are
load-bearing: a brand-new user must see encouragement, not zeros.

### 7 · Push

`expo-notifications` + EAS. Android: FCM v1 credentials in EAS, named channel
with correct importance, runtime `POST_NOTIFICATIONS` for Android 13+. iOS: APNs
key, permission requested **after first completed workout**, never on cold launch.

Sending is a Supabase Edge Function (`supabase/functions/send-push/`) using the
Expo push API — the first Edge Function in this repo. **No send path in the
client, ever.** `service_role` comes from function secrets, never a literal.
`DeviceNotRegistered` receipts delete the dead token row.

v1 types: daily workout reminder at a user-chosen time; streak-at-risk nudge
(evening, only when today is incomplete and a streak exists); plan-ready.
Deep-link taps to the right screen. Settings gains a master toggle, per-type
toggles, and a reminder time picker — persisted **server-side** so it survives
reinstall and so the fan-out can honour it.

Copy is motivational and behavioural only. **No health, medical or therapeutic
claims** in any string, in either language.

**Blocked on owner:** FCM v1 service-account JSON uploaded to EAS; APNs key for
iOS later.

---

## Low-end Android risk register

| Risk | Where | Mitigation |
|---|---|---|
| SVG filters / blur | Splash gold bloom | Layered `RadialGradient`, no `<Filter>` |
| JS-thread animation | Arch stroke-dash reveal | Reanimated, UI thread |
| Per-tap audio player creation | Feedback service | Module-scope preloaded players |
| Bundle growth | Splash art + SFX | SVG paths (~25 KB) + 4×30 KB m4a |
| Chatty writes on 2G | Per-set session writes | Local-first, batched queue flush |
| Splash blocking launch | `preventAutoHideAsync` | 6 s hard timeout, 1.2 s min beat |
| Unbounded aggregate reads | Progress screen | Views/RPCs server-side, never raw rows |

## Definition of done (per slice)

Typecheck + lint green · verified in the web preview where the change is
observable · `.claude/agents/reviewer.md` run on the diff · `docs/SPRINT-STATE.md`
updated · committed. Migrations additionally flagged loudly:
**USER MUST RUN migration NNNN in Supabase.**

## Cannot be verified without a physical device

Haptics (iOS simulators never fire them, which is the most common false "it's
broken" report), remote push delivery, real silent-switch behaviour, and
animation smoothness on low-end hardware. These are owner-tested.
