# Decision Log

One dated line per decision, with the why. Newest on top.

- **2026-08-14** — **Haptic map reworked to the approved mockup; press drops
  Medium → Light.** The mockup's grammar wins: light tick on press, crisp
  [12,40,18] pattern on success/complete, a [10,30,14] flutter + soft bell on
  the blessing reveal (`feedback.reveal`). Supersedes the 2026-08-08 "press =
  Medium" call — with pattern-based completions in place, a Medium baseline
  made every surface thump the same. rewardBurst stays the one grand-
  celebration verb (Purna, reward screens); no parallel "celebrate" pattern,
  since two Android vibration timelines cancel each other.
- **2026-08-14** — **Muscle filter lives in every workout mode, after the
  premade workouts.** Home/Gym filter the mode's own list client-side over
  `body_areas` (no new queries); Custom keeps its server-side area union.
  Owner ask; the plan artifact's "premade workouts still lead" rule holds —
  templates render above the filter.

- **2026-08-12** — **BMS redesign, phase-1 UI pass (owner demo build).** Applied
  the reviewed proposals to the app, UI-only (haptics deferred to a later pass):
  (1) a *time-of-day surface* — Home's greeting + a top wash follow the IST clock
  (Brahma Muhurta / morning / afternoon / evening / night), washes added to
  tokens (`daypart`), reusing existing hues so no new colours enter the system;
  (2) *evening reorder* — after sunset the ring stack leads with Soul; (3) ring
  *done-states* (a lit diya crowns a complete pillar) + a "N of 3 complete"
  saadhana line; (4) *Purna* — a once-per-IST-day "all three done" moment
  (celebrates the routine, never worship; not gated); (5) tab-bar *done-dots*;
  (6) guest rings read "Begin", never a cold 0/2; (7) **My Path** replaces the
  old `/progress` screen (rev-1 design: streak + record, weekly तन/मन/आत्मा grid,
  Fit-Points milestone, one gentle nudge). Chose the *lighter rings + polish*
  route over the mockup's 3D coins (low-end Android perf). `usePillars` became a
  shared `PillarsProvider` so Home rings + tab-dots read one refreshing source.
  Home "next-step task strip" deferred (needs a unified per-day task source).
  Why: give the owner the new *feel* to review; nothing here needs a migration —
  it renders data the app already collects.
- **2026-08-12** — **Reflect, never ask (personalization principle).** The app
  must never ask a user about their deity/devotion — no onboarding question,
  picker, or survey. It mirrors the practice a person already chooses (reads
  `activity_log` only). Why: owner steer during the redesign review; religious
  preference is sensitive data and a question is both friction and liability.
  Scope: the redesign's personalization surfaces; the optional onboarding deity
  question (`q_deity`) is grandfathered but no new asking is added.
- **2026-08-12 (reverses a founding rule)** — **English-first.** `en` is now the
  default locale and copy is authored in English; Hindi stays in the catalog as
  the second locale, and Devanagari is kept only for scripture (mantras,
  shlokas, deity names) with romanisation beside it. Why: owner call during the
  BMS redesign review. ⚠ This contradicts the Hindi-first audience thesis in
  `docs/idea.md` ("Hindi-first, mid-range phone") and the research note that
  Hindi-first UI with English as a toggle is Kuku FM's core insight — that
  tension is real and unresolved. Older specs/decisions were left as dated
  records; `CLAUDE.md` carries the live rule. Revisit before store launch:
  if the seed audience is Herbal Deck's existing Hindi-speaking buyers, an
  English default may cost activation.
- **2026-08-12** — The splash meditator is our own vector art, redrawn from the
  owner's reference, never the reference itself. Why: the reference is a
  watermarked licensed stock image, so shipping a crop is a licensing problem;
  vector also stays crisp at every density, animates in parts (chakras, gaze),
  and adds no MB to the bundle.
- **2026-08-12** — The awakened gaze is solid glowing white eyes only — no
  forehead arrow or other character marks. Why: the arrow is a copyrighted
  character's mark and a store-rejection/IP risk; the bare luminous gaze carries
  the same "awakening" read and is ours.
- **2026-08-12** — Each pillar's circle glows in its own colour (तन saffron,
  मन blue, आत्मा gold) — ripples, aura and the tap-to-open bloom all take
  `--rc`. Why: one app-wide gold made all three pillars feel like the same
  action; colour is the cheapest way to tell them apart before the label is read.
- **2026-08-11 (v1 preserved as a milestone before the redesign)** — tagged
  `v1-devotional-fitness` at 2dec26b (tip of `onboarding-auth-plan-engine`) and
  branched `redesign` from the same point; `onboarding-auth-plan-engine` is now
  frozen and untouched, all further work happens on `redesign`. Why: the app is
  getting a complete rework starting now, and the owner wants the current fully
  working build (onboarding → plan → workout/meditation/jap/sleep → rewards)
  reachable and buildable-from at any time, independent of what the redesign
  does. `git checkout v1-devotional-fitness` returns to it exactly;
  `git checkout -b <branch> v1-devotional-fitness` builds on it separately.
- **2026-08-11 (reward burst = one native `Vibration.vibrate` pattern, not
  JS-timed impacts)** — the accelerando+pop is delivered as a single native
  pattern so the OS schedules the whole timeline. Why: ten `setTimeout`-scheduled
  expo-haptics impacts fire late on a busy JS thread (exactly while the completion
  screen animates), which reads as choppy; a native pattern stays smooth
  regardless of the JS thread.
- **2026-08-11 (Bunny Stream needs an explicit Referer; media-URL logic lives in
  `src/lib/media.ts`)** — native players and the native `<Image>` loader send no
  Referer, and Bunny's Stream zone 403s referer-less requests, so video sources
  and derived posters must attach one. Restored the helper that was lost when
  this branch diverged from the video work. Why: the `VideoHero` rewrite dropped
  it and silently fell back to placeholders on device though the old build played
  fine — the app, not Bunny, was the problem.
- **2026-08-11 (ambient audio teardown = pause-then-remove, always)** — a looping
  expo-audio player keeps sounding after `remove()` alone, so swapping or stopping
  without pausing first leaks an unreachable, still-looping player. Why: this was
  the "sounds overlap and Stop does nothing" bug; one `teardown()` path (used by
  both `playLoop`'s swap and `stopAudio`) keeps exactly one stoppable player.
- **2026-08-11 (reward-burst haptic owned by `CompletionDiya`)** — the ramp→release
  buzz fires from the diya component's own mount, not the calling screen. Why: it
  then stays in sync with the sparks whether the diya is on a pushed completion
  screen (workout) or a modal that mounts later (the Fit-Points `RewardOverlay`).

- **2026-08-10 (per-activity reward = server before/after points diff, gated on
  write success)** — the "you earned N" popup reads `points_summary` before an
  activity is logged and again after, showing the delta. Why: points stay
  **computed, never stored** (docs/specs/points-rewards.md), so a per-row lookup
  can't express the daily caps / jap per-round rules — but a cumulative diff
  can, and it stays honest (a 2nd same-day workout shows +0 → "already
  claimed"). The diff runs only when the write is confirmed landed (the
  `logActivity` boolean, or a re-`flushQueue()` for the queued workout row);
  otherwise the reward shows no number, never a false "+0 already claimed".
  Reads use `getSession()` (local), not `getUser()` (network), to spare the 2G
  target two round-trips per reward.
- **2026-08-10 (exercise video autoplays control-less; errors fall back to the
  tile)** — `VideoHero` drops `nativeControls` for a muted, looping, autoplaying
  demo (owner: "it shouldn't be a video player"), and treats a player `error`
  status as a fallback-to-`AvatarTile` (with a `__DEV__` error line), never a
  black box. Why: real Bunny HLS can 403 / not-yet-encode, and the premium
  placeholder beats a broken player. Extends the 2026-08-08 `expo-video` seam.
- **2026-08-10 (ambient/sleep audio stops on navigation blur, not just
  unmount)** — bottom tabs stay mounted on a tab-switch, so the Sleep screen's
  unmount-only stop let the loop play on across the app. Moved to a
  `useFocusEffect` blur stop. A phone-lock is an AppState background (not a nav
  blur), so falling-asleep playback is preserved — the one case that must keep
  going.
- **2026-08-08 (jap taps opt out of the "haptic-light" rule; press baseline is
  Medium)** — the mala button now fires a **Heavy** impact on *every* tap (not
  the light per-count tick), and the global `press` haptic moved Light → Medium.
  Why: on device the Light impact was imperceptible ("haptics don't work") and
  the owner wants each bead to feel like a definite, satisfying strike. This
  narrows — does not reverse — the 2026-08-06 "sound only on outcomes" rule: jap
  is still **haptic-only, no beep**; only the *strength* changed.
- **2026-08-08 (real video via `expo-video`, behind a placeholder-fallback
  seam)** — added a React Native video player at last: `expo-video` + `VideoHero`,
  which plays the exercise's HLS `playback_url` and falls back to the `AvatarTile`
  placeholder for null / `example.com` / web URLs. Why the seam: the seed URLs
  are placeholders and content is uploaded later via admin/Bunny, so the app must
  degrade gracefully to the tile until real media exists — no broken players, and
  it upgrades itself the moment a video is published. Cost: `expo-video` is
  native, so the dev client must be **rebuilt** (not just JS-reloaded); web stays
  on the tile (HLS there would need hls.js, and web is only a preview surface).
- **2026-08-06 (UI motion layer lives in `src/ui/`; sound only on outcomes)** —
  the premium/interactive polish is delivered as shared design-system primitives
  (`PressableScale`, `Shimmer`, `AnimatedNumber`, `CelebrationBurst`, `Reveal`,
  `motion.ts`) — never per-screen one-offs — so one change lifts every screen and
  the "design system only" rule holds. Haptic/sound vocabulary re-cut: **sound
  fires only on low-frequency outcomes** (success/complete/chime/error); every
  tap/selection/jap-count/set is haptic-only. Why: the old build played a beep on
  every jap count (108 per mala) — the owner's "irritating beep"; decoupling sound
  from taps fixes it without going silent. All motion is UI-thread (Reanimated 4)
  and no-ops to a static frame on web/reduce-motion (Reanimated is inert on
  RN-web here — see CeremonyLoader), so the low-end-Android and a11y rules hold.
  Engagement hooks kept inside the app's fence-lines: celebrations are devotional
  diya-sparks (never confetti), the daily-blessing reveal (slice E) will surface
  the *already-banked* app-open bonus (no invented/double points), streak hype
  stays encouragement (no loss-guilt), and nothing gates worship. See
  docs/specs/ui-polish.md.
- **2026-08-05 (Fit Points is v1 — owner override; points computed, not
  stored)** — points UI moves into v1 (the confirmed `tracking-streaks.md` had
  it "schema-ready only"). Same override pattern as the 2026-07-16 diet-AI
  carve-out. Migration **0020**: `points_rules` + `streak_milestones` (admin
  config), `daily_checkins` (app-open bonus), the `points_daily` /
  `jap_rounds_today` views and `points_summary()`. Points are COMPUTED over
  `activity_log` — no ledger table — keeping the zero-backfill guarantee.
  Key sub-decisions: (1) **single visible currency** ("Fit Points"), but a
  `currency` column is seeded all-`'fit'` so a future Fit/Bhakti split is data,
  not a migration; (2) **milestone bonuses award off `longest_streak`, not
  `current_streak`** — earned once, permanent, so a broken streak never loses
  banked points and nothing can double-award; (3) the **app-open bonus is NOT an
  `activity_log` row** — that would let opening the app earn the संकल्प streak;
  it lives in `daily_checkins` (PK `(user_id, ist_date)` = unfarmable) and earns
  points but never a streak day; (4) **`sleep_sound` logging moved off the play
  tap** to a stop/timer-complete write carrying `actual_min`, because the sleep
  rule (`actual_min ≥ 5`) can't be evaluated honestly otherwise — the old code
  banked a point per tap. Magnitude order milestone > workout > meditation > jap
  > sleep, app-open present but never decisive. Spec:
  `docs/specs/points-rewards.md`. ⚠️ Migration 0020 must be run in Supabase.

- **2026-08-03 (phone OTP is v1 auth; app stays guest-first, no hard gate)** —
  `AUTH_CHANNEL` flipped to `"phone"` (`src/lib/auth.tsx`); sign-in is phone +
  OTP via Supabase. The Sprint 2 pack said "gate the app on a session," but that
  is **overruled** by the guest-first owner decision (2026-07-15) and the
  never-gate-core-worship rule: sign-in stays offered-but-skippable, guests keep
  full access, and their answers flush to a real account on later sign-in. Why
  phone: Hindi-first Indian audience. No `profiles.phone` column — the verified
  number lives in `auth.users.phone`. Prod SMS goes through a Send SMS Hook →
  MSG91 Edge Function (Supabase's built-in provider list has no MSG91 entry),
  **deferred** until DLT registration/template approval lands; dev + demo run on
  Supabase test numbers, which bypass the provider entirely. Spec:
  `docs/specs/auth-phone-otp.md`.

- **2026-08-03 (`T` treats `tone` as a default, `style.color` always wins)** —
  the `T`/`B` text primitive (`src/ui/Text.tsx`) applies `{ color: tones[tone] }`
  FIRST in its style array so an explicit `color` passed via `style` overrides
  it. Why: callers that need ink-on-gold (`#241503` on the primary button, the
  jap `ॐ`) set the color through `style`, not `tone`; a regression (commit
  `a42d45f`) had put the tone color last and silently repainted all of them
  cream. Rule going forward: never move `{ color: tones[tone] }` after the
  caller's `style` in that array, and don't fold caller `style` into a helper
  (e.g. `withLineHeadroom`) whose result then loses to a later default.

- **2026-08-03 (background audio playback scoped to sleep only)** — the shared
  audio service (`src/lib/audio.ts`) no longer sets `shouldPlayInBackground: true`
  globally; only the sleep tab passes `{ background: true }` to `playLoop`.
  Meditation and jap get `false`, so the OS pauses them when the app leaves the
  foreground, and the meditation flow additionally hard-stops at its navigator
  boundary. Why: a single global background flag meant meditation audio kept
  playing after the user left the flow or backgrounded the app — sleep is the
  only surface whose whole purpose is to keep playing unattended (with its own
  auto-off timer). Overlapping `playLoop` calls are now serialized with a
  generation counter so a stop can never be outrun by an in-flight start.

- **2026-08-01 (deity question removed from onboarding)** — the onboarding
  questionnaire no longer asks for a deity, and `profiles.deity_id` is dropped
  (migration 0017). Why: it was never read by the rule-based matching engine
  (`factsOf` in `src/lib/planRules.ts` has no deity key), so it cost the user a
  question and bought the plan nothing — and the onboarding target is under 90
  seconds. Deity stays first-class as CONTENT metadata: `mantras.deity_id`,
  `sounds.deity_id`, and the devotional calendar are untouched, and the jap
  screen still groups mantras by their own deity (defaulting to the
  deity-of-the-day, not a stored profile choice). Only the per-profile answer
  and its dead reader (`src/lib/profile.ts` `useProfileDeity`) were removed.
  Same pass reworked onboarding to card-based, one-question-per-screen with
  single-selects that auto-advance on tap (the <90s lever).

- **2026-07-30 (notification eligibility lives in SQL, not in the sender)** —
  `push_audience()` / `push_claim()` (migration 0014) answer opted-in,
  already-trained-today and already-notified-today; the Edge Function only
  renders copy and talks to Expo. Eligibility is the compliance surface of
  push — "don't nag someone who already showed up", "once per day" — and those
  rules rot fastest when they live in a deploy artefact nobody diffs. In
  Postgres they are reviewable and tested against a real engine. Both functions
  are `stable`/`volatile` but NOT `security definer`, the same contract as
  `streak_state`: `service_role` sees the whole audience, any other caller is
  cut to their own rows by the RLS already on `push_tokens` /
  `notification_prefs`, so the function can never become a roster of everyone's
  push tokens.
- **2026-07-30 (claim before send, not send then mark)** — `push_claim()` writes
  the `(user_id, kind, ist_date)` ledger row and returns only the devices whose
  row it won. Both orders can fail once: this one loses a notification if the
  Expo POST then dies, the other sends a duplicate if the ledger write dies. A
  missed daily nudge is a non-event; a duplicate is why people turn
  notifications off. The primary key also makes two racing cron invocations
  split into one sender and one no-op instead of both sending.
- **2026-07-30 (notification day boundary and the late-night limit)** — The
  reminder window is evaluated as instants (`ist_today() + reminder_time`), not
  bare `time` values, which subtract to a negative interval across midnight and
  would have fired a 23:30 reminder every night. A reminder is due when its time
  has passed *today in IST* by under two hours — the bound stops a cron outage
  from delivering a stack of nudges at eleven at night. **Accepted limit:** a
  slot in the last two hours before midnight gets no catch-up if its own tick is
  missed, because by the next tick `ist_today()` has rolled and the ledger has
  closed that day. Widening the window past midnight would re-qualify every
  other user under the new date and double-notify them, which is worse.
- **2026-07-30 (notification copy is server-side, and that is the one exception
  to the i18n rule)** — A scheduled push is composed at 19:00 IST by a cron job
  with the app not running on any device, so it cannot go through
  `src/lib/i18n.tsx`. The strings live in the Edge Function and are rendered
  against the recipient's `profiles.language_mode` (returned by
  `push_audience()` for that purpose). `i18n.tsx` names the file so the second
  location is documented rather than discovered. Same non-medical rule applies,
  and it matters more there: those strings never appear in the app's UI code.
- **2026-07-30 (the push permission is asked for twice — in-app first)** — The
  OS prompt is one-shot on iOS and effectively so on Android 13+, so it is never
  fired unannounced. A card on the workout completion screen asks in the app's
  own words, at the one moment "remind me to do that again" is obvious, and only
  a yes reaches the OS. A "not now" is remembered so the card never nags, but it
  never touches the system prompt, so Settings keeps a permanent way in.
- **2026-07-30 (reminder time steps in 30 minutes)** — No date-time picker is
  installed and adding one needs approval, but the resolution is not a
  compromise: the fan-out cron runs half-hourly, so half an hour is the finest
  promise the server can keep. A wheel offering 19:07 would be a lie told by the
  UI. Writes are debounced 700 ms and flushed on unmount — eight taps on 2G must
  not be eight round-trips.
- **2026-07-29 (session writes are local-first, and the queue owns delivery)** —
  Every set goes to an AsyncStorage mirror and a durable queue *before* any
  network call, and the queue may fail forever without losing a set. Dedup is
  the database's job: `workout_sessions.id` is client-generated and
  `exercise_logs`' PK is `(session_id, item_position, set_no)`, so every replay
  is `on conflict do nothing` and the queue never reasons about what landed.
  The streak's `activity_log` row goes through the same queue carrying a
  `client_event_id` — writing it directly meant finishing a workout offline
  recorded the session and its sets but silently dropped the one row the streak
  reads. One shared FIFO drains in order (exercise_logs FKs the session), so a
  permanently-failing op is dropped after 8 attempts rather than wedging every
  future workout behind it.
- **2026-07-29 (an interrupted workout is `completed`, not `abandoned`)** —
  A session killed mid-way with at least one logged set is closed as completed
  on the next launch; only a session with no sets is abandoned. Why: progress
  aggregates count completed sessions only, so marking a real half-workout
  abandoned would erase training the user actually did — the exact data loss
  this slice exists to stop. Its `activity_log` row is written **only if the
  session began today in IST**: crediting an earlier day would be retroactive
  completion, which the streak rules forbid. So an overnight kill keeps its sets
  and minutes but does not resurrect a broken streak — sets are history, the
  streak is a promise about days.
- **2026-07-29 (no connectivity listener; flush on write, launch, foreground and
  sign-in)** — `@react-native-community/netinfo` is not a dependency and adding
  one needs approval, so the queue retries on every write, at launch, on
  `AppState` returning to active, and when auth resolves. The last of those is
  not optional: the launch flush can run before the stored session is restored,
  and on a cold start that never returns to the foreground nothing else would
  retry.
- **2026-07-29 (progress aggregates are Postgres functions, user-scoped by RLS)**
  — `progress_summary`, `body_area_progress` and `plan_progress` (migration
  0013) are `stable` and NOT `security definer`, the same contract as
  `streak_state`, so the caller's RLS applies and asking for another uid returns
  zeroes. They exist because the body-area breakdown joins a user's whole
  exercise-log history against `exercises` and unnests an array — shipping that
  to a mid-range Android over 2G to count it on-device is what the
  "aggregate via views or RPCs" rule exists to prevent. A set counts toward
  every area its exercise trains, so per-area totals deliberately sum to more
  than `sets_total`; they are never shares of one pie. Body-area bars scale
  against the user's own best area rather than a target, because there is no
  correct number of sets for a body part and inventing one would be a health
  claim.

- **2026-07-29 (staged progress is driven by real awaits, never by timers)** —
  The plan-ready ceremony's four stages map 1:1 onto the four network round-trips
  inside `flushOnboarding` (profile upsert → questionnaire insert → rule query →
  plan insert), and the label list `FLUSH_STAGES` lives in `src/lib/auth.tsx`
  beside those awaits rather than in the screen. Why the adjacency: it is what
  stops the labels drifting from the work — add an await, add a label. The bar
  fills to `(stage + 1) / (stages + 1)`, so with four stages it reaches 0.8 and
  stops; only a terminal status can reach 1. **The final stage therefore cannot
  claim completion before the data lands** (the spec's hard requirement), and a
  failure hides the bar entirely rather than showing a full gold one under an
  error headline.
- **2026-07-29 (the plan-ready ceremony owns the guest→user write)** — The
  bridge that turns a guest's answers into a profile, a questionnaire row and an
  assigned plan moved out of `app/auth/verify.tsx` into `app/plan/ready.tsx`.
  Why: it was running invisibly behind a disabled OTP button, and its one
  interesting outcome — no assignment rule matched, `plan.ts` returns null — was
  silently indistinguishable from success, dumping the user into the tabs with
  no plan and no explanation. That outcome is now its own screen. Back is
  blocked for the whole route (gesture + Android hardware): during the write it
  would orphan a half-finished flush, and after it "back" means a spent OTP form.
- **2026-07-29 (an interrupted flush resumes, but only once, and the user may
  walk away)** — Cold start sends a signed-in user with never-flushed answers
  back to the ceremony, gated on `isFlushPending()` = consented answers on disk
  **and** no onboarded marker. Why the marker half is load-bearing:
  `flushOnboarding` ends with two non-atomic AsyncStorage writes, and a kill
  between them (routine on low-end Android) leaves the marker set with the
  answers behind — testing the answers alone would replay a flush that already
  succeeded, and `questionnaire_responses` is deliberately append-only with no
  unique key, so it would record a second response for a questionnaire taken
  once. Leaving a failed write also sets the marker, so a permanently failing
  account is never steered back into the ceremony on every launch; the answers
  stay on disk and the next sign-in retries.
- **2026-07-29 (Reanimated does not drive animations under react-native-web)** —
  Verified with an isolated probe: a bare `withRepeat(withTiming(…))` on a plain
  `View` stays pinned to its initial value, and `useAnimatedStyle` never
  re-evaluates after mount — direct shared-value assignment included. So
  `CeremonyLoader` layers plain prop-derived styles over the animated ones on web
  only. Why it matters beyond the preview: without it the progress bar sits at
  zero in the web build while the writes run fine underneath, i.e. the screen
  lies. Native, the shipping target, animates normally. **Consequence for this
  sprint: the web preview verifies layout, copy and state, never motion** —
  animation smoothness stays a physical-device check.

- **2026-07-29 (splash = oxblood-and-gold ceremony, Reanimated on the UI
  thread)** — The launch screen is an animated SVG composition (radial maroon
  field, gold ogee arch drawn with a stroke-dash reveal, gada emblem on a gold
  ring, terracotta filigree panels sweeping in). Motion budget **1.6–2.2 s**;
  **minimum 1.2 s beat** so early data can't cause a stutter; gentle gold
  shimmer idle-loop if data is slow; **6 s hard timeout** to the app so the user
  is never trapped. The gold bloom is a layered `RadialGradient`, never an SVG
  blur/`<FeGaussianBlur>` filter (software-rasterised on Android). Reduce-motion
  → static composition + cross-fade only. Why the timers, not Reanimated
  callbacks, own completion: a backgrounded tab (or a stalled UI thread) freezes
  `requestAnimationFrame`, so anything gated on a `withTiming` callback could
  strand the user faded-but-mounted; the ceremony's state machine runs on plain
  `setTimeout`s instead. Added `babel.config.js` (the repo's first) for the
  `react-native-worklets` plugin that Reanimated 4 requires; `babel-preset-expo`
  is resolved from expo's nested copy since npm didn't hoist it.
- **2026-07-29 (ceremony palette is namespaced `tokens.ceremony.*`)** — The
  oxblood + antique-gold ritual colours live in their own token namespace and
  are used ONLY by the splash and the (later) plan-ready ceremony. Why: they
  must not leak into everyday app surfaces, which stay on the premium-black /
  saffron / gold system. `app.json`'s native splash background is set to the
  same `ceremony.field` maroon so the native→animated handoff shows no seam.
- **2026-07-29 (the "Fit Hindu" wordmark is not routed through i18n)** —
  Deliberate, recorded exception to the never-hardcode-display-text rule: the
  splash wordmark and its `accessibilityLabel` render the raw brand name. Why:
  it is a proper noun, identical in Hindi and English; the tagline beneath it
  (`splash_tagline`) IS bilingual through the catalog. Logged explicitly (per
  reviewer flag) so it is a reviewed exception, not a silent one.
- **2026-07-28 (feedback = one service, haptics + sound paired)** — All tactile/
  audio feedback goes through `src/lib/feedback.ts` (tap/success/complete/error);
  no component calls `Haptics.*` or a UI audio player directly. Why: the two
  settings toggles (haptics, sound — local to the device, default on) stay
  honest with a single gate, and the buzz+chime mapping lives in one file.
  Players are preloaded once at startup, never per tap (low-end Android).
- **2026-07-28 (UI SFX audio mode is the expo-audio default; ambient owns the
  override)** — Feedback never calls `setAudioModeAsync`; the default respects
  the iOS silent switch, which is what UI chirps want. The ambient player
  (`audio.ts`) sets `playsInSilentMode:true` while it plays and resets on
  `stopAudio()`, so that choice never leaks into later chirps. The one chirp
  that rides the ambient mode is the meditation-complete chime (the reset is
  async and fires just before it) — deliberately fine: the user was already
  hearing audio, or chose silent and the mode never left default.
- **2026-07-28 (SFX ship as generated placeholders)** — `assets/sfx/*.wav` are
  synthesised sine chirps so the service is functional now; the sound designer
  replaces them with polished ≤30 KB assets under the same filenames, no code
  change (`assets/sfx/README.md`). Why: unblocks the feature without waiting on
  audio production, same "content fills the shell later" pattern as the rest of
  the app.

- **2026-07-28 (streak exposes `freezes_used`)** — `streak_state()` returns the
  count of forgiveness days spent in the *current* run, not just the streak
  number. Why: the 2026-07-28 freeze rule promises gentle recovery framing, and
  without this the UI cannot tell a clean 10-day run from one a freeze rescued —
  it would either stay silent about the missed day or have to guess. Caught by
  the reviewer as a silent drop from the written spec; added before slice 4
  builds against the contract, since adding it later costs another migration.
- **2026-07-28 (`notification_prefs` carries no `program_id`)** — Deliberate
  exception to program-scoping, shaped like `profiles`. Why: "do not disturb"
  and "remind me at 19:00" are properties of the person, not of whichever
  program they are on, and there is no UI through which a user could express a
  per-program notification preference. `push_tokens` keeps `program_id` because
  a send is targeted at a device.
- **2026-07-28 (offline/replay dedup keys on position, not exercise)** —
  `exercise_logs` is keyed `(session_id, item_position, set_no)`. Why: a circuit
  or superset may legitimately list the same exercise at two positions, and
  keying on `exercise_id` would make the second occurrence collide with the
  first and silently drop a real set.

- **2026-07-28 (streak: computed, never stored counters)** — The feature-sprint
  prompt asked for a `streaks` table with `current_streak`/`longest_streak`
  columns kept fresh by a trigger. Overruled in favour of the existing design:
  streaks are **computed server-side from `activity_log`**
  (`current_streak()`, 0006). Why: stored counters are a second source of truth
  that drifts from the log, and every idempotency worry in the prompt — "two
  exercises on the same day must not increment twice" — is a symptom of that
  drift. Under the computed model `count(distinct ist_date)` **cannot**
  double-count; the bug class is structurally impossible rather than defended
  against in trigger code. Matches `docs/specs/tracking-streaks.md:29-31` and
  0006's zero-backfill promise. Revisit only if a real latency problem is
  measured on a slow connection, and then as a cache, not as truth.
- **2026-07-28 (streak rules)** — Day boundary **Asia/Kolkata** (already correct
  via `ist_today()`). A day counts on **≥1 core activity**. Rest days
  **preserve, do not increment**. **One freeze per rolling 7 days**, auto-applied
  — promised by `tracking-streaks.md:26` but absent from `current_streak()`,
  so the function is being rewritten. Retroactive completion **not allowed**
  (`ist_date` is server-defaulted; no UI exists for it). "At risk" is derived,
  not stored: `last_date = ist_today() - 1 AND current > 0`. Why the freeze: a
  devotional habit app that punishes one missed day with total loss triggers
  rage-quit, and the spec already committed to gentle recovery framing.
- **2026-07-28 (guests bank a local streak, merged on sign-in)** — Guest-first
  onboarding (2026-07-15) meant `logActivity` no-ops without a session
  (`activity.ts:22`), so the default new user completed a workout and banked
  nothing. Guests now log to AsyncStorage and see a real streak; signing in
  replays it into `activity_log`. Why: it makes the streak the *reason* to sign
  in rather than a feature locked behind sign-in, without touching the
  guest-first decision. Cost: a replay path with its own dedup requirement.
- **2026-07-28 (guest-merge dedup is DB-enforced, keyed on the event)** — Replay
  idempotency is a database constraint, not app-level checking. Owner specified
  a unique key on `(user_id, program_id, activity_date)`; **corrected to
  `client_event_id` with unique `(user_id, client_event_id)`**. Why the change:
  a day key permits only one activity row per user per day, which breaks
  `daily_activity` (0006:51-59 aggregates `array_agg(distinct activity_type)`
  and `count(*) as entries`), breaks `current_streak_for()` per-habit streaks,
  and would stop a user logging a workout *and* a meditation on the same day.
  The event key preserves the owner's principle — enforcement in the DB — and
  does double duty as the offline-queue dedup key for workout sessions, so one
  mechanism covers both instead of two.
- **2026-07-28 (`activity_log` retrofitted with `program_id`)** — The table
  predates the programs-platform rule and carries no `program_id`, which made
  program-scoped streaks impossible. Added in migration 0012 as **nullable →
  backfill from `user_plans` → set not null**; a bare `not null` add fails
  against seeded rows.
- **2026-07-28 (ceremony sub-palette, splash + plan-ready only)** — The owner's
  splash reference (oxblood field, terracotta filigree panels, cream, charcoal)
  is a different system from the shipped black/saffron/gold approved 2026-07-12.
  Rather than a one-off (banned) or a re-theme (expensive, discards an approved
  system), the reference colours enter `src/ui/tokens.ts` namespaced as
  `tokens.ceremony.*`, commented as usable **only** by the splash and the
  plan-ready screen. Why: the premium reference look on the two ceremonial
  surfaces, with no one-off values anywhere and the daily-use app untouched.
- **2026-07-28 (workstream 3 is a ceremony, not a generation loader)** — The
  prompt specified staged progress messaging over a slow diet-plan generation.
  No such generation exists — the diet card is a `soon` badge, and `assignPlan()`
  is one indexed query plus one insert. Building a fake progress bar over a
  sub-second call would also drift toward implying AI generation, which the
  v1 rules forbid. Built instead as a **plan-ready ceremony** whose stages are
  driven by the real awaits inside `flushOnboarding`, parameterised for reuse
  when diet and workout generation genuinely land. Diet content itself stays out
  of scope: it is a content-model + admin-panel workstream.
- **2026-07-28 (three dependencies added)** — `expo-haptics` and
  `expo-notifications` are unavoidable for their features. `react-native-reanimated`
  is added for one specific reason: the splash's stroke-dash arch reveal.
  `strokeDashoffset` is not native-driver-able, so under RN's built-in `Animated`
  it would cost a frame of bridge traffic per tick — the exact low-end Android
  failure the sprint is trying to avoid. Every other beat in the motion brief
  (fade, translate, rotate, scale, cross-fade) runs natively without it.
- **2026-07-28 (settings screen: stack route, not a sixth tab)** — Three
  workstreams need a settings surface and none existed. Placed on a stack route
  behind a Home header icon. Why: five tabs already, and Hindi labels are wide
  at 360dp — a sixth would crowd the primary navigation for the target device.
- **2026-07-15 (auth: guest-first, OTP, channel-agnostic)** — The onboarding
  spec deferred "does auth come before or after the questionnaire" to build
  time; owner decided **after the plan-ready celebration**, and skippable.
  Why: the user sees what they get before being asked for anything; lowest
  drop-off, matching the Leap/F&B reference flow. Consequence: answers live in
  AsyncStorage during the questionnaire and are flushed to
  profiles + questionnaire_responses + user_plans the moment a session exists
  (`flushOnboarding`), so a guest loses nothing by signing in late — and a
  failed flush keeps the answers on disk for a retry.
  **Channel: phone OTP is the v1 target** (a Hindi-first mass-market audience
  has a phone habit, not an email habit) **but development runs on email OTP**
  behind a single `AUTH_CHANNEL` constant. Why: Supabase cannot send an SMS
  until a paid provider (MSG91/Twilio) is connected — and MSG91 needs Indian
  DLT sender-ID registration, which takes days. Building channel-agnostic keeps
  auth off that critical path at zero rework: the screens are identical.
  Guests keep full access to workouts, meditation, jap and sleep — only
  streaks and My Workouts need an account (core worship is never gated).
- **2026-07-15 (jap/sleep ship as content-driven surfaces)** — Owner: ship the
  jap and sleep tabs now with 2–3 placeholder items that "just update" when
  content is added. Implemented as thin DB-driven lists (`mantras` deity-first,
  `sounds` where kind='sleep') with an honest empty state; publishing a row in
  the admin panel fills the tab with no code change and no release. Why: it
  respects the programs-platform rule, puts the content team's work on the
  clock, and avoids a fake-content demo. Specs written (docs/specs/jap.md,
  sleep.md) — session players (mala counter, sleep timer) are the next layer.
- **2026-07-15 (APK: no RECORD_AUDIO)** — `expo-audio` defaults
  `recordAudioAndroid: true`, which would have shipped a microphone permission
  the app never uses (it only ever plays; there is no recorder API anywhere in
  the codebase). Set to false; verified against the resolved prebuild config —
  background-playback permissions (FOREGROUND_SERVICE +
  FOREGROUND_SERVICE_MEDIA_PLAYBACK) are kept. Why: an unused microphone
  permission on a **Health & Fitness** listing is a needless Data-safety
  declaration and a review risk. Also installed `expo-splash-screen` and moved
  the splash config into its plugin: the legacy `expo.splash` block was inert
  (nothing consumed it), so the APK would have shown a bare colour.
- **2026-07-16 (AI custom diet plan — owner override + admin unlock)** — Owner
  explicitly lifted the "no AI plan generation" v1 rule for the **diet
  custom-plan feature only**. New Diet tab: a short questionnaire
  (height/weight/region/goal/diet/activity) inserts a `diet_plan_requests`
  row and calls an external **n8n** workflow, which asks **Anthropic Claude**
  for a structured plan and writes it back to the row via the Supabase
  service-role key; the app polls the row and renders the plan. Why (owner):
  a personalised plan is a stronger habit hook than templates alone, and n8n
  keeps the AI/keys off both the app and our servers. Security: app holds only
  the webhook URL + a shared secret; the service-role and Anthropic keys live
  only in n8n; `diet_plan_requests` RLS is read+insert-own (no client update),
  so a user can't forge their plan. Scope guard: override does NOT extend to
  onboarding or any other plan surface — those stay rule-based. Delivered:
  migration 0010 (`diet_plan_requests` + profile fields
  height_cm/weight_kg/region/body_focus/days_per_week), `n8n/diet-plan-workflow.json`
  + `docs/n8n-diet-setup.md`, `docs/specs/diet-custom-plan.md`. Also this
  session: **admin Meals + Mantras** unlocked (CRUD over existing tables), and
  the **full onboarding questionnaire** built (was language-only).
  **REQUIRED follow-up before launch:** new AI processor (Anthropic) + new
  health data (ht/wt/region) must be added to legal/THIRD_PARTY_PROCESSORS.md,
  legal/DATA_INVENTORY.md, the privacy policy, and Play Data Safety. Also:
  user-owned diet requests need app auth to function (staged, like the rest of
  the app).

- **2026-07-16 (video uploads: direct-to-Bunny via TUS)** — Video uploads in
  the admin panel now go **browser → Bunny Stream directly** over TUS
  (resumable upload), instead of proxying the binary through our Next.js
  route handler. Why: Vercel serverless functions cap request bodies at
  **4.5MB**; the old flow (`/api/upload` PUTting the whole file to Bunny
  from inside the function) worked locally but silently failed on the
  deployed admin panel for any real demo video, while small photos passed
  through fine — that's how the bug was first noticed. The panel server
  still creates the Bunny video object and mints a short-lived,
  single-video signature (`/api/upload/video-auth`); the browser uses that
  signature to upload directly, then calls `/api/upload/finalize` to write
  the `media` row. The raw `BUNNY_STREAM_API_KEY` never reaches the
  browser — only the derived, time-limited signature does — so this
  preserves the 2026-07-13 "server-side key never touches the browser"
  rule. Audio/image uploads are unchanged (still proxied through the
  server) since they're small enough today.
  **Known follow-up, deliberately not fixed here**: audio has the same
  latent 4.5MB ceiling — `docs/research/media-hosting.md` estimates ~28MB
  for a 60-min ambient/sleep track, which will fail the same way once a
  real long-form track is uploaded. Bunny Storage has no TUS/scoped-token
  equivalent to Stream, so that fix needs a different mechanism and its
  own scoped change — revisit before uploading long sleep/meditation audio.

- **2026-07-12** — Scope pivot: from "Bajrangvati companion app for product
  buyers" to **"Fit Hindu"** (working name), a standalone devotional-fitness
  app for Hindu India — workouts + diet + meditation (timer/sounds) + per-deity
  mantra jap (Hanuman/Ram/Shiv/Krishna) + sleep sounds + devotional layer, with
  devotional content series planned later. Why: devotion is India's strongest
  daily-habit anchor (Sri Mandir/Kuku data); a standalone app acquires a much
  larger Hindu audience than a buyer-gated companion, while Herbal Deck products
  cross-sell inside. Programs-platform architecture unchanged (now product- and
  deity-agnostic). idea.md rewritten to v1. Name/trademark availability pending.
- **2026-07-15 (workout v2 — reference-app model)** — Owner benchmarked
  Fitness & Bodybuilding (VGFIT/Softin), Home Workout (Leap), and Lifty;
  adopted: F&B structure (muscle-group library ≙ body_areas, goal plans ≙
  programs, **"My Workouts" user builder** → migration 0009 user_workouts +
  items, per-session sets/reps/weight **journal** → activity_log.meta) +
  Leap execution flow (**guided session player**: set tracking, rest screens
  with +20s/skip/next-up, auto-advance, completion stats). Onboarding
  question set v2 (goal → body-focus multi → level → days/week) in the same
  style; language stays Q1, deity optional, DPDP consent explicit.
  Deliberate deviations: no user-uploaded exercise media (brand-quality
  content only), no aggressive paywall, reliable item ordering (positions
  rewritten 1..n — the reference app's ordering is buggy).
- **2026-07-14 (premium pass + audit)** — No emoji as UI iconography: a
  proper SVG icon set (src/ui/icons.tsx, ported from the approved mockup
  paths) + AvatarTile placeholder component (ember gradient, silhouette,
  gold play badge) + gold-gradient primary buttons. Why: emoji render
  inconsistently across Android OEM fonts and read as cheap/AI-generated
  (owner feedback). Workout tab restructured: admin-COMPOSED workout
  templates are the primary surface (Home/Gym), exercise library below —
  the admin Compose area now directly drives the app. Audit fix: migration
  0008 makes sounds.audio_media_id nullable (admin "New sound" previously
  violated NOT NULL — placeholder-first flow requires nullable media FKs).
- **2026-07-13 (content model: library + composed sessions)** — Exercises and
  audio tracks are standalone, reusable **library objects**; workouts and
  sound sessions are ordered **compositions** referencing library objects via
  join tables — never duplicated copies. Editing a library object (e.g. a
  better avatar video) updates it everywhere it's referenced. Admin panel gets
  two clearly separate areas: **"Library"** (add/edit atomic content — the
  fitness lead's primary workspace) and **"Compose"** (assemble library items
  into workouts/sessions with drag-reorder). The v1 user flow "select body
  area → see exercises" pulls straight from the library filtered by
  body_area; composed multi-exercise Workouts follow once the library fills.
  *Mapping to shipped schema:* audio_tracks ≈ `sounds`, workouts ≈
  `workout_templates`, workout_items ≈ `workout_template_exercises` (already
  join-table shaped, already enforce the reuse rule). **Composed sound
  sessions** (`sound_sessions` + items with optional pause_after_seconds) are
  a small additive migration when that feature ships — nothing to rework.
- **2026-07-13 (admin upload flow)** — Content upload is "upload into the
  placeholder": admin navigates to the exact slot (e.g. Workouts → Chest →
  "Incline Pushup"), drags the avatar demo video into the form, the panel
  uploads to **Bunny via its API with a server-side key that never touches
  the browser**, Bunny returns the URL/ID, the panel writes it to that row's
  media reference — one action. Same for audio (Sleep Sounds → "Rain" → MP3).
  **Inline preview player after every upload** so the team instantly verifies
  the right file landed in the right slot. Default language mode is
  **English** until the user picks in onboarding (was: mixed).
- **2026-07-12 (data model)** — v1 schema designed & written (migrations
  0001–0007 + seed): deities/programs are TABLES not enums (admin-extensible,
  platform rule); `media` table is the swappable Bunny layer; `activity_log`
  is append-only with streaks as computed SQL functions (IST); plan engine =
  jsonb `assignment_rules` (priority, first-match); one-active-plan partial
  unique index; workout modes are filters over one GIN-indexed exercise
  library. Templates-only confirmed by owner (AI custom plans later →
  `user_plan_day_overrides` slot-in). All SQL parse-validated via libpg-query.
- **2026-07-12 (product lock)** — Feature set confirmed and spec'd
  (docs/specs/): (a) **language is onboarding question #1** with three display
  modes — Hindi-only / English-only / Mixed (Hindi lead + English caption;
  mixed was too cluttered as the only option); (b) **three workout modes** —
  home (desi bodyweight), gym, custom-by-body-area — all filters over one
  admin-authored **exercise object** library (create + name + upload video in
  admin; plans reference objects, never copy); (c) **sounds are admin-uploaded
  objects** feeding meditation/sleep/jap; (d) **meditation = 3-click flow**
  Start (ॐ autoplays) → sound selector → Next → instructions + 15-min default
  timer → Start → chant visual + ticking timer + completion bell; (e)
  **everything recorded**: per-activity ✓ ticks on home, daily streak,
  per-habit streaks, growing profile/history. **Points (fitness/bhakti),
  milestone rewards (e.g. Bajrangvati discount), friends/leaderboard →
  roadmap, schema-ready via activity_log but not built in v1** (rewards touch
  deferred monetization; social needs privacy/moderation). Design direction
  (black/saffron/gold mockups) approved as app structure.
- **2026-07-12 (owner meeting)** — v1 ships **Google Play only**; iOS/App Store
  deferred. Why: owner call; also removes the Apple D-U-N-S/enrollment delay
  from the critical path. D-U-N-S + Play listing owned by another team member.
- **2026-07-12 (owner meeting)** — Build priority is the **workout section
  first**; exercises demonstrated by an **in-house custom avatar** (company
  asset). Owner/team supplies exercise videos + audio (meditation sounds,
  chants, sleep sounds) + content; build owner authors the exercise/template/
  plan structure, content team fills it via the admin panel.
- **2026-07-12 (owner meeting)** — Lean **hard into Hindu devotional identity**
  in v1 (owner's own direction) as the emotional hook; still bounded by the
  public-copy fence-line (cultural, not politically partisan). Data: owner
  green-lights maximal use of all app-collected data for the company's benefit,
  bounded by DPDP-disclosed consent + Play Data Safety. Monetization confirmed
  out of v1 (audience first).
- **2026-07-12** — Monetization deferred: v1 sells/gates nothing. Product
  cross-sell is a *candidate, not confirmed*. Revenue surfaces (esp. a
  Cult.fit-style sliding promo banner for own products and/or third-party
  sponsors) come later — but build the banner as a generic admin-driven slot
  (image + link + schedule + targeting), product/sponsor-agnostic, so it's
  content work later, not a rebuild. Why: v1's job is audience + habit;
  keep options open without over-committing or spending devotional-app trust.
- **2026-07-12** — Public copy stays devotional/cultural, not politically
  partisan; political-emotion targeting lives in ad campaigns + internal
  strategy only. Why: overtly political framing risks Apple/Google rejection
  and Indian ad-law scrutiny; protects the launch.
- **2026-07-10** — Programs-platform architecture: nothing hardcodes
  Bajrangvati; it is program #1. Why: enables every future product + possible
  white-label without a rebuild (see docs/idea.md "Beyond Bajrangvati").
- **2026-07-10** — v1 plan engine is rule-based (questionnaire → team-authored
  templates), no AI generation. Why: predictable, safe for health content,
  shippable in the office window.
- **2026-07-10** — Stack: Expo + TypeScript + Supabase; Next.js admin panel;
  Android-first. Why: reuses portal knowledge, one codebase, OTA updates for
  post-office fixes.
