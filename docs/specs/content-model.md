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

The content team must run ALL of this without engineering. Two clearly
separate areas (decision 2026-07-13):

**1. Library** — atomic content CRUD; the fitness lead's primary workspace.
Exercises, sounds/audio tracks, meals, mantras, devotional items. Each form
is the object's fields + its media slot(s).

**2. Compose** — assemble library items into ordered compositions:
workout templates (drag-reorder exercises, per-slot set/rep overrides), diet
day templates, programs, and later composed sound sessions
(`sound_sessions` + items with optional pause_after_seconds — additive
migration when built). Never copies — compositions reference library rows.

**The upload-into-placeholder flow (the core interaction):**

1. Admin navigates to the exact slot: Library → Exercises → Chest →
   "Incline Pushup" (or creates the exercise right there).
2. The form has an upload field — drag the avatar demo video in.
3. **Video**: the browser uploads the file **directly to Bunny Stream**
   over TUS, using a short-lived, single-video signature the panel server
   mints on request (Vercel's serverless functions cap request bodies at
   4.5MB — proxying a real video through them fails, so the binary bypasses
   our server entirely). The raw Bunny API key never leaves the server;
   only the derived, expiring signature reaches the browser. Once the
   upload finishes, the browser tells the panel server to write the `media`
   row and set the exercise's `video_media_id`.
   **Audio/image**: small enough to keep proxying through the panel server
   with a server-side key that never touches the browser, same as before.
4. Either way, the panel writes a `media` row and sets the target FK —
   one action, no separate "media manager" step required.
5. **Inline preview player renders immediately after upload** so the team
   verifies the right file landed in the right slot (this one detail
   prevents most content mistakes).

Same flow for audio: Library → Sounds → Sleep → "Rain" → upload MP3 → saved
→ preview plays. Until an upload happens, the slot shows the placeholder
state — the app renders a placeholder tile for content whose media is
missing, so content can be authored before videos are shot. Note: long
audio (e.g. a 60-min sleep track) has the same latent Vercel body-size risk
as video did — not yet hit, not yet fixed; see docs/decisions.md.

Also in the panel: questionnaire-mapping editor (answers → program),
devotional calendar (deity days, festivals, daily shloka), draft → published
states (published is all the app can read — enforced by RLS, not UI).

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
