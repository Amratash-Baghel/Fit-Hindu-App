-- 0002 — identity: admin roster, profiles, questionnaire responses

-- ---------- admin roster ----------
-- Content-team members. Rows are inserted via the Supabase dashboard or the
-- service role (no self-service signup path to admin).
create table admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

-- Users may check their own membership; is_admin() (security definer) is the
-- path everything else uses.
create policy "admin_users: read own row"
  on admin_users for select
  using (user_id = auth.uid());

create or replace function is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ---------- profiles ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  language_mode language_mode not null default 'mixed',
  goal goal,
  age_band age_band,
  diet_type diet_type,
  workout_mode_pref workout_mode,          -- null = "decide later"
  deity_id uuid,                            -- FK added in 0003 (deities table)
  consent_at timestamptz,                   -- DPDP consent moment; null = not consented
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: read own"
  on profiles for select using (id = auth.uid());
create policy "profiles: insert own"
  on profiles for insert with check (id = auth.uid());
create policy "profiles: update own"
  on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a profile row on signup.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- questionnaire responses ----------
-- Versioned; a re-take inserts a new row (history preserved for the data layer).
create table questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  version int not null default 1,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create index questionnaire_responses_user_idx on questionnaire_responses (user_id, created_at desc);

alter table questionnaire_responses enable row level security;

create policy "questionnaire: read own"
  on questionnaire_responses for select using (user_id = auth.uid());
create policy "questionnaire: insert own"
  on questionnaire_responses for insert with check (user_id = auth.uid());
