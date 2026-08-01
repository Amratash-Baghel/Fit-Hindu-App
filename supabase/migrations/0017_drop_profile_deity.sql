-- 0017 — remove the onboarding deity question's storage.
--
-- Owner decision 2026-08-01: the deity QUESTION is dropped from the onboarding
-- questionnaire. It was never consumed by the rule-based matching engine
-- (factsOf in src/lib/planRules.ts has no deity key), so removing it changes no
-- plan output — see docs/decisions.md.
--
-- IMPORTANT: this drops ONLY the per-profile answer. Deity remains first-class
-- CONTENT metadata — mantras.deity_id, sounds.deity_id, devotional_items /
-- daily_devotional / festivals.deity_id are all untouched, and the jap screen
-- still groups mantras by their own deity. Only profiles.deity_id goes.

alter table profiles drop constraint if exists profiles_deity_fk;
alter table profiles drop column if exists deity_id;
