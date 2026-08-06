# UI polish, motion & engagement pass

Owner ask (2026-08-06): "haptics are a mess — fix them, feel polished. A beep at
places is irritating — keep a sound but make it subtle. Add a glinting loader (a
diagonal shine across the workout video). The app feels bland/basic — make it
premium, rich, interactive; add engagement hooks." Boss is the audience.

Scope confirmed with owner: **full visual overhaul + an app-wide motion layer**,
plus **all four engagement hooks** — kept inside the app's existing fence-lines
(warm, no streak-loss guilt, worship never gated, no health claims, Hindi-first,
design-system only).

This is not a feature; it's a cross-cutting polish layer. It adds NO new tables,
NO new network calls, and no new product surface — it makes what exists feel
alive. Everything routes through `src/ui/` (design-system rule) so a single
change lifts every screen.

## Non-negotiables carried in

- **Design system only.** New motion + surfaces live in `src/ui/` as tokens and
  base components. No screen gets one-off colors/durations. Gold stays reserved
  for the primary action + the streak.
- **Hindi-first i18n.** Any new user-facing string goes in the catalog as a
  {hi,en} pair; render via `<B>`/`t()`. No hardcoded copy.
- **No health claims.** Celebration/hook copy stays effort- and devotion-based
  ("आज का दीया जल गया"), never an outcome or body claim.
- **No guilt.** Streak/milestone hype is encouragement, never loss. A broken
  streak still reads as "begin again", per docs/specs/tracking-streaks.md.
- **Worship never gated.** The daily-reward reveal and any hook never sit
  between the user and aarti/mantra/jap.
- **Low-end Android.** Animations run on the UI thread (Reanimated 4 worklets,
  already wired in babel.config.js) — not JS-thread `setState` loops. Respect
  the OS "reduce motion" flag. Everything degrades to a static, correct frame.
- **Honesty of numbers.** The daily-reward reveal shows the *real* app-open
  bonus already banked by `watchCheckIn` (migration 0020) — it reveals, it never
  invents or double-awards points.

## Slices (each ships independently: typecheck+lint+build green, verified in
preview, /code-review, progress.md updated)

### Slice A — Motion foundation (`src/ui/`)
The substrate every later slice reuses. No screen behaviour changes yet.
- `src/ui/motion.ts` — motion tokens: durations (`fast 140`, `base 220`,
  `slow 360`), spring presets (`press`, `gentle`), and a `useReduceMotion()`
  hook wrapping `AccessibilityInfo.isReduceMotionEnabled`.
- `PressableScale` — Reanimated press-spring (scale→0.96 on pressIn, spring
  back) that also fires the press haptic. `Button` and pressable `Card` adopt it
  so *every* tap in the app gets a consistent spring + tactile ack.
- `Shimmer` — the diagonal shine (Slice C consumes it). A gradient band rotated
  ~20° swept across an `overflow:hidden` parent on a Reanimated loop, with a
  rest gap between sweeps. Props: `mode` = `"loading"` (skeleton base + sweep) |
  `"sheen"` (subtle sweep over existing content).
- `AnimatedNumber` — rAF count-up from previous→next value (cross-platform, no
  native dep), tabular-nums, honours reduce-motion (snaps).
- `CelebrationBurst` — radiating gold diya-sparks/rays that scale out and fade
  (SVG + Reanimated). Devotional, not confetti. Reused by both completion
  screens. Fires once, self-cleans.
- `Entrance` (or `entering` presets) — fade+rise on mount with a `delay` for
  stagger, built on Reanimated layout animations; no-ops under reduce-motion.

### Slice B — Haptics + sound, fixed (asks #1 + #2)
Root cause of "mess": the `Button` component fires **no** haptic, so most taps
feel dead, while a few call-sites buzz. Root cause of "irritating beep":
`feedback.tap()` fires **sound on every jap count / every set** (108 beeps a
mala), and the SFX are placeholder sine tones.

- Re-cut the `feedback` vocabulary in `src/lib/feedback.ts` so **sound only
  fires on meaningful, low-frequency outcomes**; high-frequency taps are
  haptic-only:
  - `press()` — light impact, **no sound** (every Button/Card).
  - `select()` — `selectionAsync`, **no sound** (chips, option rows, toggle,
    sound picker, tab switch).
  - `count()` — light impact, **no sound** (jap per-count, per-set). Optional
    medium impact at jap milestones 27/54/81 — still no sound.
  - `success()` — medium impact + soft sound (mala 108, plan assigned).
  - `complete()` — success-notification + warm chime (workout done).
  - `chime()` — light impact + soft bell (meditation end).
  - `error()` — warning + soft two-tone (destructive confirm).
- Regenerate the 5 SFX as **softer, warmer, low-amplitude** placeholders (peak
  ~0.25, gentle attack/decay, warmer fundamentals) via a scratchpad Node
  generator; **same filenames**, each <30 KB. Also set `player.volume` low in
  the service as a second safety. (Still placeholders — the sound-designer swap
  note in assets/sfx/README.md stands.)
- Wire consistently: `Button`/`Card` → `press()`; `Chip`/`OptionRow`/
  `SelectCard`/`Toggle`/sound tiles/tab bar → `select()`; jap → `count()` +
  `success()` at 108; workout set → `count()` (drop the per-set sound).
- `Button` gets an optional `haptic` prop (`"press"` default | `false`) so a
  button whose handler already fires a stronger semantic haptic
  (complete/success/error) can suppress the double.

### Slice C — Video glint loader (ask #3)
- Apply `Shimmer` to `AvatarTile` (the workout video hero, used by exercise
  detail, session, template): a subtle continuous diagonal **sheen** so the
  media surface reads as premium/alive, plus a `loading` prop that shows the
  stronger skeleton-shine. Built so that when real Bunny video is wired later,
  the shine plays during buffering and stops on first frame. No real player is
  added in this pass (none exists today — every "video" is this placeholder).

### Slice D — Rewarding completions + live momentum (hooks 1, 2, 4)
- Workout completion (`app/workout/session.tsx`) + meditation completion
  (`app/meditation/session.tsx`): `CelebrationBurst` behind a blooming
  `DiyaIcon`, `AnimatedNumber` count-ups on the stat row, and a Fit-Points
  "+N" pop for signed-in users (reads the real slice-5 points).
- Home (`app/(tabs)/index.tsx`): streak number counts up on focus; the week
  diya-row lights up in a stagger; `DiyaIcon` gets a subtle flame glow when the
  streak is active; a milestone banner appears when a milestone day is reached
  (encouragement copy, never loss). PointsRow: `AnimatedNumber` total + a thin
  animated milestone-progress bar (fraction from `current_streak` →
  `next_milestone_day`). Subtle `sheen` on the shloka hero.

### Slice E — Daily reward reveal (hook 3)
- A Home "आज का आशीर्वाद / Today's blessing" card that reveals the **already-
  banked** app-open bonus (honest — reads points/check-in state, no double
  award). Tap → flip/scale reveal → "+N Fit Points" + a short devotional line;
  once revealed for the IST day, a calm "come back tomorrow" rest state
  (revealed-date stored per-IST-day in AsyncStorage). Guests see the sign-in
  invitation instead. Never blocks worship; lives below the shloka.

### Slice F — Full visual overhaul pass (per screen)
Apply the Slice-A motion + richer surfaces across every screen, in demo-path
priority order: Home → workout (tab/template/exercise/session) → meditation →
jap → sleep → progress → settings/onboarding/auth/plan-ready. Entrance stagger,
press-springs (free via Button/Card), animated `ProgressBar` fills, richer
gradients/depth within the existing token palette, and per-surface shine where
it earns its place. No new colors — depth comes from the existing ink/surface/
saffron/gold ramp.

## Build & verification order
Foundation first (A), then the three concrete asks (B, C) and the first
"wow" (D) — verify in the web preview and share a screenshot with the owner for
an aesthetic read **before** grinding through the full per-screen overhaul (E,
F). Haptics can't be verified on web (expo-haptics no-ops there) — verify sound
gating + visuals in preview and call out the haptics as device-only.

## Explicitly out of scope
Real video playback (no player exists yet; that's its own slice), payments, any
new backend, new product surfaces. This pass only re-skins and animates what
Slices 1–7 already shipped.
