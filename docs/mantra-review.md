# Mantra library — text review before ship (B7)

**Status: AWAITING OWNER + TEAM VERIFICATION.**
These 8 mantras are in migration `0018_seed_mantras.sql`. They are inserted as
`published` so they render as real, tappable jap entries — but **do not run
0018 in production until the Sanskrit + transliteration below are signed off.**
Correct the migration first if anything needs fixing, then apply.

Audio is a placeholder for now (no `chant_audio_media_id`); the jap counter
interaction works regardless (no dead list items). Real chant audio can be
attached per-mantra later via the admin panel.

For each row: verify the Devanagari spelling/sandhi, the transliteration, and
that the meaning is faithful and non-curative (health-claims rule — devotional
meaning only, never a medical promise).

| # | Deity | Devanagari | Transliteration | Verified? |
|---|-------|------------|-----------------|-----------|
| 1 | Shiv | ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्। उर्वारुकमिव बन्धनान् मृत्योर्मुक्षीय मामृतात्॥ | Om Tryambakam Yajamahe… Mrityor Mukshiya Maamritat | ☐ |
| 2 | Shiv | ॐ नमो भगवते रुद्राय | Om Namo Bhagavate Rudraya | ☐ |
| 3 | Ram | श्री राम जय राम जय जय राम | Shri Ram Jai Ram Jai Jai Ram | ☐ |
| 4 | Ram | ॐ रां रामाय नमः | Om Ram Ramaya Namah | ☐ |
| 5 | Krishna | हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे। हरे राम हरे राम राम राम हरे हरे॥ | Hare Krishna… Rama Rama Hare Hare | ☐ |
| 6 | Krishna | ॐ नमो भगवते वासुदेवाय | Om Namo Bhagavate Vasudevaya | ☐ |
| 7 | Hanuman | ॐ श्री हनुमते नमः | Om Shri Hanumate Namah | ☐ |
| 8 | Hanuman | ॐ आञ्जनेयाय नमः | Om Anjaneyaya Namah | ☐ |

Notes for the reviewer:
- #1 is the Mahamrityunjaya Mantra — the longest; check the sandhi at
  `बन्धनान् मृत्योर्मुक्षीय` and `मामृतात्` especially.
- These are deliberately DISTINCT from the three dev-seed mantras (Om Ham
  Hanumate Namah, Om Namah Shivaya, Om Shri Ramaya Namah) so nothing duplicates.
- Deities referenced by slug: `shiv`, `ram`, `krishna`, `hanuman`. The target
  environment must have these published, or that deity's mantras are skipped.
- Full meanings (hi + en) are in the migration; verify those too.
