-- 0016 — seed the first real content-library audio (B5 launch tracks).
--
-- Two tracks ship bundled IN THE APP (assets/audio/*.m4a) for offline, instant,
-- click-free playback. They are still modelled as ordinary content rows so the
-- team can add more later with no code change: a `media` row per file with
-- provider='local' + a stable external_id, and `sounds` rows pointing at it.
-- The app resolves provider='local' to the bundled asset via that external_id
-- (src/lib/localAudio.ts); the playback_url below is an unused sentinel (the
-- media table requires the column NOT NULL, but local rows never read it).
--
-- Om chant appears in BOTH modules: one 'chant' row (meditation reads
-- chant+ambient) and one 'sleep' row, both pointing at the same media. The
-- flute is a sleep soundscape. deity_id stays null — these are non-deity.

with om as (
  insert into media (kind, provider, external_id, playback_url)
  values ('audio', 'local', 'om-chant-loop', 'local://om-chant-loop.m4a')
  returning id
),
flute as (
  insert into media (kind, provider, external_id, playback_url)
  values ('audio', 'local', 'sleep-flute-loop', 'local://sleep-flute-loop.m4a')
  returning id
)
insert into sounds (name_hi, name_en, kind, audio_media_id, status)
select 'ॐ जाप', 'Om Chant', 'chant'::sound_kind, (select id from om), 'published'::content_status
union all
select 'ॐ जाप', 'Om Chant', 'sleep'::sound_kind, (select id from om), 'published'::content_status
union all
select 'बांसुरी — रात्रि राग', 'Bansuri — Night Flute', 'sleep'::sound_kind, (select id from flute), 'published'::content_status;
