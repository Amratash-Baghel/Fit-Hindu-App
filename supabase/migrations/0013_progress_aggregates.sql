-- 0013 — progress aggregates for the Progress screen and the plan / body-area
-- progress bars. Spec: docs/specs/feature-sprint.md (slice 6).
--
-- Additive only: three read functions, no table or policy is touched. Nothing
-- here can fail against existing data, and reverting is a `drop function`.
--
-- Why functions rather than client-side aggregation: the spec's rule is
-- "aggregate reads via views or RPCs, not by pulling raw rows to the client".
-- The body-area breakdown in particular joins every exercise_log row of a
-- user's history against `exercises` and unnests an array — on a mid-range
-- Android phone over 2G, shipping those rows to the device to count them is
-- exactly the failure this rule exists to prevent.
--
-- SECURITY, the same contract as streak_state() in 0012: every function here is
-- `stable` and deliberately NOT `security definer`, so the caller's RLS applies
-- inside. workout_sessions / exercise_logs are own-row, so passing somebody
-- else's uid returns no rows and therefore zeroes — there is no path to read
-- another user's history through these.

-- ---------- headline numbers ----------
-- One round-trip for the top of the Progress screen.
--
-- "Week" is the ROLLING last 7 days (ist_today() - 6 .. ist_today()), not a
-- calendar week starting Monday. Two reasons: it matches the 7-day activity
-- strip rendered directly beneath it, so the two cannot disagree; and a
-- calendar week makes "sessions this week" collapse to near-zero every Monday
-- morning, which reads as punishment for the exact user who is doing well.
--
-- Counts COMPLETED sessions only. An abandoned session is real history but it
-- is not an achievement, and counting it would let force-quitting inflate the
-- numbers.
create or replace function progress_summary(uid uuid)
returns table (
  sessions_total int,
  sessions_week int,
  minutes_total int,
  minutes_week int,
  sets_total int,
  -- Distinct days trained. Deliberately NOT the streak (that lives in
  -- streak_state and counts ALL activity types, not just workouts).
  active_days int
)
language sql
stable
as $$
  select
    count(*)::int,
    count(*) filter (where ist_date > ist_today() - 7)::int,
    coalesce(sum(minutes), 0)::int,
    coalesce(sum(minutes) filter (where ist_date > ist_today() - 7), 0)::int,
    coalesce(sum(sets_done), 0)::int,
    count(distinct ist_date)::int
  from session_summary
  where user_id = uid
    and status = 'completed';
$$;

-- ---------- per-body-area breakdown ----------
-- Body-area selection is core to onboarding (profiles.body_focus, 0010), so
-- "am I actually training what I said I care about?" is the question this
-- answers.
--
-- An exercise carries an ARRAY of body_areas, and a set counts toward every
-- area it trains — a push-up is chest AND arms. So these counts deliberately
-- sum to MORE than sets_total in progress_summary; they are per-area totals,
-- never a partition of the whole, and the UI must not render them as shares of
-- one pie.
--
-- Skipped sets are excluded: the row exists so the offline queue and the
-- session player can tell "skipped" from "never reached", but a skip is not
-- training.
--
-- Note: the join to `exercises` is subject to that table's "published read"
-- policy, so a set logged against an exercise the content team later
-- unpublishes drops out of this breakdown. Acceptable — unpublishing is rare
-- and deliberate — but it is why this is not the source of truth for
-- sets_total above, which counts logs without joining content.
create or replace function body_area_progress(uid uuid)
returns table (
  area body_area,
  sets_done int,
  last_done date
)
language sql
stable
as $$
  select
    a.area,
    count(*)::int,
    max(s.ist_date)
  from workout_sessions s
  join exercise_logs l on l.session_id = s.id
  join exercises e on e.id = l.exercise_id
  cross join lateral unnest(e.body_areas) as a(area)
  where s.user_id = uid
    and s.status = 'completed'
    and not l.skipped
  group by a.area
  order by count(*) desc, a.area;
$$;

-- ---------- plan progress ----------
-- Days completed against the length of the assigned program.
--
-- Returns ZERO ROWS when the user has no active plan. That is a real, common
-- state, not an error: the rules engine deliberately leaves some users
-- unmatched (plan.ts returns null by design), and the plan-ready ceremony from
-- slice 5 already has a screen for it. The client renders no plan bar at all
-- rather than a 0/0 one.
--
-- days_done counts DISTINCT training days since the plan started, not sessions:
-- two workouts in one day is one day of the plan, and the plan bar must never
-- run ahead of the calendar. It is not capped at duration_days — a user who
-- keeps going past the end of a program should see that, and the UI clamps the
-- bar width rather than the truth.
create or replace function plan_progress(uid uuid)
returns table (
  program_id uuid,
  duration_days int,
  days_done int,
  started_on date
)
language sql
stable
as $$
  select
    p.id,
    p.duration_days,
    (select count(distinct s.ist_date)
       from workout_sessions s
      where s.user_id = uid
        and s.status = 'completed'
        and s.ist_date >= up.started_on)::int,
    up.started_on
  from user_plans up
  join programs p on p.id = up.program_id
  where up.user_id = uid
    and up.status = 'active'
  -- user_plans_one_active_idx already guarantees at most one; the limit is
  -- belt-and-braces so this can never return two rows to a single-row client.
  limit 1;
$$;
