-- 0012 — retrofit activity_log (program_id, client_event_id) and rewrite the
-- streak for freeze days. Spec: docs/specs/feature-sprint.md (slice 1).
--
-- Separate from 0011 because everything here alters a table that is already
-- applied and seeded. Keeping it apart means a failure rolls back the risky
-- half without taking the new tables with it.
--
-- RUN THIS BEFORE LAUNCH. It costs two full-table passes over activity_log
-- back to back — the correlated backfill below, then a rewrite for
-- client_event_id's volatile default, which holds ACCESS EXCLUSIVE and blocks
-- every read and write to the retention spine for its duration. Harmless now
-- (pre-launch, the table is effectively empty); it would be a visible outage
-- against real volume. Any future retrofit of this table wants a batched
-- backfill and a nullable-then-constrain split instead of this shape.

-- ---------- program scoping ----------
-- activity_log predates the programs-platform rule and carried no program_id,
-- which made per-program progress impossible to compute.
--
-- NULLABLE, permanently — owner decision 2026-07-28. Null means "not
-- attributable to a program", which is a real and common state, not a
-- migration artefact:
--   * jap / meditation / sleep_sound / devotional are standalone tabs open to
--     everyone (2026-07-15: core worship is never gated),
--   * the rules engine leaves some users with no plan at all — there is one
--     seeded rule and it matches workout_mode='home', so a gym user matches
--     nothing and plan.ts:38 returns null by design,
--   * guest activity replayed on sign-in predates any plan assignment.
-- A NOT NULL here would have forced a fake program onto those rows, or made
-- logging fail for the most common devotional actions.
alter table activity_log add column program_id uuid references programs (id);

-- Best-effort backfill: attribute each row to whichever plan was running for
-- that user on that date. Rows with no matching plan stay null, per above.
update activity_log a
set program_id = (
  select up.program_id
  from user_plans up
  where up.user_id = a.user_id
    and up.started_on <= a.ist_date
  order by up.started_on desc
  limit 1
)
where a.program_id is null;

create index activity_log_program_idx
  on activity_log (user_id, program_id, ist_date desc)
  where program_id is not null;

-- ---------- idempotent replay ----------
-- Guest-merge and offline-queue dedup, enforced by the database rather than by
-- app-level checking (owner decision 2026-07-28).
--
-- The key is the EVENT, not the day. A day key -- (user_id, program_id,
-- ist_date) -- was considered and rejected: it permits only one activity row
-- per user per day, which would break the daily_activity view (0006:51-59
-- aggregates array_agg(distinct activity_type) and count(*)), break
-- current_streak_for()'s per-habit walk, and stop a user logging a workout AND
-- a meditation on the same day.
--
-- Adding a NOT NULL column with a VOLATILE default is safe here: Postgres
-- cannot use the fast-default path for a volatile expression, so it rewrites
-- the table and evaluates gen_random_uuid() per row. Every existing row gets a
-- distinct value and the unique index below is satisfiable.
alter table activity_log
  add column client_event_id uuid not null default gen_random_uuid();

alter table activity_log
  add constraint activity_log_client_event_uniq unique (user_id, client_event_id);

-- Replay contract for src/lib/activity.ts:
--   insert into activity_log (…, client_event_id) values (…)
--   on conflict (user_id, client_event_id) do nothing;

-- activity_log remains APPEND-ONLY: no update or delete policy is added here,
-- and none may be added later. The zero-backfill guarantee that the streak and
-- the future points ledger rest on depends on rows never changing.
--
-- The daily_activity view is deliberately left alone. Adding program_id would
-- change its shape and break its two existing consumers (src/types/db.ts:255,
-- admin/lib/db.ts:243); per-program aggregates belong in their own view when
-- slice 6 knows what the progress screen actually needs.

-- ---------- streak, with freeze days ----------
-- Rules (docs/decisions.md 2026-07-28):
--   * boundary Asia/Kolkata (ist_today(), unchanged from 0001)
--   * a day counts on >=1 core activity of any type
--   * ONE freeze per rolling 7 days, auto-applied: a single missing day is
--     bridged and does NOT increment the count; the streak survives
--   * two consecutive missing days always break the streak
--   * user-level, not program-scoped (owner decision 2026-07-28) — filtering by
--     program_id would exclude the null rows above and show a permanent zero to
--     any user doing only devotional activity
--   * idempotent for free: this walks DISTINCT ist_date, so logging twice in
--     one day cannot count twice
--
-- Not security definer, so activity_log's RLS applies to the caller: asking for
-- another user's streak returns no rows and therefore zero.
create or replace function streak_state(uid uuid)
returns table (
  current_streak int,
  longest_streak int,
  last_date date,
  at_risk boolean,
  -- Freezes spent inside the CURRENT run. Slice 4 needs this for the gentle
  -- recovery line ("a forgiveness day kept your sankalp") that the 2026-07-28
  -- streak-rules decision promises; without it the UI cannot tell a clean run
  -- from a rescued one, and adding it later would cost another migration.
  freezes_used int
)
language plpgsql
stable
as $$
declare
  days date[];
  n int;
  i int;
  run int;
  best int := 0;
  first_run int := 0;      -- 0 = not yet closed; a real run is always >= 1
  frz int := 0;            -- freezes spent in the run being walked
  first_frz int := -1;     -- -1 = not yet closed (0 is a real answer)
  expected date;           -- the date the walk wants to see next, going back
  last_freeze date;        -- date bridged by the most recent freeze in this run
  today date := ist_today();
begin
  select array_agg(distinct ist_date order by ist_date desc)
    into days
    from activity_log
   where user_id = uid;

  if days is null then
    return query select 0, 0, null::date, false, 0;
    return;
  end if;

  n := array_length(days, 1);
  i := 1;
  run := 1;
  expected := days[1] - 1;

  while i < n loop
    i := i + 1;

    if days[i] = expected then
      -- contiguous
      run := run + 1;
      expected := days[i] - 1;

    elsif expected - days[i] = 1
          and (last_freeze is null or last_freeze - expected >= 7) then
      -- exactly one missing day (`expected`), and no freeze spent in the last
      -- 7 days of this walk. Bridge it: the frozen day itself does not count,
      -- but days[i] is real activity and does.
      last_freeze := expected;
      frz := frz + 1;
      run := run + 1;
      expected := days[i] - 1;

    else
      -- gap of 2+ days, or a second freeze too soon: this run ends
      if run > best then best := run; end if;
      if first_run = 0 then first_run := run; end if;
      if first_frz = -1 then first_frz := frz; end if;
      run := 1;
      frz := 0;
      expected := days[i] - 1;
      last_freeze := null;   -- freeze budget is per run
    end if;
  end loop;

  if run > best then best := run; end if;
  if first_run = 0 then first_run := run; end if;
  if first_frz = -1 then first_frz := frz; end if;

  return query select
    -- The streak is only "current" if it reaches today or yesterday; today
    -- isn't over, so yesterday still counts as alive.
    case when days[1] = today or days[1] = today - 1 then first_run else 0 end,
    best,
    days[1],
    -- completed yesterday, nothing today: the nudge push (slice 7) reads this
    days[1] = today - 1,
    case when days[1] = today or days[1] = today - 1 then first_frz else 0 end;
end;
$$;

-- Kept for call-site compatibility; now freeze-aware by delegation.
create or replace function current_streak(uid uuid)
returns int
language sql
stable
as $$
  select s.current_streak from streak_state(uid) s;
$$;

-- current_streak_for() is deliberately NOT freeze-aware and is left as written
-- in 0006. The forgiveness day belongs to the daily sankalp; applying it
-- independently to every per-habit counter would forgive one missed day three
-- or four times over and make the profile's habit streaks read as more
-- consistent than the user actually was.
