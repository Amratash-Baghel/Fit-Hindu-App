# Fit Hindu — Feature Sprint 2: Claude Code Prompt Pack

Phone+OTP auth · Push (FCM) · Audio bug fix · Color regression · Fit Points + jap/sleep screens + profile

> **Grounded against the real repo** `Amratash-Baghel/Fit-Hindu-App` @ `76a0168` (main). Highest migration
> is `0010`, so new migrations start at **0011**. This pack matches your actual files, skills, and conventions —
> not assumptions.

Run **one slice per fresh Claude Code session** (cheaper context). Start each in **plan mode**, approve the
plan, then build. Your repo already encodes the workflow in skills — **use them**: build screens with the
`screen` skill, schema with the `migration` skill, and finalize every slice with **`/ship`** (typecheck +
lint + build → click-through → `/code-review` → update `docs/progress.md`/`docs/decisions.md`/
`docs/learning-log.md` → commit + push). Do not invent a parallel process.

---

## What I corrected against the repo (so the plan is right)

- **Audio is already `expo-audio` (SDK 57).** No `expo-av` migration — that assumption was wrong. There's
  already a singleton service at `src/lib/audio.ts`. The bug is a real race + missing blur-stop, not a
  missing manager (see Slice 1).
- **Auth isn't shipped yet.** `src/lib/activity.ts` `logActivity()` no-ops without a session and nothing is
  stored locally for guests — so there is **no guest-merge problem**. Shipping phone auth simply lights up
  all the existing `logActivity()` call sites.
- **Points must be a computed *view* over `activity_log`, not a new ledger table.** `docs/specs/tracking-streaks.md`
  (owner-confirmed) says points are "computed from activity_log (a points ledger view), so switching it on
  later requires zero backfill." So: no `fit_events` table, no `record_activity` RPC — just rules + views.
- **`jap` and `sleep` tabs are "coming soon" stubs** (14 lines each). The jap round-tracker and sleep-timer
  points require **building those screens**, not just wiring.
- **Migrations start at 0011**, not 0014. Streak infra already exists: `activity_log`, the `daily_activity`
  view, and `current_streak(uid)` / `current_streak_for(uid, type)` functions, all IST via `ist_today()`.
- **Push is greenfield** — `expo-notifications` isn't in `package.json` and `app.json` has no
  `googleServicesFile`. Slice 4 adds them.
- **Color tokens are unchanged** (`src/ui/tokens.ts`, one commit). There's no "ceremony" palette; the real
  restricted palette is `gold` (primary button + streak only) and the `night*` sleep palette. So the
  regression is a per-screen token misuse, diagnosed by `git log` on that screen (Slice 2).

## Standing rules (from CLAUDE.md — honor every slice)

Program-scoped (never hardcode one deity/product) · **all user-facing strings via i18n** (`src/lib/i18n.tsx`,
add `{hi,en}` pairs, render with `<B>`/`t()`) · **design system only** (`src/ui/` tokens + base components, no
one-off colors) · IST day boundaries (`ist_today()`) · every new table gets RLS · no health/cure claims ·
migrations flagged loudly with "⚠️ USER MUST RUN migration NNNN".

---

## Owner action items (you — start now, in parallel)

Ordered by what they block.

1. **Supabase → Authentication → enable Phone provider**, and add **test phone numbers with fixed OTP codes**
   for development. → *Unblocks all of Slice 3's client work now, with zero SMS cost and no DLT wait.*
2. **MSG91 + DLT registration** (entity → header/sender ID → OTP template, via your operator's DLT portal);
   collect the MSG91 auth key + approved template ID. → *Blocks only PROD OTP delivery, not dev. DLT approval
   takes days — start today.*
3. **Firebase + FCM v1 → EAS** for push: create the Firebase project, add an Android app with package
   **`com.herbaldeck.fithindu`** (already set in `app.json`), download `google-services.json`, generate a
   **service-account key**, and upload **FCM V1** creds via `eas credentials`. Legacy server keys are dead —
   must be V1. → *Blocks real-device push (Slice 4).*
4. **Run migrations** in the Supabase SQL editor as each slice lands (the `migration` skill will print the
   exact "USER MUST RUN" line).
5. **Decisions/content I need from you:**
   - The **jap mantra list** already lives as content (`mantras` / `deities` tables) — confirm the ones to
     seed and the **mala size** (default 108).
   - **Confirm Fit Points values** (defaults seeded in Slice 5, tunable without code) and whether a jap
     "round" = one mala (108) or a raw count. Your `activity_log` jap meta is `{mantra_id, count}` today.
   - **Naming:** you said "Fit Points"; the spec frames it as "fitness / bhakti points." I've used a single
     **Fit Points** currency for simplicity — say if you want bhakti points split out for jap/meditation.
   - **Re-upload the color screenshot** and name the screen (Slice 2 needs it).
   - **Scope note:** the confirmed v1 spec lists points UI/rewards as "schema-ready only, not v1." You're now
     asking to build them — that's an owner override. Slice 5 writes/updates the spec and logs the override
     in `docs/decisions.md` (same pattern as the 2026-07-16 diet-AI override).

---

## Background — how phone OTP will work (India)

Auth stays in **Supabase** so RLS/JWT are unchanged. Supabase generates and verifies the OTP; delivery goes
through a **Send SMS Hook → Supabase Edge Function → MSG91** using a DLT-approved template. In dev you use
Supabase's **test numbers** (fixed codes) and never send a real SMS. `signInWithOtp({ phone })` →
`verifyOtp({ phone, token, type: 'sms' })`. No new app dependency — `@supabase/supabase-js` is already in.

## Background — how push will work (Expo + FCM)

The app never calls FCM directly. `expo-notifications` registers the device and returns an **Expo push token**.
You send to that token via the **Expo Push API** (`exp.host/--/api/v2/push/send`); Expo relays to **FCM** on
Android. FCM needs the **v1 service-account** creds you upload to EAS (owner task 3). `expo-notifications`
(and likely `expo-device`) are **new dependencies** and go in `app.json` `plugins`.

---

## SLICE 0 — Ground truth refresh (run first, once)

> **Paste, plan mode:** Don't write feature code. `git pull`, then read `CLAUDE.md`, `docs/progress.md`,
> `docs/decisions.md`, and the specs in `docs/specs/`. Confirm current state and report a short doc:
> (1) exact `expo-audio` API used in `src/lib/audio.ts`; (2) every screen that calls `playLoop`/`stopAudio`
> and whether it stops audio on blur; (3) which activity surfaces already call `logActivity` and which don't
> (grep `logActivity` across `app/`); (4) whether meditation/workout completion currently logs; (5) confirm
> `jap`/`sleep` tabs are stubs; (6) highest migration number. List any mismatch with this pack. No code changes.

---

## SLICE 1 — Fix audio overlap / won't-stop (bug)

**Root cause (confirmed in `src/lib/audio.ts` + call sites):**
- `playLoop` is `async` and `await ensureMode()` **before** it touches the module `player`. Two near-simultaneous
  calls (mount auto-play in `app/meditation/sounds.tsx:32` + a user tap at `:50`) can both pass the
  `player && currentUrl === url` guard while `player` is still `null`, both `createAudioPlayer(...)`, and the
  first player gets **orphaned** — still looping, unreachable by `stopAudio()`. That's the overlap-with-no-stop.
- Only `app/(tabs)/diet.tsx` uses `useFocusEffect`. The meditation flow **never stops audio on blur**, and
  `setAudioModeAsync({ shouldPlayInBackground: true })` is **global** — so leaving the module keeps sound playing.

**Fix (no migration; keep the singleton):**
- **Serialize `playLoop`** so overlapping async calls can't orphan a player: use a generation counter — capture
  `const gen = ++currentGen` at entry; after any `await`, if `gen !== currentGen`, remove the player you just
  created and bail. Always `player.remove()` the previous instance **before** assigning the new one, and never
  leave an unreferenced player. Confirm exact `expo-audio` teardown from the installed types (`remove`).
- **Stop on leaving the module:** add `useFocusEffect` cleanup that calls `stopAudio()` when the audio surface
  blurs — but preserve the documented intent that sound persists *within* the meditation sounds→session flow.
  Put the stop at the flow boundary (tab change / leaving the meditation stack), not on internal navigation.
- **Scope background playback:** only sleep sounds set `shouldPlayInBackground: true`; meditation/jap stop on
  blur and on app background.
- **Global stop affordance** (your explicit complaint): expose `isPlaying()` + a subscribe from the service and
  show a small "stop sound" control (a header button or floating pill) whenever audio is playing, using i18n
  strings and `src/ui` components.

**Acceptance:** rapidly tapping sounds never stacks audio; switching tabs stops meditation audio; the stop
control always works; sleep audio (once built) is the only surface allowed to continue in background.
Finalize with `/ship`.

---

## SLICE 2 — Color regression (diagnosis; needs your screenshot)

`src/ui/tokens.ts` is unchanged, so this is a **per-screen token misuse**, not a token edit.

> **Paste, plan mode:** A color regressed on `<SCREEN>` (screenshot attached). Diagnose before changing anything.
> `git log --oneline -p -- app/<path-to-that-screen>` to find the change. Check for the likely misuses: the
> `night*` sleep palette used outside sleep, `saffron` used where `gold` belongs (gold is restricted to the
> primary button + streak per `tokens.ts`), or a `surface`/`surface2` swap. Report the offending diff, fix it
> using the correct token, and add a guard/lint note so the sleep `night*` palette can't be imported outside
> sleep screens. Finalize with `/ship`.

---

## SLICE 3 — Phone + OTP auth (primary) — unlocks all tracking

First **write `docs/specs/auth-phone-otp.md`** (screen skill: user flow, states loading/empty/error/success,
hi+en copy) and confirm it. Then build:
- Phone entry screen (E.164, `+91` default) → `supabase.auth.signInWithOtp({ phone })`.
- OTP verify screen (6 digits, resend timer ≥ 60s) → `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
- Slot auth into the flow after `app/onboarding/index.tsx`; gate the app on a session; upsert `profiles`
  (phone) on first sign-in. Strings via i18n, UI from `src/ui`.
- **No guest merge needed** — once a session exists, the existing `logActivity()` calls start writing. Just
  verify the session is picked up (`supabase.auth.getUser()` in `activity.ts` already returns the user).
- **Prod delivery:** a Supabase **Send SMS Hook** Edge Function calling MSG91 with the DLT template; keep the
  hook secret + MSG91 key as Edge Function secrets, never in the client.

**Acceptance:** with a Supabase test number, full sign-in works; after sign-in a completed activity writes a
real `activity_log` row and the home tick/streak reflects it. `/ship`.

---

## SLICE 4 — Push notifications (Expo + FCM v1)

Write `docs/specs/push-notifications.md` first. Then:
- Add `expo-notifications` (+ `expo-device` if needed) to deps and to `app.json` `plugins`; set
  `android.googleServicesFile` to the `google-services.json` from owner task 3.
- Client: request permission → `getExpoPushTokenAsync({ projectId })`; create the Android channel; register
  `addNotificationReceivedListener` + `addNotificationResponseReceivedListener` (deep-link on tap via the
  `fithindu` scheme).
- **Migration 0011** (`migration` skill): `push_tokens(user_id, expo_push_token unique, device_id, platform,
  updated_at)` with RLS (own rows). Mirror the type in `src/types/db.ts`.
- Server: send via the Expo Push API from an Edge Function / the `admin/` panel. First triggers, ritual-framed
  per the streak spec ("ध्यान का समय", incomplete-tick nudge), quiet hours respected.

**Acceptance:** a physical Android device receives a test push and tapping deep-links correctly. `/ship`
(remember the "USER MUST RUN migration 0011" line).

---

## SLICE 5 — Fit Points engine: rules + computed views (migration 0012)

Depends on nothing but underpins 6–8. **This is the spec + schema slice.**
- First **write `docs/specs/points-rewards.md`** (and update `docs/specs/tracking-streaks.md`'s roadmap note),
  and add a dated **owner-override line** to `docs/decisions.md` (points UI now in scope, per this request).
- **Migration 0012** (`migration` skill), all program-aware, RLS'd, IST-based, types mirrored in
  `src/types/db.ts`:
  - `points_rules(id, program_id, activity_type, base_points, per_unit_points, unit_meta_key, min_qualify_value,
    daily_cap)` — content/config table, public-read + admin-write (so the `admin/` team can tune it). Seed the
    defaults below.
  - **Views over `activity_log`** (security_invoker, so RLS applies), zero new event storage:
    - `points_ledger` — one computed row per `activity_log` row: points = `base_points` + `per_unit_points ×
      (meta->>unit_meta_key)`, gated by `min_qualify_value`, then clamped to `daily_cap` per (user, activity_type,
      ist_date) with a window function.
    - `points_total(user_id, program_id)` = `SUM(points)`; `points_today` per (user, ist_date).
    - `jap_rounds_today(user_id, ist_date, mantra_id, rounds)` = `SUM((meta->>'count')::int)` over
      `activity_log` where `activity_type='jap'`, grouped by mantra + IST day → powers the jap round tracker.
- Reuse existing `daily_activity`, `current_streak`, `current_streak_for` for ticks/streaks — don't duplicate.

**Default Fit Points (seed; tunable in `points_rules`, confirm with owner):**

| activity_type | base | per-unit | qualifies when                         | daily_cap |
|---------------|------|----------|-----------------------------------------|-----------|
| workout       | 20   | —        | workout logged                          | 20        |
| meditation    | 15   | —        | meditation logged                       | 15        |
| jap           | 0    | 5/round  | `meta.count` present                    | 25        |
| sleep_sound   | 10   | —        | `meta.actual_min ≥ 5` OR timer complete | 10        |
| meal          | 5    | —        | meal logged                             | 20        |

**Acceptance:** with seeded rows and a few `activity_log` inserts, `points_total`/`points_today`/`jap_rounds_today`
return correct, capped values; no new writable event table exists. `/ship` + "USER MUST RUN migration 0012".

---

## SLICE 6 — Build the `jap` tab (mala counter → logs jap)

`app/(tabs)/jap.tsx` is a stub. Build per its spec note ("per-deity mala counter (108)"):
- Pick a deity/mantra (content from `mantras`/`deities`), a big tap-to-count mala counter that rolls a **round**
  at `mala_size` (108), haptic/visual feedback, current-round + rounds-today display.
- On each completed round (or on leaving with a partial), `logActivity('jap', { mantra_id, count })`.
- Show **today's rounds per mantra** from `jap_rounds_today` and the jap **per-habit streak**
  (`current_streak_for(uid,'jap')`). Fit Points update automatically via the views.
- Strings via i18n, UI from `src/ui`, all states handled. `/ship`.

---

## SLICE 7 — Build the `sleep` tab (sounds + timer → logs sleep, awards points)

`app/(tabs)/sleep.tsx` is a stub. Build:
- Sleep-sound picker (content `sounds` where `kind='sleep'`) using the **fixed** audio service (Slice 1) with
  `category: 'sleep'` so it's the one surface allowed to play in background; the `night*` palette.
- Auto-off **timer** (e.g. 15/30/60 min); use `expo-keep-awake` appropriately.
- When the timer completes **or** playback passes **5 minutes**, `logActivity('sleep_sound', { actual_min,
  timer_completed: true })` **once per night** (guard against double-fire). Points award via the Slice 5 rule.
- Strings via i18n, UI from `src/ui`. `/ship`.

*(Also verify in Slice 0 that meditation-session and workout-session completion already call `logActivity`;
if not, add those calls in the relevant slice so meditation/workout "done" is recorded.)*

---

## SLICE 8 — Profile screen (everything visible) + Fit Points UI

Build per `docs/specs/tracking-streaks.md` (v1 profile surface) as a route under `app/` behind a home-header icon:
- **Identity:** name, chosen deity, language mode, active plan (`profiles`, `user_plans`).
- **Streaks:** overall `current_streak` (framed as संकल्प / diyas) + per-habit `current_streak_for` (fitness,
  meditation, jap).
- **Today's ticks:** workout / meditation / jap / sleep done-state from `daily_activity`.
- **Fit Points:** `points_total` + `points_today`, plus a history list from `points_ledger` (grouped by day)
  and the **jap rounds today** counter.
- **History / personal bests:** calendar dots from `daily_activity`; longest streak, total malas, minutes
  meditated (from `activity_log` meta).
- **Rewards: scaffold only** — a `rewards` config concept and a read-only "what you can earn at milestones"
  view (e.g. Bajrangvati discount at a streak milestone). **No redemption/checkout** — that's deferred
  monetization; leave a clear TODO seam.
- Read-only screen; strings via i18n; fast on mid-range Android (day-scoped queries). `/ship`.

---

## Order & parallelism

**0 → 1 → 2 → 3 → 5 → 6 → 7 → 8**, with **4 (push)** slotted whenever Firebase/FCM clears. Rationale: audio +
color are quick, independent bug wins; **auth (3)** unlocks all logging so it comes before the tracking
features; **5** (points engine) precedes the surfaces that display points; **6/7** build the stub tabs; **8**
ties it together. Owner tasks 1–3 run in parallel from day one.
