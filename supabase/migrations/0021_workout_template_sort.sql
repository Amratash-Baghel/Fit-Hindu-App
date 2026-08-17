-- 0021 — workout_templates.sort: the content team owns template order.
--
-- UI9 slice E. The workout tab's "Today's workout" hero is the first template
-- of the current mode (docs/specs/workout.md v3), which until now meant
-- alphabetical `name_en` order — so choosing the hero meant renaming a
-- workout. `sort` makes the pick content, not a rename and not a release.
--
-- Lowest sort wins; equal sorts fall back to name_en so the order is always
-- total and stable. Default 100 leaves room to push a template to the front
-- (10) or the back (900) without renumbering the rest.
--
-- Additive and idempotent: no RLS change (the existing published-read /
-- admin-write policies on workout_templates cover the new column), no data
-- migration — every existing row lands on 100 and keeps today's name order.

alter table workout_templates add column if not exists sort int not null default 100;

-- The app's list query is (status, mode) filtered, then sort, name_en ordered.
create index if not exists workout_templates_mode_sort_idx
  on workout_templates (mode, sort, name_en)
  where status = 'published';
