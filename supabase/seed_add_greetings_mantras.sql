-- seed_add_greetings_mantras.sql — ADDITIVE + IDEMPOTENT.
--
-- Run this against an EXISTING dev database (seed.sql already applied). It is
-- safe to run more than once: every insert is `on conflict (id) do nothing`.
-- The same rows are also appended to seed.sql so a fresh reset_dev + seed
-- comes up complete.
--
-- Why this exists (2026-07-16): the Home greeting cycle and the Jap deity
-- picker both read content that had NO rows:
--   * devotional_items kind='greeting' — zero rows existed.
--   * mantras — only Hanuman + Shiv had one, so a 4-deity picker would have
--     shown 2 chips.
--
-- Copy criteria (CLAUDE.md fence-line: devotional/cultural, never politically
-- partisan): greetings are traditional forms of address. "Jai Siya Ram" is
-- used rather than the contemporary political slogan variant.

-- ---------- greetings (Home) ----------
-- text_hi = Devanagari as spoken; text_en = transliteration (NOT a
-- translation — the greeting is the same word in both modes).
insert into devotional_items (id, kind, deity_id, text_hi, text_en, source, status) values
  ('60000000-0000-4000-8000-000000000001', 'greeting', 'a0000000-0000-4000-8000-000000000002',
   'राम राम', 'Ram Ram', null, 'published'),
  ('60000000-0000-4000-8000-000000000002', 'greeting', 'a0000000-0000-4000-8000-000000000002',
   'जय सिया राम', 'Jai Siya Ram', null, 'published'),
  ('60000000-0000-4000-8000-000000000003', 'greeting', 'a0000000-0000-4000-8000-000000000004',
   'जय श्री कृष्ण', 'Jai Shree Krishna', null, 'published'),
  ('60000000-0000-4000-8000-000000000004', 'greeting', 'a0000000-0000-4000-8000-000000000004',
   'राधे राधे', 'Radhe Radhe', null, 'published'),
  ('60000000-0000-4000-8000-000000000005', 'greeting', 'a0000000-0000-4000-8000-000000000003',
   'हर हर महादेव', 'Har Har Mahadev', null, 'published'),
  ('60000000-0000-4000-8000-000000000006', 'greeting', 'a0000000-0000-4000-8000-000000000001',
   'जय बजरंगबली', 'Jai Bajrangbali', null, 'published'),
  ('60000000-0000-4000-8000-000000000007', 'greeting', null,
   'नमस्ते', 'Namaste', null, 'published'),
  ('60000000-0000-4000-8000-000000000008', 'greeting', null,
   'जय जय श्री राधे', 'Jai Jai Shree Radhe', null, 'published')
on conflict (id) do nothing;

-- ---------- mantras for the remaining deities (Jap picker) ----------
insert into mantras (id, deity_id, text_devanagari, transliteration, meaning_hi, meaning_en, status) values
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002',
   'ॐ श्री रामाय नमः', 'Om Shri Ramaya Namah',
   'श्री राम को नमन — मर्यादा और धैर्य का मंत्र।',
   'Salutations to Shri Ram — mantra of steadiness and right conduct.', 'published'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004',
   'ॐ नमो भगवते वासुदेवाय', 'Om Namo Bhagavate Vasudevaya',
   'श्री कृष्ण को नमन — प्रेम और समर्पण का द्वादशाक्षर मंत्र।',
   'Salutations to Vasudeva (Krishna) — the twelve-syllable mantra of love and surrender.', 'published')
on conflict (id) do nothing;
