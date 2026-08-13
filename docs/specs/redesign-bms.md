# Redesign — BMS (Body · Mind · Soul)

Owner meeting 2026-08-11. New product direction + USP: **BMS / "Bomiso" — Body,
Mind & Soul** (Hindi framing: **तन · मन · आत्मा**). Inspiration: WHOOP's polish
(rings, dark premium surfaces, calm data) — but radically simpler UX for our
audience. The devotional identity stays the emotional core; BMS is the
structure it lives in.

Status: **phase 0 built on the `redesign` branch as a working in-app mockup**,
pending owner review. Everything below phase 0 is planned, not built.

---

## The BMS structure

Every module lives under one of three pillars:

| Pillar | Hindi | Ring color (token) | Modules (v-now) | Modules (later) |
|---|---|---|---|---|
| Body | तन | `pillar.body` (saffron) | Exercise, Diet | AI custom workout plan* |
| Mind | मन | `pillar.mind` (serene indigo) | Meditation | **Daily Gita** (cards: shloka + meaning + wisdom) |
| Soul | आत्मा | `pillar.soul` (gold) | Mantra Jap, Sleep sounds | Mantra Ucharan, Bhajan/Mantra Alarm |

*AI custom workout plan conflicts with the standing rule "plans are rule-based
in v1; the AI exception is scoped to diet only". Needs an explicit owner
override recorded in docs/decisions.md before it is built.

Activity → pillar mapping (`src/lib/pillars.ts`), from `ActivityType`:
body = `workout`, `meal` · mind = `meditation` · soul = `jap`, `sleep_sound`.
(`devotional` deliberately not counted in any ring — worship is never a task
to tick off; see fence-lines.)

## Phase 0 — the reviewable shell (THIS SLICE, built)

### 1. New launch splash (`src/ui/BmsSplash.tsx` + `src/ui/bms/art.tsx`)
Premium, on the warm-black ink field (seamless into the app — no more oxblood
launch field; the plan-ready ceremony keeps its oxblood look, unchanged):
1. A fit man in meditation pose (padmasana silhouette) fades up at center.
2. A warm glow blooms behind him (radial gold — "enlightened at the centre").
3. Lotus petals unfold one-by-one in an arc (halo) around him.
4. Wordmark **Fit Hindu** + tagline **"Unlock your Body, Mind & Soul" /
   "तन, मन और आत्मा को जगाइए"** rise at the bottom.
5. Cross-fade into Home (already mounted underneath).

Same engineering contract as the old CeremonySplash (kept in tree until the
redesign ships): Reanimated on the UI thread, reduce-motion → static + fade,
min beat 1.2 s, 6 s hard timeout, wall-clock state transitions.
`app.json` splash background flips `#5C1A1C` → `#0F0B07` (ink); a new native
splash-icon asset is needed before the next native build (old emblem PNG is
still referenced).

### 2. Home = three rings (`app/(tabs)/index.tsx`)
Greeting + deity chip + settings (kept) → then the hero: **three circles
stacked vertically — Body, Mind, Soul — each wrapped in a circular progress
ring** showing today's completion, e.g. Mind "1/1", Body "0/2". Tap a circle →
that pillar's page. Below the rings the existing devotional layer stays:
today's shloka card, sankalp/streak card (with Fit Points), daily blessing.
Data: today's `daily_activity.types` (one row, IST) via `usePillars()`;
guests see 0-rings + the existing sign-in invitation on the sankalp card.

### 3. Navigation: 4 tabs (`app/(tabs)/_layout.tsx`)
Home · तन Body · मन Mind · आत्मा Soul. The five old module screens
(workout/diet/meditation/jap/sleep) stay in the tabs group as **hidden routes**
(`href: null`) — every existing deep link and `router.push` keeps working, and
the tab bar stays visible inside modules so there's always a way back.

### 4. Pillar pages (`app/(tabs)/body.tsx`, `mind.tsx`, `soul.tsx`)
- **Body**: two big tiles filling the screen — Exercise, Diet.
- **Mind**: Meditation tile + Daily Gita tile (coming-soon, non-tappable).
- **Soul**: Jap + Sleep tiles, then a coming-soon row: Mantra Ucharan,
  Bhajan Alarm.

### 5. Workout: muscle-model filter (`src/ui/BodyModel.tsx`)
In the workout screen's Custom tab, the body-area chip row becomes a
**front + back human SVG with multi-selectable muscle regions** (chest,
shoulders, arms, core, legs, back — the existing `BodyArea` enum), like the
bajrangvati.in web selector. Selection = saffron fill; selected set filters
the exercise grid (union of areas, deduped); empty selection = full body.
Premade workouts stay listed first on Home/Gym tabs (unchanged).
NOTE: bajrangvati.in is OTP-gated so the reference wasn't viewable this
session — geometry is our own; refine after seeing theirs.

### 6. Tokens (`src/ui/tokens.ts`)
New `pillar` namespace: body = saffron, mind = new serene indigo `#8FA3E8`
(harmonizes with the night/sleep palette; chakra-appropriate for mind), soul =
gold. **Amends the "gold = button+streak only" guidance**: gold now also means
the Soul pillar (devotional gold) — needs owner sign-off.

## Phase 1 — ship the shell
Owner review → apply feedback → typecheck/lint/review gauntlet → Hindi copy QA
→ update native splash assets → ship. Remove CeremonySplash if the new splash
is approved. Streak/points/notifications untouched.

## Phase 2 — Body deepening
- Refine muscle model against the bajrangvati.in selector (need login access
  or screenshots from the web team; ideally share the SVG source so app + web
  use the same body geometry).
- AI custom workout plan from onboarding answers (n8n pattern like diet) —
  **blocked on owner override** of the rule-based-plans rule + decision-log
  entry. Same guardrails as diet AI: general wellness only, disclaimer.

## Phase 3 — Mind: Daily Gita
New content type in the programs platform (admin-authored, never hardcoded):
`gita_cards` (shloka Sanskrit + Hindi/English meaning + short wisdom note,
ordered series + daily scheduling). Card/tile UI (FlipCard exists), daily
card on the Mind page, later a reading streak. Extends to other literature
series (Ramcharitmanas, Chalisa explanations) — it's a series content type,
not a Gita-only table. Migration + admin CRUD + spec: `docs/specs/daily-gita.md`.

## Phase 4 — Soul deepening
- **Mantra Ucharan**: guided pronunciation player (audio + syllable
  highlighting later). Content-model driven per deity/mantra.
- **Alarm**: wake alarm with regular sounds + mantras/bhajans; each sound
  carries a **benefit line** (e.g. "ब्रह्म मुहूर्त की ऊर्जा — शांत जागरण के
  लिए 440 Hz स्वर"). Copy rule: benefits stay devotional/wellness-descriptive
  ("energising", "peaceful start", "connects your morning to your ishta") —
  never curative/medical claims. Sound library + benefit metadata also
  backfills the existing sleep sounds screen.
- Sound benefit metadata: `sounds` content gets `benefit_hi/benefit_en` +
  frequency/tag fields, authored in admin.

## Phase 5 — the content library at scale
The BMS direction needs a large mantra/shloka/Gita library with explanations.
That is an admin-panel + content-pipeline effort (content team authors,
engineering never in the loop): series, cards, audio, per-deity mantra sets —
all inside the existing programs platform model. Separate spec once phase 3
proves the card format.

## Open questions for owner (asked 2026-08-11)
1. Tab bar: 4 tabs (Home/Body/Mind/Soul) as built, or no tab bar (pure
   push-navigation from the rings)?
2. Home below the rings: shloka + streak + blessing kept — right call, or
   should home be rings-only with devotional content moved elsewhere?
3. Soul = gold ring (amends gold-usage rule), Mind = new indigo — approve?
4. "Bomiso" — internal shorthand only, or user-facing brand element?
5. AI custom workout plan — confirm owner override of the rule-based rule.
6. Access to the bajrangvati.in muscle selector (login or SVG source from web
   team) to align geometry.
