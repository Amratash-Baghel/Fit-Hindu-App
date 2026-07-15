-- 0009 — My Workouts: user-composed routines from the exercise library
-- (workout spec v2, F&B reference model). Same composition shape as the
-- admin's workout_templates, but user-owned rows with own-row RLS.
-- Ordering contract: positions are rewritten 1..n on every save.

create table user_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_workouts_user_idx on user_workouts (user_id, updated_at desc);

alter table user_workouts enable row level security;
create policy "user_workouts: read own" on user_workouts for select using (user_id = auth.uid());
create policy "user_workouts: insert own" on user_workouts for insert with check (user_id = auth.uid());
create policy "user_workouts: update own" on user_workouts for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_workouts: delete own" on user_workouts for delete using (user_id = auth.uid());

create table user_workout_items (
  workout_id uuid not null references user_workouts (id) on delete cascade,
  position int not null,
  exercise_id uuid not null references exercises (id),
  -- per-item overrides; null = the exercise object's defaults
  sets int,
  reps int,
  duration_seconds int,
  rest_seconds int,
  primary key (workout_id, position)
);

alter table user_workout_items enable row level security;
-- item access rides on owning the parent workout
create policy "uwi: read own" on user_workout_items for select
  using (exists (select 1 from user_workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "uwi: insert own" on user_workout_items for insert
  with check (exists (select 1 from user_workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "uwi: update own" on user_workout_items for update
  using (exists (select 1 from user_workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from user_workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "uwi: delete own" on user_workout_items for delete
  using (exists (select 1 from user_workouts w where w.id = workout_id and w.user_id = auth.uid()));
