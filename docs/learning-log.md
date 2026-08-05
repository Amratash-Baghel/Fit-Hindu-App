# Learning Log

One entry per shipped feature (SOP §5): the concept, explained plainly, with
the real file/line from this project where it lives. Re-read yesterday's
entry each morning; weekly quiz on Fridays.

Format:
- **date — concept** (feature it came from)
  What it is, why this project needs it, where to see it in our code.

<!-- entries added at each /ship, newest on top -->

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
