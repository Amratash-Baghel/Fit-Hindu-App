-- 0008 — sounds.audio_media_id becomes nullable.
--
-- Discrepancy found in the 2026-07-14 audit: the admin panel's
-- upload-into-placeholder flow creates content objects FIRST (draft, no
-- media) and uploads into them afterwards — exercises.video_media_id is
-- nullable for exactly this reason, but sounds.audio_media_id was NOT NULL,
-- so "New sound" in the panel violated the constraint. A sound without
-- audio is a placeholder; publishing discipline (draft/published) is the
-- gate, not the constraint.

alter table sounds alter column audio_media_id drop not null;
