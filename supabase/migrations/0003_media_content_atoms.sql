-- 0003 — media layer + content atoms (exercises, sounds, mantras, meals,
-- devotional items, deities)
--
-- Media files NEVER live in the database or Supabase storage (standing rule):
-- `media` stores provider refs only. Re-pointing to another provider (e.g.
-- Bunny -> Mux) is an UPDATE, not an app release.

-- ---------- media (the swappable layer) ----------
create table media (
  id uuid primary key default gen_random_uuid(),
  kind media_kind not null,
  provider text not null default 'bunny',
  external_id text not null,               -- provider's id (Bunny video GUID etc.)
  playback_url text not null,              -- HLS .m3u8 / audio / image URL
  download_url text,                       -- MP4/AAC fallback for offline
  duration_seconds int,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table media enable row level security;
create policy "media: public read" on media for select using (true);
create policy "media: admin write" on media for all
  using (is_admin()) with check (is_admin());

-- ---------- deities (DATA, not an enum — admin-extensible) ----------
create table deities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_hi text not null,
  name_en text not null,
  icon_media_id uuid references media (id),
  weekdays smallint[] not null default '{}',  -- 0=Sun..6=Sat; deity-of-the-day fallback
  sort int not null default 0,
  status content_status not null default 'draft'
);

alter table deities enable row level security;
create policy "deities: published read" on deities for select
  using (status = 'published' or is_admin());
create policy "deities: admin write" on deities for all
  using (is_admin()) with check (is_admin());

-- profiles.deity_id was created in 0002 without its FK (deities didn't exist yet)
alter table profiles
  add constraint profiles_deity_fk foreign key (deity_id) references deities (id);

-- ---------- exercises (the atom of the workout section) ----------
create table exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_hi text not null,
  name_en text not null,
  instructions_hi text,
  instructions_en text,
  safety_note_hi text,
  safety_note_en text,
  video_media_id uuid references media (id),
  thumb_media_id uuid references media (id),
  body_areas body_area[] not null default '{}',
  modes workout_mode[] not null default '{}',   -- one exercise can be home AND gym
  level level not null default 'beginner',
  default_sets int,
  default_reps int,
  default_duration_seconds int,
  default_rest_seconds int not null default 30,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_body_areas_idx on exercises using gin (body_areas);
create index exercises_modes_idx on exercises using gin (modes);

alter table exercises enable row level security;
create policy "exercises: published read" on exercises for select
  using (status = 'published' or is_admin());
create policy "exercises: admin write" on exercises for all
  using (is_admin()) with check (is_admin());

-- ---------- sounds (one library feeds meditation, sleep, jap) ----------
create table sounds (
  id uuid primary key default gen_random_uuid(),
  name_hi text not null,
  name_en text not null,
  kind sound_kind not null,
  deity_id uuid references deities (id),    -- deity-tagged chants surface first
  audio_media_id uuid not null references media (id),
  duration_seconds int,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table sounds enable row level security;
create policy "sounds: published read" on sounds for select
  using (status = 'published' or is_admin());
create policy "sounds: admin write" on sounds for all
  using (is_admin()) with check (is_admin());

-- ---------- mantras ----------
create table mantras (
  id uuid primary key default gen_random_uuid(),
  deity_id uuid not null references deities (id),
  text_devanagari text not null,
  transliteration text,
  meaning_hi text,
  meaning_en text,
  chant_audio_media_id uuid references media (id),
  status content_status not null default 'draft'
);

alter table mantras enable row level security;
create policy "mantras: published read" on mantras for select
  using (status = 'published' or is_admin());
create policy "mantras: admin write" on mantras for all
  using (is_admin()) with check (is_admin());

-- ---------- meals ----------
create table meals (
  id uuid primary key default gen_random_uuid(),
  name_hi text not null,
  name_en text not null,
  items jsonb not null default '[]'::jsonb, -- [{text_hi, text_en, veg}]
  kcal int,
  meal_time meal_time not null,
  diet_types diet_type[] not null default '{}',
  status content_status not null default 'draft'
);

create index meals_diet_types_idx on meals using gin (diet_types);

alter table meals enable row level security;
create policy "meals: published read" on meals for select
  using (status = 'published' or is_admin());
create policy "meals: admin write" on meals for all
  using (is_admin()) with check (is_admin());

-- ---------- devotional items (shloka / quote / greeting) ----------
create table devotional_items (
  id uuid primary key default gen_random_uuid(),
  kind devotional_kind not null,
  deity_id uuid references deities (id),
  text_hi text not null,
  text_en text,
  source text,                               -- e.g. "Hanuman Chalisa"
  status content_status not null default 'draft'
);

alter table devotional_items enable row level security;
create policy "devotional_items: published read" on devotional_items for select
  using (status = 'published' or is_admin());
create policy "devotional_items: admin write" on devotional_items for all
  using (is_admin()) with check (is_admin());
