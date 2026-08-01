-- 0018 — expand the mantra library (B7): 8 widely-known mantras, two each for
-- Shiv, Ram, Krishna and Hanuman.
--
-- ⚠ REVIEW GATE: every line of Sanskrit/transliteration below is flagged for
-- the owner + team to verify BEFORE this migration is run in production. The
-- authoritative checklist is docs/mantra-review.md. Do not apply until signed
-- off. (They are inserted as 'published' so they render as real, tappable jap
-- entries once applied — no dead list items.)
--
-- Joined by deity SLUG, not a hardcoded UUID, so it is correct in any
-- environment that has these deities published. A deity that is absent simply
-- gets no mantra rather than failing the migration. Distinct from the three
-- dev-seed mantras (Om Ham Hanumate Namah / Om Namah Shivaya / Om Shri Ramaya
-- Namah), so applying this over seeded data does not duplicate them.

insert into mantras (deity_id, text_devanagari, transliteration, meaning_hi, meaning_en, status)
select d.id, v.text_dev, v.translit, v.meaning_hi, v.meaning_en, 'published'::content_status
from (values
  -- Shiv
  ('shiv',
   'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्। उर्वारुकमिव बन्धनान् मृत्योर्मुक्षीय मामृतात्॥',
   'Om Tryambakam Yajamahe Sugandhim Pushti-vardhanam, Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat',
   'त्रिनेत्रधारी भगवान शिव की आराधना — जैसे ककड़ी बेल से सहज अलग होती है, वैसे वे हमें मृत्यु के बंधन से मुक्त करें, अमरता की ओर। (महामृत्युंजय मंत्र)',
   'We worship the three-eyed Lord Shiva, fragrant and nourishing. May he release us from the bondage of death, like a cucumber from its stem — toward immortality. (Mahamrityunjaya Mantra)'),
  ('shiv',
   'ॐ नमो भगवते रुद्राय',
   'Om Namo Bhagavate Rudraya',
   'भगवान रुद्र (शिव) को नमन।',
   'Salutations to Lord Rudra (Shiva).'),
  -- Ram
  ('ram',
   'श्री राम जय राम जय जय राम',
   'Shri Ram Jai Ram Jai Jai Ram',
   'श्री राम की जय — राम का तारक मंत्र।',
   'Glory to Lord Ram — the taraka (deliverance) mantra of Ram.'),
  ('ram',
   'ॐ रां रामाय नमः',
   'Om Ram Ramaya Namah',
   'बीज मंत्र रां सहित श्री राम को नमन।',
   'Salutations to Ram, with the seed-syllable Ram.'),
  -- Krishna
  ('krishna',
   'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे। हरे राम हरे राम राम राम हरे हरे॥',
   'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare; Hare Rama Hare Rama, Rama Rama Hare Hare',
   'महामंत्र — हरि (कृष्ण और राम) के नामों का आह्वान।',
   'The Maha-mantra — a calling on the names of Krishna and Rama (Hari).'),
  ('krishna',
   'ॐ नमो भगवते वासुदेवाय',
   'Om Namo Bhagavate Vasudevaya',
   'भगवान वासुदेव (कृष्ण) को नमन — द्वादशाक्षर मंत्र।',
   'Salutations to Lord Vasudeva (Krishna) — the twelve-syllable mantra.'),
  -- Hanuman
  ('hanuman',
   'ॐ श्री हनुमते नमः',
   'Om Shri Hanumate Namah',
   'श्री हनुमान जी को नमन।',
   'Salutations to Sri Hanuman.'),
  ('hanuman',
   'ॐ आञ्जनेयाय नमः',
   'Om Anjaneyaya Namah',
   'आञ्जनेय (अंजना-पुत्र हनुमान) को नमन।',
   'Salutations to Anjaneya (Hanuman, son of Anjana).')
) as v(slug, text_dev, translit, meaning_hi, meaning_en)
join deities d on d.slug = v.slug;
