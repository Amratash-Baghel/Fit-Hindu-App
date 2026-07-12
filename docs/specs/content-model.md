# Spec — Content Model & Admin Panel

> Status: CONFIRMED direction 2026-07-12. The platform backbone — everything
> user-facing is assembled from admin-authored content objects. Data-model
> design session (Phase 2) turns this into the actual migration; use plan
> mode for that session.

## The 5 layers (bottom → top)

1. **Media** — video/audio files live in Bunny (never in DB/Supabase storage).
   DB stores id/URL + metadata. Swappable behind one layer.
2. **Content objects** (the atoms; all named + created in admin):
   - **Exercise** — see workout spec (name hi/en, avatar video, body areas,
     modes, level, defaults, instructions).
   - **Sound** — admin **uploads and adds sounds** exactly like exercise
     videos: name (hi/en), audio file, type (meditation chant / ambient /
     sleep / jap loop), deity tag, duration. One library feeds meditation,
     sleep, and jap sections.
   - **Meal / diet item** — name, items list, kcal, diet-type tags, timing.
   - **Mantra** — deity, text (Devanagari), meaning (hi/en), chant audio ref.
   - **Devotional item** — shloka/quote of the day, festival greeting.
3. **Templates** — ordered compositions of objects: workout template (ordered
   exercise refs + per-slot set/rep overrides), diet day template (meal refs).
4. **Programs / plans** — multi-day schedules of templates + the
   questionnaire mapping rules that assign them. Program-scoped, never
   product/deity/goal-hardcoded (standing rule).
5. **Scheduling / surfacing** — deity-of-the-day, daily shloka rotation,
   festival calendar entries, notification templates.

**The reuse rule:** a customised plan *references* the specific exercise/meal
object and places it — never copies it. Editing an object in admin propagates
everywhere it's used.

## Admin panel (Next.js, `admin/`)

The content team must run ALL of this without engineering:

- CRUD for every object type above; **upload video → Bunny** and **upload
  sound → Bunny** from the panel (panel gets upload keys; app gets playback
  URLs).
- Template & plan builders (pick objects, order them, set overrides).
- Questionnaire-mapping editor (answers → plan template).
- Devotional calendar (assign deity days, festival content, daily shloka).
- Draft → published states; published content is what the app reads.

## Rules

- Everything hi + en at the content level (name_hi, name_en, …) — the app's
  language mode decides what renders.
- RLS: content tables public-read (published only), admin-role write.
- App reads via typed queries; content shape changes are migrations.

## Not doing (v1)

- No in-panel video editing/trimming. No AI content generation.
- No versioning/rollback beyond draft/published.
- No per-user content permissions (one content team).

## Open for the data-model session

- Exact table shapes + enum lists (body areas, modes, sound types).
- Draft/publish mechanics; how plan customisation per user is stored.
- Bunny library structure (per content type vs single library).
