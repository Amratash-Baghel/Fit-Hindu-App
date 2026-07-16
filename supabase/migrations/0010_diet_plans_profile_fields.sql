-- 0010 — AI custom diet plans + onboarding/diet profile fields
-- Owner override 2026-07-16: the "no AI plan generation" v1 rule is lifted
-- for the diet custom-plan feature ONLY. A user answers a short questionnaire;
-- the app inserts a diet_plan_requests row (status 'pending') and calls an
-- external n8n workflow. n8n runs the AI, then writes plan + status back using
-- the SERVICE-ROLE key (bypasses RLS) — so clients get read/insert own only,
-- never update, and cannot forge their own plan. Mirrors the append-only
-- questionnaire_responses shape. AI output stays general wellness, never
-- medical advice (health-claims rule still binds; disclaimer shown in-app).

-- ---------- profile fields (onboarding v2 + diet questionnaire) ----------
-- All nullable/defaulted: handle_new_user() inserts only (id) on signup.
alter table profiles
  add column height_cm int,
  add column weight_kg numeric(5,1),
  add column region text,                          -- e.g. 'north','south','east','west','central','northeast'
  add column body_focus body_area[] not null default '{}',
  add column days_per_week smallint;

-- ---------- diet request status (closed set → enum, house rule) ----------
create type diet_request_status as enum ('pending', 'generating', 'ready', 'failed');

-- ---------- diet_plan_requests (user-owned; AI-filled via n8n) ----------
create table diet_plan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,                          -- ht/wt/region/goal/diet_type/activity, forwarded to the AI
  plan jsonb,                                       -- AI-generated plan; null until n8n writes it back
  status diet_request_status not null default 'pending',
  error text,                                       -- failure reason when status='failed'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diet_plan_requests_user_idx on diet_plan_requests (user_id, created_at desc);

alter table diet_plan_requests enable row level security;
-- Read + insert own only. The plan/status write-back is done by n8n with the
-- service-role key (bypasses RLS), so there is deliberately NO client update
-- policy — a user cannot alter their own generated plan.
create policy "diet_plan_requests: read own" on diet_plan_requests for select
  using (user_id = auth.uid());
create policy "diet_plan_requests: insert own" on diet_plan_requests for insert
  with check (user_id = auth.uid());
