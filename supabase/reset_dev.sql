-- reset_dev.sql — DEV ONLY, NOT a migration (lives outside migrations/ so
-- `supabase db push` never runs it). Drops every object the 0001–0007
-- migrations create, so you can re-run them cleanly after a partial/failed
-- apply. Safe to run repeatedly. DO NOT run against any environment with real
-- user data — activity_log and profiles are user rows.

-- trigger + trigger fn on auth.users
drop trigger if exists on_auth_user_created on auth.users;

-- functions & view
drop function if exists handle_new_user() cascade;
drop function if exists is_admin() cascade;
drop function if exists current_streak(uuid) cascade;
drop function if exists current_streak_for(uuid, activity_type) cascade;
drop function if exists ist_today() cascade;
drop view if exists daily_activity cascade;

-- tables (cascade handles FKs + junction rows)
drop table if exists daily_devotional cascade;
drop table if exists festivals cascade;
drop table if exists activity_log cascade;
drop table if exists user_plans cascade;
drop table if exists assignment_rules cascade;
drop table if exists program_days cascade;
drop table if exists programs cascade;
drop table if exists diet_template_meals cascade;
drop table if exists diet_templates cascade;
drop table if exists workout_template_exercises cascade;
drop table if exists workout_templates cascade;
drop table if exists devotional_items cascade;
drop table if exists meals cascade;
drop table if exists mantras cascade;
drop table if exists sounds cascade;
drop table if exists exercises cascade;
drop table if exists deities cascade;
drop table if exists media cascade;
drop table if exists questionnaire_responses cascade;
drop table if exists profiles cascade;
drop table if exists admin_users cascade;

-- enums
drop type if exists devotional_kind cascade;
drop type if exists plan_status cascade;
drop type if exists media_kind cascade;
drop type if exists content_status cascade;
drop type if exists activity_type cascade;
drop type if exists meal_time cascade;
drop type if exists sound_kind cascade;
drop type if exists level cascade;
drop type if exists body_area cascade;
drop type if exists workout_mode cascade;
drop type if exists diet_type cascade;
drop type if exists age_band cascade;
drop type if exists goal cascade;
drop type if exists language_mode cascade;
