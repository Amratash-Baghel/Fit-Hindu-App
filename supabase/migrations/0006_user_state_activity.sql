-- 0006 — user state + the activity log (the retention spine).
-- activity_log is APPEND-ONLY: streaks, ticks, and (later) points/leaderboards
-- are computed layers over it — the roadmap needs zero backfill.

-- ---------- user plans ----------
create table user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references programs (id),
  started_on date not null default ist_today(),
  status plan_status not null default 'active',
  created_at timestamptz not null default now()
);

-- exactly one active plan per user
create unique index user_plans_one_active_idx
  on user_plans (user_id) where (status = 'active');

alter table user_plans enable row level security;
create policy "user_plans: read own" on user_plans for select using (user_id = auth.uid());
create policy "user_plans: insert own" on user_plans for insert with check (user_id = auth.uid());
create policy "user_plans: update own" on user_plans for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- activity log ----------
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_type activity_type not null,
  ref_id uuid,                               -- the object involved (template, sound, mantra…)
  ist_date date not null default ist_today(),
  occurred_at timestamptz not null default now(),
  -- meta examples:
  --   meditation: {"sound_id": "...", "set_min": 15, "actual_min": 12}
  --   jap:        {"mantra_id": "...", "count": 108}
  --   workout:    {"template_id": "..."}
  --   meal:       {"meal_time": "breakfast"}
  meta jsonb not null default '{}'::jsonb
);

create index activity_log_user_date_idx on activity_log (user_id, ist_date desc);

alter table activity_log enable row level security;
-- append-only: select + insert own; no update/delete policies at all
create policy "activity: read own" on activity_log for select using (user_id = auth.uid());
create policy "activity: insert own" on activity_log for insert with check (user_id = auth.uid());

-- ---------- computed layers ----------
-- One row per user-day with the set of activity types done — powers the home
-- ticks in a single query. security_invoker so RLS applies to the caller.
create view daily_activity
with (security_invoker = true) as
select
  user_id,
  ist_date,
  array_agg(distinct activity_type) as types,
  count(*) as entries
from activity_log
group by user_id, ist_date;

-- Current daily streak in IST. A day counts if >=1 activity was logged.
-- The streak is "alive" if today OR yesterday has activity (today isn't over).
-- Note: row_number() is bigint, and there is no `date - bigint` operator, so
-- the rank is cast to int before the date subtraction.
create or replace function current_streak(uid uuid)
returns int
language sql stable
as $$
  with days as (
    select distinct ist_date as d from activity_log where user_id = uid
  ),
  anchor as (
    select case
      when exists (select 1 from days where d = ist_today())     then ist_today()
      when exists (select 1 from days where d = ist_today() - 1) then ist_today() - 1
    end as a
  ),
  numbered as (
    select days.d, (row_number() over (order by days.d desc))::int as rn
    from days, anchor
    where anchor.a is not null and days.d <= anchor.a
  )
  select coalesce(
    (select count(*)::int from numbered, anchor
      where numbered.d = anchor.a - (numbered.rn - 1)),
    0
  );
$$;

-- Per-habit streak (fitness streak, meditation streak, jap streak…): same
-- walk, filtered to one activity type. Profile screen calls this per habit.
create or replace function current_streak_for(uid uuid, a_type activity_type)
returns int
language sql stable
as $$
  with days as (
    select distinct ist_date as d from activity_log
    where user_id = uid and activity_type = a_type
  ),
  anchor as (
    select case
      when exists (select 1 from days where d = ist_today())     then ist_today()
      when exists (select 1 from days where d = ist_today() - 1) then ist_today() - 1
    end as a
  ),
  numbered as (
    select days.d, (row_number() over (order by days.d desc))::int as rn
    from days, anchor
    where anchor.a is not null and days.d <= anchor.a
  )
  select coalesce(
    (select count(*)::int from numbered, anchor
      where numbered.d = anchor.a - (numbered.rn - 1)),
    0
  );
$$;
