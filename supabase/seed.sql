-- seed.sql — DEV ONLY. Sample content so screens have something to render.
-- Media rows are PLACEHOLDERS (example.com URLs) until real Bunny uploads
-- exist; the fitness hire replaces these via the admin panel.

-- ---------- deities ----------
insert into deities (id, slug, name_hi, name_en, weekdays, sort, status) values
  ('a0000000-0000-4000-8000-000000000001', 'hanuman', 'हनुमान जी', 'Hanuman', '{2,6}', 1, 'published'),
  ('a0000000-0000-4000-8000-000000000002', 'ram',     'श्री राम',  'Ram',     '{0}',   2, 'published'),
  ('a0000000-0000-4000-8000-000000000003', 'shiv',    'शिव जी',    'Shiv',    '{1}',   3, 'published'),
  ('a0000000-0000-4000-8000-000000000004', 'krishna', 'श्री कृष्ण', 'Krishna', '{3}',   4, 'published');

-- ---------- placeholder media ----------
insert into media (id, kind, provider, external_id, playback_url, duration_seconds) values
  ('b0000000-0000-4000-8000-000000000001', 'video', 'placeholder', 'surya-namaskar',  'https://example.com/videos/surya-namaskar.m3u8', 180),
  ('b0000000-0000-4000-8000-000000000002', 'video', 'placeholder', 'dand-baithak',    'https://example.com/videos/dand-baithak.m3u8', 90),
  ('b0000000-0000-4000-8000-000000000003', 'video', 'placeholder', 'squats',          'https://example.com/videos/squats.m3u8', 90),
  ('b0000000-0000-4000-8000-000000000004', 'video', 'placeholder', 'plank',           'https://example.com/videos/plank.m3u8', 60),
  ('b0000000-0000-4000-8000-000000000005', 'video', 'placeholder', 'cobra',           'https://example.com/videos/cobra.m3u8', 60),
  ('b0000000-0000-4000-8000-000000000006', 'video', 'placeholder', 'jumping-jacks',   'https://example.com/videos/jumping-jacks.m3u8', 60),
  ('b0000000-0000-4000-8000-000000000011', 'audio', 'placeholder', 'om-chant',        'https://example.com/audio/om-chant.aac', 600),
  ('b0000000-0000-4000-8000-000000000012', 'audio', 'placeholder', 'rain',            'https://example.com/audio/rain.aac', 3600),
  ('b0000000-0000-4000-8000-000000000013', 'audio', 'placeholder', 'flute-raga',      'https://example.com/audio/flute-raga.aac', 3600),
  ('b0000000-0000-4000-8000-000000000014', 'audio', 'placeholder', 'temple-bells',    'https://example.com/audio/temple-bells.aac', 3600),
  ('b0000000-0000-4000-8000-000000000015', 'audio', 'placeholder', 'hanuman-chant',   'https://example.com/audio/hanuman-chant.aac', 900);

-- ---------- exercises ----------
insert into exercises (id, slug, name_hi, name_en, instructions_hi, instructions_en,
  video_media_id, body_areas, modes, level, default_sets, default_reps,
  default_duration_seconds, default_rest_seconds, status) values
  ('c0000000-0000-4000-8000-000000000001', 'surya-namaskar', 'सूर्य नमस्कार', 'Surya Namaskar',
   'धीरे-धीरे शुरू करें, सांस के साथ तालमेल रखें।', 'Start slowly; sync each move with your breath.',
   'b0000000-0000-4000-8000-000000000001', '{full_body}', '{home}', 'beginner', 3, 5, null, 45, 'published'),
  ('c0000000-0000-4000-8000-000000000002', 'dand-baithak', 'दंड बैठक', 'Dand Baithak',
   'पीठ सीधी रखें।', 'Keep your back straight.',
   'b0000000-0000-4000-8000-000000000002', '{legs,core}', '{home}', 'beginner', 3, 12, null, 30, 'published'),
  ('c0000000-0000-4000-8000-000000000003', 'squats', 'स्क्वैट्स', 'Squats',
   'घुटने पंजों से आगे न जाएं।', 'Knees behind toes.',
   'b0000000-0000-4000-8000-000000000003', '{legs}', '{home,gym}', 'beginner', 3, 12, null, 30, 'published'),
  ('c0000000-0000-4000-8000-000000000004', 'plank', 'प्लैंक', 'Plank',
   'शरीर एक सीधी रेखा में।', 'Body in one straight line.',
   'b0000000-0000-4000-8000-000000000004', '{core}', '{home,gym}', 'beginner', 3, null, 30, 30, 'published'),
  ('c0000000-0000-4000-8000-000000000005', 'bhujangasana', 'भुजंगासन', 'Cobra Pose',
   'कमर पर ज़ोर न डालें।', 'Do not strain your lower back.',
   'b0000000-0000-4000-8000-000000000005', '{back,core}', '{home}', 'beginner', 2, null, 40, 30, 'published'),
  ('c0000000-0000-4000-8000-000000000006', 'jumping-jacks', 'जंपिंग जैक्स', 'Jumping Jacks',
   'हल्की गति से शुरू करें।', 'Start at an easy pace.',
   'b0000000-0000-4000-8000-000000000006', '{full_body}', '{home,gym}', 'beginner', 3, null, 30, 15, 'published');

-- ---------- sounds ----------
insert into sounds (id, name_hi, name_en, kind, deity_id, audio_media_id, duration_seconds, status) values
  ('d0000000-0000-4000-8000-000000000001', 'ॐ जाप — मंद स्वर', 'Om Chanting (low)', 'chant', null, 'b0000000-0000-4000-8000-000000000011', 600, 'published'),
  ('d0000000-0000-4000-8000-000000000002', 'वर्षा की ध्वनि', 'Gentle Rain', 'sleep', null, 'b0000000-0000-4000-8000-000000000012', 3600, 'published'),
  ('d0000000-0000-4000-8000-000000000003', 'बांसुरी — रात राग', 'Flute — Night Raga', 'sleep', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000013', 3600, 'published'),
  ('d0000000-0000-4000-8000-000000000004', 'मंदिर की घंटियाँ', 'Temple Bells', 'ambient', null, 'b0000000-0000-4000-8000-000000000014', 3600, 'published'),
  ('d0000000-0000-4000-8000-000000000005', 'हनुमान चालीसा चैंट', 'Hanuman Chalisa Chant', 'jap_loop', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000015', 900, 'published');

-- ---------- mantras ----------
insert into mantras (id, deity_id, text_devanagari, transliteration, meaning_hi, meaning_en, status) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'ॐ हं हनुमते नमः', 'Om Ham Hanumate Namah',
   'हनुमान जी को नमन — बल और साहस का मंत्र।', 'Salutations to Hanuman — mantra of strength and courage.', 'published'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
   'ॐ नमः शिवाय', 'Om Namah Shivaya',
   'शिव जी को नमन — शांति का पंचाक्षर मंत्र।', 'Salutations to Shiva — the five-syllable mantra of peace.', 'published');

-- ---------- meals ----------
insert into meals (id, name_hi, name_en, items, kcal, meal_time, diet_types, status) values
  ('f0000000-0000-4000-8000-000000000001', 'नाश्ता — बेसन चीला', 'Breakfast — Besan Chilla',
   '[{"text_hi":"बेसन चीला — 2, हरी चटनी","text_en":"Besan chilla x2 with green chutney","veg":true},
     {"text_hi":"केला + 5 भीगे बादाम","text_en":"Banana + 5 soaked almonds","veg":true},
     {"text_hi":"दूध (हल्दी) — 1 गिलास","text_en":"Turmeric milk — 1 glass","veg":true}]'::jsonb,
   620, 'breakfast', '{veg,sattvic}', 'published'),
  ('f0000000-0000-4000-8000-000000000002', 'दोपहर — दाल रोटी', 'Lunch — Dal Roti',
   '[{"text_hi":"रोटी — 3, अरहर दाल, चावल","text_en":"Roti x3, arhar dal, rice","veg":true},
     {"text_hi":"पालक पनीर + दही","text_en":"Palak paneer + curd","veg":true},
     {"text_hi":"सलाद","text_en":"Salad","veg":true}]'::jsonb,
   840, 'lunch', '{veg,sattvic}', 'published'),
  ('f0000000-0000-4000-8000-000000000003', 'रात — खिचड़ी', 'Dinner — Khichdi',
   '[{"text_hi":"खिचड़ी + घी, लौकी सब्ज़ी","text_en":"Khichdi with ghee, lauki sabzi","veg":true},
     {"text_hi":"सोने से पहले गर्म दूध","text_en":"Warm milk before bed","veg":true}]'::jsonb,
   560, 'dinner', '{veg,sattvic}', 'published');

-- ---------- templates ----------
insert into workout_templates (id, name_hi, name_en, mode, level, est_minutes, status) values
  ('10000000-0000-4000-8000-000000000001', 'पूर्ण शरीर — शुरुआती', 'Full Body — Beginner', 'home', 'beginner', 18, 'published');

insert into workout_template_exercises (template_id, position, exercise_id) values
  ('10000000-0000-4000-8000-000000000001', 1, 'c0000000-0000-4000-8000-000000000006'),
  ('10000000-0000-4000-8000-000000000001', 2, 'c0000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', 3, 'c0000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000001', 4, 'c0000000-0000-4000-8000-000000000005'),
  ('10000000-0000-4000-8000-000000000001', 5, 'c0000000-0000-4000-8000-000000000004');

insert into diet_templates (id, name_hi, name_en, diet_types, total_kcal, status) values
  ('20000000-0000-4000-8000-000000000001', 'सात्विक योजना — 2400', 'Sattvic Plan — 2400 kcal', '{veg,sattvic}', 2400, 'published');

insert into diet_template_meals (template_id, meal_time, position, meal_id) values
  ('20000000-0000-4000-8000-000000000001', 'breakfast', 0, 'f0000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', 'lunch',     0, 'f0000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000001', 'dinner',    0, 'f0000000-0000-4000-8000-000000000003');

-- ---------- program (28 days, day 7/14/21/28 rest) ----------
insert into programs (id, slug, name_hi, name_en, description_hi, description_en, duration_days, status) values
  ('30000000-0000-4000-8000-000000000001', 'strength-home-beginner-28',
   'शक्ति निर्माण — 28 दिन', 'Strength Building — 28 Days',
   'घर पर, बिना उपकरण। 28 दिन का संकल्प।', 'At home, no equipment. A 28-day sankalp.',
   28, 'published');

insert into program_days (program_id, day_number, workout_template_id, diet_template_id, is_rest_day)
select
  '30000000-0000-4000-8000-000000000001',
  d,
  case when d % 7 = 0 then null else '10000000-0000-4000-8000-000000000001' end,
  '20000000-0000-4000-8000-000000000001',
  (d % 7 = 0)
from generate_series(1, 28) as d;

-- ---------- assignment rule ----------
insert into assignment_rules (id, program_id, priority, conditions, status) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 100,
   '{"workout_mode": "home"}'::jsonb, 'published');

-- ---------- devotional items + today's schedule ----------
insert into devotional_items (id, kind, deity_id, text_hi, text_en, source, status) values
  ('50000000-0000-4000-8000-000000000001', 'shloka', 'a0000000-0000-4000-8000-000000000001',
   'बुद्धिर्बलं यशो धैर्यं निर्भयत्वमरोगता। अजाड्यं वाक्पटुत्वं च हनुमत्स्मरणाद् भवेत्॥',
   'Wisdom, strength, fame, courage, fearlessness and health come from remembering Hanuman.',
   'Hanuman Stuti', 'published');

insert into daily_devotional (on_date, deity_id, shloka_item_id, mantra_id) values
  (ist_today(), 'a0000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001');
