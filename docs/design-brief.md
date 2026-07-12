# Fit Hindu — Design Brief & Mockup Prompt

> Purpose: get the *look and feel* right before writing app code. This doc is
> both a **brief** (what the app should feel like) and a **copy-paste prompt**
> (bottom section) to generate HTML mockups. Once the mockups are approved, the
> palette/type/spacing here get frozen into design tokens in `app/ui/`, and
> every screen is assembled from those (CLAUDE.md standing rule: design system
> only, no one-off styles). Working name "Fit Hindu"; company Herbal Deck.

## How design fits the workflow (where this sits)

```
design brief (this doc)
  → generate HTML mockups of the 6 core screens, phone-size (360–412px wide)
  → review on a phone-width window with owner/team → iterate to "yes, that"
  → freeze tokens (color/type/spacing/radius) + ~8 base components in app/ui/
  → /screen builds each real screen ONLY from those tokens + components
```

This matches Phase 2 in docs/schedule.md ("HTML mockups of 6 core screens →
review → design system locked"). Do the mockups as throwaway HTML first — they
are cheap to change and expensive to skip. Do **not** start Expo screens until
the design system is locked.

## Audience → design implications (non-negotiable)

- **Hindi-first, wide age range** → large default type (min 16–18px body),
  high contrast, big tap targets (≥48dp), minimal steps, no tiny secondary text.
- **Mid-range Android, Jio/Airtel data** → light assets, no heavy animation,
  fast first paint, works on 360px width.
- **Devotional + fitness in one app** → warmth and trust first, energy second.
  It should feel like a respectful daily ritual, not a gym app or a medical app.
- **Hindi + English** → every string in both; Devanagari must render
  beautifully, not as an afterthought. Pick a font that's first-class in both
  scripts.

## Design north star (5 principles)

1. **Warm & devotional, never partisan.** Temple/festival warmth — saffron,
   marigold, diya glow, soft gold — not political imagery. (See CLAUDE.md
   devotional-framing rule.)
2. **Calm enough to open every morning.** The home screen is the habit surface;
   it should feel serene and uncluttered, one clear "what do I do today."
3. **One system, two moods.** Fitness sections read energetic; meditation /
   mantra / sleep sections read calm and cool. Same tokens, different accent.
4. **Big, legible, forgiving.** Designed for a 55-year-old parent and a 20-year-
   old, on a cheap phone, one-handed.
5. **Content-shaped, not hardcoded.** Cards, lists, and players are generic
   components fed by content (programs/exercises/mantras) — mirrors the
   platform architecture.

## Visual direction (starting point — confirm/adjust in review)

### Color — devotional-warm core, calm-cool secondary
Roles (starting hexes; lock during review). Provide both light & dark.

| Role | Light | Use |
|---|---|---|
| Primary (saffron/kesari) | `#E8751A` | brand, primary buttons, active states |
| Primary-deep (sindoor/maroon) | `#8E2B2B` | headers, emphasis, devotional accents |
| Gold (diya glow) | `#E8B04B` | streak/achievement, highlights, festival |
| Calm (meditation/sleep) | `#2E6E7E` (deep teal) | meditation/mantra/sleep surfaces |
| Background (cream) | `#FFF8EE` | app background, warm not clinical white |
| Surface | `#FFFFFF` | cards |
| Text-strong | `#2A211B` | headings/body (warm near-black) |
| Text-muted | `#6B5E54` | secondary text |
| Success/energy | `#3E8E5A` | fitness progress, "done" |
| Danger | `#C4452F` | errors, destructive |

Dark mode: warm charcoal background (`#1A1512`), lifted surfaces, same accent
hues at slightly higher brightness. **Theme-aware from day one.**

### Typography — Hindi-first, friendly, large
- **Headings/display:** a warm, rounded, Devanagari-capable face — **Baloo 2**
  (friendly, devotional warmth, strong Hindi + Latin).
- **Body/UI:** **Mukta** or **Noto Sans Devanagari** (clean, legible Hindi +
  Latin at small sizes).
- Scale (starting): display 28 / h1 24 / h2 20 / body 17 / caption 14. Min body
  16. Generous line-height (1.4–1.5) for Devanagari matras.

### Shape, spacing, elevation
- Rounded, soft: card radius 16, button radius 12, pill controls for filters.
- 8-pt spacing grid (4/8/12/16/24/32).
- Soft, low shadows (warm-tinted), not hard material elevation.

### Iconography & imagery
- **Custom avatar** demonstrates exercises — hero of the workout screens; design
  around showcasing it (large video card, clean frame).
- Devotional motifs used tastefully: diya, om/deity silhouettes, marigold/
  toran borders on festival states — decorative, never the whole UI.
- Simple line icons, rounded, consistent weight.

### Motion
- Minimal and cheap: gentle fades, a subtle "plan ready" celebration, a diya/
  glow micro-moment on streak milestones. Nothing that taxes a mid-range GPU.

## Base component inventory (~8 — these become `app/ui/`)

1. **Button** (primary / secondary / ghost; full-width mobile default)
2. **Card** (content card: image/video thumb + title + meta; the workhorse)
3. **DailyCard / SectionHeader** (home "today" blocks with a title + action)
4. **ListRow** (icon + label + chevron; settings, plan days)
5. **VideoPlayer frame** (thumbnail → HLS player, avatar-video hero)
6. **Timer/Counter** (meditation timer + mantra-jap mala counter — shared dial)
7. **Progress/Streak** (ring or bar + streak flame/diya)
8. **Pill/Chip** (level tags: beginner/intermediate/advanced; filters)
9. **Input & Radio/Checkbox** (questionnaire) — DPDP: checkbox unticked default

Plus tokens: `colors`, `typography`, `spacing`, `radius`, `shadow`.

## The 6 core screens to mock (phone-size, hi + en)

1. **Onboarding questionnaire** — one question per screen, big options, progress
   dots, ends on a "aapka plan taiyaar hai" celebration. (Keystone.)
2. **Daily home** — the habit surface: greeting + deity-of-the-day + today's
   workout / diet / meditation / mantra cards + streak. Most polished screen.
3. **Workout player** — avatar video hero, exercise list, sets/reps, "next".
4. **Diet day view** — today's meals, veg-first, simple.
5. **Meditation / mantra jap** — timer dial, sound picker, jap counter (108/mala),
   deity selector.
6. **Sleep sounds** — calm dark surface, sound list, timer.

## Constraints checklist (for whoever/whatever generates screens)

- [ ] Only tokens above — no one-off colors/fonts/spacing.
- [ ] Every string in Hindi + English (show Hindi as primary in mockups).
- [ ] Handle loading / empty / error / success states, not just the happy path.
- [ ] 360px width baseline; large tap targets; high contrast; theme-aware.
- [ ] Health disclaimer visible where required (onboarding, first workout) — see
      docs/research/compliance.md; keep copy descriptive, never curative.
- [ ] Devotional-cultural, never politically partisan.

---

## Copy-paste prompt (to generate the mockups)

> You are designing high-fidelity mobile mockups for **Fit Hindu**, a Hindi-
> first devotional-fitness Android app for a wide-age Hindu audience in India.
> Produce a single self-contained HTML file showing the 6 core screens
> side-by-side, each in a 390×844 phone frame.
>
> Use this exact design system (define once as CSS variables, reuse everywhere):
> [paste the Color, Typography, Shape/spacing, Component sections above].
>
> Screens: [paste "The 6 core screens" list].
>
> Rules: Hindi as the primary language shown (English label under headings where
> helpful); large legible type (min 16px body); big tap targets; warm devotional
> feel (saffron/marigold/gold + calm teal for meditation), never political
> imagery; rounded soft cards; theme-aware (include a light and a dark example);
> show a health disclaimer on onboarding and the workout screen; feature the
> custom avatar as a large video card on the workout screen. No external assets
> — use CSS shapes, emoji, or inline SVG placeholders for imagery.

Adjust the palette/type in review, then update this doc so it stays the source
of truth, and freeze the final values as tokens in `app/ui/`.
