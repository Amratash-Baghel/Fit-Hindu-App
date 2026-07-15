-- 0010 — onboarding v2: the columns the Leap/F&B-style question set needs.
--
-- The v2 question set (docs/specs/onboarding-questionnaire.md:19-39) asks
-- three things profiles could not store: level, body focus, and training
-- frequency. The spec flagged this gap at :41-45 and deferred it to "when the
-- onboarding build cycle starts" — that is now.
--
-- No enum work: `level` and `body_area` were both defined in 0001, so this is
-- a pure column addition (no enum-add-then-use split needed).
-- No RLS work: profiles already carries own-row read/insert/update policies
-- from 0002, and policies are table-scoped — new columns inherit them.
-- assignment_rules.conditions is jsonb and accommodates the new keys with
-- zero schema change.

-- Q4 — level. Nullable: a profile row is created by the handle_new_user()
-- trigger at signup, before any question has been answered.
alter table profiles add column level level;

-- Q3 — body focus. Multi-select and skippable, so "skipped" and "none chosen"
-- are the same state: an empty array, never null.
alter table profiles add column body_focus body_area[] not null default '{}';

-- Q5 — training days per week. Drives program_days density (the reference
-- app's 7x4 pattern maps to 7). Closed set, but a check constraint rather
-- than an enum: it is a number we filter and compare on, and the set is
-- unlikely to grow.
alter table profiles add column days_per_week smallint
  constraint profiles_days_per_week_check check (days_per_week in (3, 5, 7));

-- Align the DB default with the app. The app has defaulted to 'english' since
-- the 2026-07-13 owner decision (docs/decisions.md:59) while this column still
-- defaulted to 'mixed' — so a profile created by the signup trigger before
-- onboarding wrote an answer disagreed with the UI the user was looking at.
-- Default only; existing rows keep whatever they hold. Onboarding writes this
-- column explicitly, so the default is just the pre-answer state.
alter table profiles alter column language_mode set default 'english';
