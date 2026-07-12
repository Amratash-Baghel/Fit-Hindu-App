-- 0005 — programs + the rule-based assignment engine.
-- A program = a multi-day schedule of templates. Assignment rules map
-- questionnaire answers -> a program. Both are ADMIN-AUTHORED CONTENT;
-- nothing here hardcodes a product, deity, or goal (standing rule).

create table programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_hi text not null,
  name_en text not null,
  description_hi text,
  description_en text,
  duration_days int not null,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table programs enable row level security;
create policy "programs: published read" on programs for select
  using (status = 'published' or is_admin());
create policy "programs: admin write" on programs for all
  using (is_admin()) with check (is_admin());

create table program_days (
  program_id uuid not null references programs (id) on delete cascade,
  day_number int not null,                    -- 1-based
  workout_template_id uuid references workout_templates (id),
  diet_template_id uuid references diet_templates (id),
  is_rest_day boolean not null default false, -- rest days keep devotional/meditation alive
  primary key (program_id, day_number)
);

alter table program_days enable row level security;
create policy "program_days: public read" on program_days for select using (true);
create policy "program_days: admin write" on program_days for all
  using (is_admin()) with check (is_admin());

-- ---------- assignment rules (the v1 "plan engine") ----------
-- Evaluated in priority order (lowest number first); first rule whose
-- `conditions` are all satisfied by the user's answers wins.
-- conditions example: {"goal": "strength", "workout_mode": "home", "level": "beginner"}
-- A key absent from conditions = "any". Authored in the admin panel.
create table assignment_rules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  priority int not null,
  conditions jsonb not null default '{}'::jsonb,
  status content_status not null default 'draft',
  unique (priority)
);

alter table assignment_rules enable row level security;
create policy "assignment_rules: published read" on assignment_rules for select
  using (status = 'published' or is_admin());
create policy "assignment_rules: admin write" on assignment_rules for all
  using (is_admin()) with check (is_admin());
