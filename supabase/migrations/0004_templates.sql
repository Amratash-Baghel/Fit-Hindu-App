-- 0004 — templates: ordered compositions of content atoms.
-- Templates REFERENCE objects, never copy them (content-model reuse rule).

-- ---------- workout templates ----------
create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  name_hi text not null,
  name_en text not null,
  mode workout_mode not null,
  level level not null default 'beginner',
  est_minutes int,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table workout_templates enable row level security;
create policy "workout_templates: published read" on workout_templates for select
  using (status = 'published' or is_admin());
create policy "workout_templates: admin write" on workout_templates for all
  using (is_admin()) with check (is_admin());

create table workout_template_exercises (
  template_id uuid not null references workout_templates (id) on delete cascade,
  position int not null,
  exercise_id uuid not null references exercises (id),
  -- per-slot overrides; null = use the exercise object's defaults
  sets int,
  reps int,
  duration_seconds int,
  rest_seconds int,
  primary key (template_id, position)
);

alter table workout_template_exercises enable row level security;
create policy "wte: public read" on workout_template_exercises for select using (true);
create policy "wte: admin write" on workout_template_exercises for all
  using (is_admin()) with check (is_admin());

-- ---------- diet templates ----------
create table diet_templates (
  id uuid primary key default gen_random_uuid(),
  name_hi text not null,
  name_en text not null,
  diet_types diet_type[] not null default '{}',
  total_kcal int,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table diet_templates enable row level security;
create policy "diet_templates: published read" on diet_templates for select
  using (status = 'published' or is_admin());
create policy "diet_templates: admin write" on diet_templates for all
  using (is_admin()) with check (is_admin());

create table diet_template_meals (
  template_id uuid not null references diet_templates (id) on delete cascade,
  meal_time meal_time not null,
  position int not null default 0,
  meal_id uuid not null references meals (id),
  primary key (template_id, meal_time, position)
);

alter table diet_template_meals enable row level security;
create policy "dtm: public read" on diet_template_meals for select using (true);
create policy "dtm: admin write" on diet_template_meals for all
  using (is_admin()) with check (is_admin());
