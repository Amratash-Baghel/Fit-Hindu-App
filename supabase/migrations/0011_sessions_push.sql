-- 0011 — workout sessions, exercise logs, push tokens, notification prefs.
-- Spec: docs/specs/feature-sprint.md (slice 1). Creates only; 0012 does the
-- alterations to shipped tables, so the risky half stays independently
-- revertible.
--
-- Why sessions exist at all: today the session player holds every set in a
-- useRef and writes ONE activity_log row on completion (app/workout/session.tsx
-- :67,:134). Kill the app at set 9 of 10 and the whole session is gone. These
-- tables let each set land as it happens.
--
-- program_id is nullable on user tables throughout, per the 2026-07-28 owner
-- decision: a workout run from a custom My Workout or a single exercise has no
-- program, and the rules engine deliberately leaves some users with no plan at
-- all (one seeded rule, workout_mode='home' — a gym user matches nothing). The
-- programs-platform rule is satisfied by the column existing and being filtered
-- on, not by forbidding "no program".

-- ---------- enums ----------
-- New types, not new values on existing types, so these are safe to create and
-- use in the same migration (the add-value-then-use split does not apply).

create type session_status as enum ('active', 'completed', 'abandoned');

-- The three sources the session player already supports (loadSession in
-- src/lib/content.ts): a published template, a user's own My Workout, or a
-- single exercise opened directly.
create type session_source as enum ('template', 'custom', 'exercise');

create type device_platform as enum ('android', 'ios', 'web');

-- ---------- workout sessions ----------
create table workout_sessions (
  -- Client-generated so an offline device can write exercise_logs against a
  -- session that has not reached the server yet, and so a retry of the same
  -- session is an upsert rather than a duplicate.
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid references programs (id),
  plan_id uuid references user_plans (id) on delete set null,
  source session_source not null,
  source_ref_id uuid,                    -- template / user_workout / exercise id
  status session_status not null default 'active',
  ist_date date not null default ist_today(),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index workout_sessions_user_date_idx
  on workout_sessions (user_id, ist_date desc);

-- Reconciliation on next launch after an app kill: "did I leave one open?"
create index workout_sessions_active_idx
  on workout_sessions (user_id) where (status = 'active');

alter table workout_sessions enable row level security;
create policy "workout_sessions: read own" on workout_sessions for select
  using (user_id = auth.uid());
create policy "workout_sessions: insert own" on workout_sessions for insert
  with check (user_id = auth.uid());
create policy "workout_sessions: update own" on workout_sessions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workout_sessions: delete own" on workout_sessions for delete
  using (user_id = auth.uid());

-- ---------- exercise logs ----------
-- The primary key IS the offline-dedup key: replaying a queued write is an
-- `on conflict do nothing`, so a flaky connection cannot double-log a set.
--
-- It keys on item_position, NOT exercise_id: a template may legitimately list
-- the same exercise at two positions (circuits, supersets), and keying on the
-- exercise would make the second occurrence collide with the first.
create table exercise_logs (
  session_id uuid not null references workout_sessions (id) on delete cascade,
  item_position int not null,            -- 0-based index within the session
  set_no int not null,                   -- 1-based
  exercise_id uuid not null references exercises (id),
  reps int,
  duration_seconds int,
  weight_kg numeric(5, 2),               -- gym mode; null elsewhere
  skipped boolean not null default false,
  completed_at timestamptz not null default now(),
  primary key (session_id, item_position, set_no)
);

create index exercise_logs_exercise_idx on exercise_logs (exercise_id);

alter table exercise_logs enable row level security;
-- Access rides on owning the parent session (same pattern as user_workout_items
-- in 0009). The subquery re-checks auth.uid() on the parent rather than
-- trusting the join.
create policy "exercise_logs: read own" on exercise_logs for select
  using (exists (select 1 from workout_sessions s
                  where s.id = session_id and s.user_id = auth.uid()));
create policy "exercise_logs: insert own" on exercise_logs for insert
  with check (exists (select 1 from workout_sessions s
                       where s.id = session_id and s.user_id = auth.uid()));
create policy "exercise_logs: update own" on exercise_logs for update
  using (exists (select 1 from workout_sessions s
                  where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from workout_sessions s
                       where s.id = session_id and s.user_id = auth.uid()));
create policy "exercise_logs: delete own" on exercise_logs for delete
  using (exists (select 1 from workout_sessions s
                  where s.id = session_id and s.user_id = auth.uid()));

-- ---------- push tokens ----------
-- Keyed on (user_id, device_id) so a reinstall upserts its row instead of
-- leaving a dead token behind. The Edge Function deletes rows Expo reports as
-- DeviceNotRegistered; it runs as service_role and bypasses these policies.
create table push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  expo_push_token text not null,
  platform device_platform not null,
  program_id uuid references programs (id),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

-- The DeviceNotRegistered cleanup path looks tokens up by value, not by owner.
create index push_tokens_token_idx on push_tokens (expo_push_token);

alter table push_tokens enable row level security;
create policy "push_tokens: read own" on push_tokens for select
  using (user_id = auth.uid());
create policy "push_tokens: insert own" on push_tokens for insert
  with check (user_id = auth.uid());
create policy "push_tokens: update own" on push_tokens for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_tokens: delete own" on push_tokens for delete
  using (user_id = auth.uid());

-- ---------- notification preferences ----------
-- Server-side, not AsyncStorage: the Edge Function fans out on the server and
-- cannot honour a preference it can't read. Also survives a reinstall.
--
-- Deliberately NO program_id, unlike push_tokens above. This is a per-user
-- settings object in the same shape as `profiles` (which also has none): "do
-- not disturb me" and "remind me at 19:00" are properties of the person, not
-- of whichever program they are currently on, and per-program notification
-- settings would be a preference the UI has no way to let anyone express.
-- push_tokens keeps program_id because a send is targeted at a device.
create table notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,         -- master switch
  daily_reminder boolean not null default true,
  -- Wall-clock time in Asia/Kolkata; the sender converts. Stored as `time`
  -- rather than an hour int so a 06:30 reminder needs no schema change.
  reminder_time time not null default '19:00',
  streak_at_risk boolean not null default true,
  plan_ready boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table notification_prefs enable row level security;
create policy "notification_prefs: read own" on notification_prefs for select
  using (user_id = auth.uid());
create policy "notification_prefs: insert own" on notification_prefs for insert
  with check (user_id = auth.uid());
create policy "notification_prefs: update own" on notification_prefs for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- aggregate read ----------
-- security_invoker so the caller's RLS applies — without it this view would run
-- as its owner and expose every user's sessions.
-- Slice 6 reads this instead of pulling raw exercise_logs to the device.
create view session_summary
with (security_invoker = true) as
select
  s.id as session_id,
  s.user_id,
  s.program_id,
  s.ist_date,
  s.status,
  s.started_at,
  s.completed_at,
  count(l.*) filter (where not l.skipped) as sets_done,
  count(distinct l.exercise_id) filter (where not l.skipped) as exercises_done,
  -- Elapsed wall-clock, not the sum of set durations: rest counts as training
  -- time, and untimed (rep-based) sets have no duration at all.
  greatest(1, round(extract(epoch from (
    coalesce(s.completed_at, now()) - s.started_at)) / 60))::int as minutes
from workout_sessions s
left join exercise_logs l on l.session_id = s.id
group by s.id;
