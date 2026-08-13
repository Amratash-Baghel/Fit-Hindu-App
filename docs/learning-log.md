# Learning Log

One entry per shipped feature (SOP §5): the concept, explained plainly, with
the real file/line from this project where it lives. Re-read yesterday's
entry each morning; weekly quiz on Fridays.

Format:
- **date — concept** (feature it came from)
  What it is, why this project needs it, where to see it in our code.

<!-- entries added at each /ship, newest on top -->

- **2026-08-12 — one shared context instead of two hooks fetching the same
  thing** (BMS redesign: rings + tab-bar done-dots)
  Home's three rings and the tab bar's gold done-dots show the SAME fact —
  "which pillars are done today". If each surface called its own
  `usePillars()` hook (the old shape), the app would fire two identical
  Supabase reads and, worse, they could disagree for a moment: ring lit, dot
  not. The fix is React **context**: `PillarsProvider`
  ([src/lib/pillars.ts](../src/lib/pillars.ts)) wraps the whole tab group in
  `app/(tabs)/_layout.tsx`, does the fetch ONCE, and every `usePillars()`
  under it just reads the shared value. One network read, one truth, zero
  drift — and a screen rendered outside the provider degrades to guest zeros
  instead of crashing (the hook returns a fallback rather than throwing).
  *Check yourself:* the Settings screen is a stack route OUTSIDE the tab
  group — if it called `usePillars()` today, what would it see, and why is
  that a design choice rather than a bug?

- **2026-08-10 — deriving a per-event delta from a total you don't own**
  (Fit-Points reward popup)
  The reward says "you earned +10 फिट अंक" for one jap mala — but the app never
  computes points. The server does (`points_summary`, migration 0020), and only
  as a **running total**, with the daily caps and jap's per-round math baked
  into SQL. So how do you show what ONE activity added? You don't ask "what did
  this earn" — there is no such number to fetch. You **diff the total across the
  event**: read the today-total *before* the write, read it again *after*, and
  the difference is that activity's honest contribution. This is why a 2nd
  workout the same day correctly shows **+0** ("already claimed") instead of a
  fake +25 — the cap was already in the total, so the subtraction yields zero,
  with *no* rule logic duplicated on the client. The subtlety the diff forces
  into the open: the "after" read only means anything once the write has
  actually landed, so the diff is gated on the write's success — see `earnSince`
  in [src/lib/points.ts](../src/lib/points.ts) and its use in
  [app/(tabs)/jap.tsx](../app/(tabs)/jap.tsx) (`before → log → earnSince(ok ?
  before : null)`). Same shape as a bank statement: you learn a single
  transaction's amount from the balance before and after, not from the bank
  telling you the line item.

- **2026-08-06 — the first-render race: sync vs async state** (UI motion pass)
  Our animation gate `useMotion()` must answer one question before a component
  animates: "should motion play?" — false on web and when the OS reduce-motion
  setting is on. The first version read that setting **asynchronously**
  (`AccessibilityInfo.isReduceMotionEnabled()` returns a Promise), defaulting to
  "yes, animate" until the answer arrived. The trap: one-shot components like
  `Reveal` (every screen's entrance) and `CelebrationBurst` (the completion
  sparks) fire their animation in their **very first effect** — which runs
  *before* an async Promise can resolve. So a reduce-motion user got the full
  animation every time, then the corrected `false` arrived too late to matter.
  The bug is that the value wasn't ready at the one instant it was read. The fix
  in [src/ui/motion.ts](../src/ui/motion.ts) is Reanimated's `useReducedMotion()`,
  which reads a value Reanimated caches at startup and returns it **synchronously**
  on the first render — so the gate is correct before anything animates. Lesson:
  when a decision must be made on the first render, an async source is a race, not
  a delay; you need the value synchronously or you must cancel/undo what the
  stale value started. (A code review caught this — see docs/progress.md 2026-08-06.)
  *Check yourself:* `Shimmer` and `AnimatedNumber` did NOT have this bug even with
  the old async gate. What did their effects do that `Reveal`'s didn't, that let
  them recover when the corrected value finally arrived?

- **2026-08-05 — a timestamp you can trust vs. one you can't: heartbeat, not
  wall-clock** (sleep-run recovery)
  We want to recover a sleep-listening session that Android killed before the
  app could write it. The mirror stores `startedAtMs`. The tempting reconcile is
  `actual_min = (Date.now() − startedAtMs)` on next launch — but "now" at launch
  might be 8 hours after the user locked their phone, and the audio stopped when
  the process died, not when they reopened the app. That formula would credit an
  8-hour "listen" and mint points for a killed app. The fix is a **heartbeat**:
  while the screen ticks, we bump a `lastAliveMs` stamp every 30 s; at reconcile
  `actual_min = lastAliveMs − startedAtMs`, capped at the chosen timer. That span
  is the last moment we can *prove* JS was alive and playing — a real lower
  bound, not a guess. The deeper lesson: JS does not run in the background, so
  any duration you compute from a foreground clock at an arbitrary later moment
  is fiction; only a value you persisted *while you were actually running*
  measures anything. The residual cost is honest — if the user locks the phone
  the instant playback starts, the heartbeat never advances and the run
  reconciles to ~0 and is dropped; measuring true background playback needs a
  native audio-session module, which we don't have. Live in
  [src/lib/sleepRun.ts](../src/lib/sleepRun.ts) (`markSleepAlive` +
  `reconcileSleepRun`).
  *Check yourself:* the reconcile also does `min(aliveMin, timerMinutes)` when a
  timer is set. Give a concrete case where the raw heartbeat span would exceed
  the timer, and say why capping it is the honest number.

- **2026-08-05 — a column DEFAULT is not a constraint; RLS `with check` is** (Fit Points)
  `daily_checkins.ist_date` was declared `default ist_today()`, and the PK is
  `(user_id, ist_date)`, so it *looked* like "one app-open bonus per real day".
  It wasn't. A DEFAULT only fills the column when the client **omits** it — our
  own `checkIn()` omits it, so in the app it always meant today. But Supabase
  exposes every table over REST with the anon key, and a hostile client can POST
  `ist_date` explicitly. Each forged date is a new row (own `user_id`, unique PK
  per date) that satisfies the insert policy `with check (user_id = auth.uid())`,
  so a loop over thousands of fake dates mints the bonus — and, worse, the same
  hole on `activity_log` mints full-value workout/jap/sleep points, because
  `points_daily` scores per `ist_date`. The fix isn't a CHECK constraint (those
  must be IMMUTABLE, and `ist_today()` is only STABLE, so Postgres rejects it) —
  it's the **RLS `with check`**, which may call stable/volatile functions:
  `with check (user_id = auth.uid() and ist_date = ist_today())`. The lesson: a
  DEFAULT is a convenience for honest callers; the security boundary is the RLS
  predicate, and anything a client can send it can forge. Live in
  [supabase/migrations/0020_points_engine.sql](../supabase/migrations/0020_points_engine.sql)
  (the `daily_checkins` insert policy + the `activity_log` insert-policy
  tightening right below it).
  *Check yourself:* our `activity_log` bound is `ist_date between ist_today()-1
  and ist_today()`, not `= ist_today()` like the check-in. Why is one day of
  slack correct for activity logs but wrong for the app-open bonus?

- **2026-08-03 — `maxLength` truncates BEFORE your onChange normalizer runs** (phone auth)
  Our phone field normalizes whatever the user enters down to 10 local digits:
  paste `+919109386355`, and `normalizeLocal` is supposed to strip the `91`
  country code and keep `9109386355`. It didn't — because the `<TextInput>` also
  had `maxLength={10}`. On both native RN and react-native-web, `maxLength` is
  enforced on the raw text buffer by the platform *before* your `onChangeText`
  handler ever sees the string. So a 12-char paste was chopped to its **first**
  10 raw characters (`9191093863`) and only *then* handed to our normalizer,
  which saw an already-10-digit string, did nothing, and — worst part — it passed
  the `/^[6-9][0-9]{9}$/` typo-check, so the app silently tried to sign in a
  **wrong but plausible** number with no error shown. The lesson: a length cap
  and a transform on the same input fight each other; if you normalize in
  `onChangeText`, the normalizer must be the *only* gate, and the field's own
  value (already normalized, so never >10) enforces the cap. Fix removed
  `maxLength` and taught `normalizeLocal` to drop a leading `91` from a 12-digit
  string. Live in [app/auth/index.tsx](../app/auth/index.tsx) (`normalizeLocal`
  + the `maxLength`-free `TextInput`). Same class of bug as trimming a string in
  a controlled input while `maxLength` also clips it — two clamps, silent
  disagreement.
  *Check yourself:* a user pastes `98765 43210` (with a space) into the field.
  Walk through what `normalizeLocal` returns and whether it's accepted — and say
  why the space doesn't break it.

- **2026-08-03 — RN style arrays merge left-to-right (last wins)** (color fix)
  In React Native, `style={[a, b, c]}` is resolved by flattening the array in
  order, so keys in `c` overwrite the same keys in `a` and `b`. This is exactly
  CSS's "later declaration wins" but positional: whoever is *further right in the
  array* takes precedence, no specificity involved. Our `T` component builds
  `[type[variant], style, { color: tones[tone] }]`-style arrays, and one refactor
  (B2, `a42d45f`) quietly moved the default `{ color: tones[tone] }` to the last
  slot. From then on, a screen that said `<T style={{ color: "#241503" }}>` was
  overruled by the default `tone="cream"` sitting to its right — every gold
  button's text went white, on device only (the same color path, but nobody
  noticed until a device screenshot). The fix flips the order so the default sits
  FIRST and the caller's `style` (carrying its color) sits last and wins. Live in
  [src/ui/Text.tsx](../src/ui/Text.tsx) line ~65 — the `style={[{ color:
  tones[tone] }, withLineHeadroom([type[variant], style])]}` array. The trap to
  remember: folding a caller's `style` *inside* a helper call doesn't change its
  position relative to a sibling object placed after that helper — the sibling
  still wins.
  *Check yourself:* given `style={[{ color: "red" }, { color: "blue" }, someVar]}`
  where `someVar` is `undefined`, what color renders, and why doesn't the
  `undefined` blank it out?

- **2026-08-03 — Generation counter (cancelling stale async work)** (audio fix)
  When an `async` function `await`s partway through, the world can change
  underneath it — another call may start, or the user may hit "stop" — and when
  it resumes it happily finishes work that is now wrong. Our `playLoop` awaited
  the audio-mode switch *before* creating the player, so a second tap (or a
  `stopAudio`) landing during that await could leave the resumed first call
  creating a player that nobody can reach: it loops forever, past the stop. The
  fix is a monotonic counter: each call does `const myGen = ++gen` on entry, and
  after every await checks `if (myGen !== gen) return`. Anything that should
  cancel in-flight work — a newer `playLoop`, `stopAudio`, `pauseAudio` — just
  bumps `gen`, and the stale call detects it's been superseded and bails before
  touching shared state. Live in
  [src/lib/audio.ts](../src/lib/audio.ts) (`gen`, the guard in `playLoop`, the
  bumps in `stopAudio`/`pauseAudio`). Same idea as an AbortController, or the
  "ignore" flag people put in `useEffect` cleanups to drop a stale fetch.
  *Check yourself:* if `stopAudio` did NOT bump `gen`, describe the exact
  sequence of taps that leaves a sound looping after the user pressed stop.

- **2026-07-15 — State machine** (workout session player)
  A state machine is code organized around "which mode am I in, and what
  moves me to the next mode" instead of a pile of if-statements. Our player
  has exactly three states — `work` → `rest` → `done` — held in one variable
  (`phase` in [app/workout/session.tsx](../app/workout/session.tsx)), and
  only two events move it: "set finished" and "rest finished". Everything
  the screen shows is derived from the current state, so the UI can never
  show a half-rest-half-exercise mess: illegal combinations simply cannot
  be represented. This is the same pattern behind traffic lights, vending
  machines, and most game loops.
  *Check yourself:* in our player, what are the only two ways to leave the
  `rest` state — and why is "+20 sec" NOT one of them?

- **2026-07-15 — Row-Level Security with a subquery** (My Workouts)
  For `user_workouts` the rule is easy: `user_id = auth.uid()`. But
  `user_workout_items` has NO user_id column — an item belongs to a user
  only through its parent workout. So its RLS policy asks Postgres:
  "does a row in user_workouts exist with this workout_id AND my uid?"
  (`exists (select 1 from user_workouts w …)` in
  [supabase/migrations/0009_user_workouts.sql](../supabase/migrations/0009_user_workouts.sql)).
  Security follows the foreign key, so ownership lives in exactly one
  place — you can never make an item more visible than its parent.
  *Check yourself:* if we someday let users SHARE a workout with a friend,
  which table's policies change — user_workouts, user_workout_items, or
  both?
