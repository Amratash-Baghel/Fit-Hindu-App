-- 0001 — extensions, enums, time helpers
-- Fit Hindu data model v1. Enums here are CLOSED sets only; anything the
-- content team may extend (deities, programs, body-area-like taxonomies that
-- could grow) lives in tables instead (platform standing rule).

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type language_mode as enum ('hindi', 'english', 'mixed');
create type goal as enum ('weight_gain', 'strength', 'weight_loss', 'healthy_routine');
create type age_band as enum ('18_25', '26_35', '36_50', '50_plus');
create type diet_type as enum ('veg', 'sattvic', 'egg', 'nonveg');
create type workout_mode as enum ('home', 'gym');
create type body_area as enum ('chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'full_body');
create type level as enum ('beginner', 'intermediate', 'advanced');
create type sound_kind as enum ('chant', 'ambient', 'sleep', 'jap_loop');
create type meal_time as enum ('breakfast', 'lunch', 'snack', 'dinner');
create type activity_type as enum ('workout', 'meal', 'meditation', 'jap', 'sleep_sound', 'devotional');
create type content_status as enum ('draft', 'published', 'archived');
create type media_kind as enum ('video', 'audio', 'image');
create type plan_status as enum ('active', 'completed', 'abandoned');
create type devotional_kind as enum ('shloka', 'quote', 'greeting');

-- ---------- time helpers ----------
-- Standing rule: all day boundaries and streaks use Asia/Kolkata.
create or replace function ist_today()
returns date
language sql stable
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;
