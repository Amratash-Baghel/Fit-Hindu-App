# Learning Log

One entry per shipped feature (SOP §5): the concept, explained plainly, with
the real file/line from this project where it lives. Re-read yesterday's
entry each morning; weekly quiz on Fridays.

Format:
- **date — concept** (feature it came from)
  What it is, why this project needs it, where to see it in our code.

<!-- entries added at each /ship, newest on top -->

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
