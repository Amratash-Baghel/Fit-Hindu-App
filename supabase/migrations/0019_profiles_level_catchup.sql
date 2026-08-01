-- 0019 — catch up profiles.level on the live database.
--
-- Live-DB drift discovered 2026-08-01, mid regression-fix-batch merge: this
-- branch's own 0010_onboarding_v2.sql was never applied to the shared
-- Supabase project (hkycmhzsubrccdhlcqsj). Only origin/main's old
-- 0010_diet_plans_profile_fields.sql ran against it at some point instead —
-- confirmed via a live introspection query: profiles already has height_cm,
-- weight_kg, region, body_focus, days_per_week (and diet_plan_requests +
-- diet_request_status already exist too). The ONLY thing actually missing is
-- `level`.
--
-- Urgent: src/lib/onboarding.ts writes `level` into the object
-- src/lib/auth.tsx:117 upserts into profiles, so onboarding flush errors with
-- "column level does not exist" for every user until this runs — that is the
-- exact flow about to be demoed. `if not exists` on the column add makes this
-- safe to re-run if the live picture shifts again before it's applied.

alter table profiles add column if not exists level level;

-- The days_per_week check constraint from the original 0010_onboarding_v2.sql
-- — main's applied version added the plain column without it. Guarded
-- because ADD CONSTRAINT has no IF NOT EXISTS in Postgres.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_days_per_week_check'
  ) then
    alter table profiles add constraint profiles_days_per_week_check
      check (days_per_week in (3, 5, 7));
  end if;
end $$;

-- Align the DB default with the app (2026-07-13 decision, docs/decisions.md)
-- — the app has defaulted to 'english' since then; this column still
-- defaulted to 'mixed'. Default only; existing rows keep whatever they hold.
alter table profiles alter column language_mode set default 'english';
