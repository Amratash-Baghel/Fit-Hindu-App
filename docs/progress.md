# Progress Log

Running build log — one entry per shipped item, newest on top. This is the
standup doc for the owner and the resume-from-home lifeline.

- **2026-08-14 (night) — UI9 slice A: Sleep re-materialized (redesign branch).**
  First slice of the UI9 plan (artifact 4d5592bc, plate 14). Visual + one-behavior
  pass on the sleep tab: saffron → `pillar.mind` indigo everywhere (playing border,
  icon, countdown), sound-row icon wells now use the shared `IconSlot` recast in
  night steel (new `tone="night"`, default `"soul"` so no other caller moves),
  auto-stop is one `SegmentedDial` instead of four chips, a `PlayingGlow` breathing
  indigo ring on the playing row, a `SleepDim` scrim that fades in 30s into playback
  (tap to wake) — both opacity-only on the UI thread and gated on `useMotion`. The
  one sanctioned behavior change: `finishTimer` now fades the sound out
  (`fadeOutStop`, after logging) instead of a hard cut. Wind-down header copy added.
  **The run-logging machinery (refs, `logRunIfQualified`, crash mirror, heartbeat,
  focus-blur stop, `subscribeAudio` sync) is untouched.** Spec: docs/specs/sleep.md
  v2. typecheck + lint green; verified on web preview (indigo playing border, night
  material, no console errors — motion features are device-only); /code-review clean
  (one orphaned string removed). No migration.
- **2026-08-14 (eve) — Reward-on-every-completion + livelier coins + polish
  (owner: "reward screen for every completion, animated with stars… ripples
  more alive like the jap button… polish everything, runs smooth, haptics").**
  Ran a discovery workflow (4 agents) to map every completion surface + the
  aliveness gap + polish/haptic/perf gaps, built the changes, then a review
  workflow (3 lenses × per-finding verify, 11 findings) and fixed all 11.
  **Reward with stars** — `CompletionDiya` now radiates a one-shot `StarField`
  of twinkling gold star-sparks over the rays, so workout/meditation/jap/sleep
  all show the same starry reward; jap's double-haptic removed; sleep + meal +
  diet-plan now play the completion sound; meditation copy lifts in to match
  the workout screen. **Diet completes** — new "Today's meals → I kept my plan
  today" card logs the `meal` activity (stable per-IST-day `client_event_id`,
  idempotent) + fires the reward, and the silent AI plan-ready screen now
  celebrates on the pending→ready transition only. This unblocks Body's ring
  and makes **Purna reachable** (meal was never logged before). **Coins alive**
  — CoinHalo's fading pulse replaced by a constant *breathing* glow bed (jap
  halo grammar; geometry fixed so it rings the coin instead of hiding behind
  it) + one ripple; kept to 2 nodes/coin (6 on Home) after the review flagged a
  3rd node re-growing the lag. **Polish/haptics** — gold CTA presses in like
  metal (`PressableScale sink`), coins sink too; muscle-figure + stop-pill now
  buzz; rest-Skip no longer fires the reward flourish; blessing throws sparks.
  Reverted the review-flagged perf regressions (per-tile + per-button continuous
  glint loops) and two one-off hex literals. Typecheck + lint green; diet
  completion verified in web preview. ⚠️ Dev-client APK must be built by the
  owner (`eas build -p android --profile development`) — no local Android
  toolchain / EAS login on the dev machine.
- **2026-08-14 (pm) — Performance + gold-burst pass (owner feedback: "the app
  is really laggy").** Cut the continuous-animation load the previous sweep
  added, which was stuttering Home on device: **CoinHalo** 5 waves → **2** per
  coin (15 → 6 looping nodes on Home); the **3D lift** (perspective + rotateX)
  is now a plain fade+rise — the "3D scroll" the owner said to drop if it
  slowed things; **PillarTile** lost its per-tile continuous glint; the
  **7-diya week row + task-strip ticks** render static (the prominent diyas —
  streak hero, ring crowns, blessing, completion — keep the flame). **Tap glow
  smoothed**: CoinExpand now grows a fixed 300px SVG raster via GPU transform
  instead of rasterising a full-screen-diagonal gradient from zero (the "glows
  not smooth"); the competing CoinSplash ripple is dropped from the tap so it's
  one clean beat. **Gold burst + haptic** (plan's "gold burst" reward beat) now
  rides every primary **gold Button** on press — a one-shot gold spark burst +
  a firm two-beat haptic (`feedback.goldPress`) — so Set done, Begin
  meditation, Let's begin, etc. feel earned; opt-out via `burst={false}`, and a
  button whose handler fires its own completion haptic (haptic={false}) shows
  the burst without a double buzz. **Purna / progress**: confirmed NOT a bug —
  `logActivity` no-ops for guests by design, so a guest (the "Not now" path)
  logs nothing, rings never fill, Purna never fires and progress stays empty;
  the signed-in path refreshes correctly on focus. Typecheck + lint green;
  clicked through Home + Body in web preview (animations are device-only).
- **2026-08-14 — Mockup-fidelity sweep: living diyas, tap-glow expand, 3D
  lift, hero coins, muscle filter everywhere (`redesign` branch).** Closed the
  owner's gap list against the two approved artifacts (mockup c0604591 + plan
  e7e96b0e): **Diya** — new animated component, the flame sways on the
  mockup's 2.6s flick loop (staggered phases), swapped in everywhere a diya
  shows (streak card + week row, task strip, ring crowns, blessing, jap,
  progress, onboarding, and CompletionDiya — so the reward/complete screens
  now carry the moving flame). **Tap glow** — new CoinExpand: the mockup's
  circular expandTo transition, a pillar-tinted light (coinBurst tokens)
  growing out of the tapped Home coin to cover the screen above the tab
  switch, hosted over the navigator; CoinSplash gained the second delayed
  ripple. **Coins** — sized to the phone (52% of width, cap 200) instead of
  fixed 168; CoinHalo now runs the mockup's full field (3 wire rings + 2
  blooms). **3D scroll** — Reveal gained `lift` (perspective + 9° rotateX
  fold-in); Home's verse/streak/blessing/mirror cards and all pillar tiles
  lift in staggered. **Tiles** — PillarTile meta stats now render gold bold
  values (mockup .t-stat), tiles carry the glint sheen + bigger gold tick.
  **Workout** — the muscle filter (figure + chips) now lives in EVERY mode;
  home/gym filter client-side over `body_areas`, templates still lead.
  **Haptics** — reworked to the mockup map: light press tick, pattern-based
  success/complete ([12,40,18]), blessing flutter ([10,30,14] + soft bell via
  new feedback.reveal), Purna adds the completion ring over rewardBurst.
  **Tab bar** — done-point is now a lit dot (glow halo). Typecheck + lint
  green; clicked through web preview (guest home → body → workout filter →
  mind/soul); /code-review medium run, 2 findings fixed.
- **2026-08-13 — v2 mockup delta pass: twin-point gaze, content-sized tiles,
  hero saadhana count, English-first verse (`redesign` branch).** Caught up
  the app to the refreshed app-native mockup (artifact c0604591): **splash**
  — the gaze is now a twin-point flare (two round halos, one per eye) instead
  of one wide bar, eyes tightened and given pinpoint catchlights, ambient
  glow/halo/floor dimmed to match; **pillar tiles** (Body/Mind/Soul) —
  content-sized instead of flex-split (a tile with no meta row used to leave
  half the card empty), screens scroll now, each tile carries a gold tick
  once today's practice is logged (new `PillarTile` `done` prop, wired from
  `usePillars().todayTypes`); **Home** — the frozen decorative ring backdrop
  behind the coins removed (redundant with CoinHalo's live ambient rings), a
  divider under the header, the saadhana count now reads as a hero number
  (split around the `{n}` token so English's and Hindi's reversed word order
  both land correctly), the streak number gained a "days" caption, the verse
  card is English-first — the translation leads, the Devanagari source sits
  secondary below a divider (Hindi mode still leads with the scripture, since
  there is no English to read). Verified: typecheck ✓ lint ✓ + web
  click-through (Home, Body/Soul tiles with ticks, My Path guest state), no
  console errors. No migrations.

- **2026-08-13 — Concept completion pass: chakra splash, one glow grammar,
  Purna ceremony, month of diyas (`redesign` branch).** Everything the three
  proposal artifacts still called for, applied: **chakra-awakening splash** —
  BmsSplash rebuilt to the app-native mockup's sequence (obsidian meditator
  redrawn as vector in bms/art.tsx, sushumna fills root→crown, seven chakras
  ignite with pulse + body-spill, crown overflow, awakened white gaze, the
  gaze-light takes the screen, wordmark, tap-to-skip, haptic beats; same
  engineering contract — min beat, 6s hard timeout, reduce-motion/web gets
  the finished composition). **One glow grammar** — new `GoldWash` (the
  mockup's full-screen gold bloom) fires on every earned moment: workout and
  meditation completions, the jap/sleep RewardOverlay, the blessing reveal
  (via a new Screen `overlay` slot) and Purna. **Purna is now a ceremony** —
  the three pillar rings draw together into the interlocked trinity, ॐ lands,
  the bloom breathes, sparks radiate, the reward-burst haptic rides it; after
  dismissal Home's saadhana line settles into quiet gold "till midnight".
  **Haptic gaps closed** — tab presses tick (screenListeners), the Home
  settings gear presses like everything else, splash beats ride the chakras.
  **Jap count pops** on every strike (mockup .jap-count.pop). **Month of
  diyas** on My Path — a 28-day weekday-aligned constellation from the same
  30-day fetch (bright gold full days, pillar-tinted part days, dim quiet
  days — never "missed", no red), legend + three monthly balance bars.
  Coin tap-ripple widened to the mockup's open-across-the-screen feel.
  New i18n keys (en+hi): splash_skip, saadhana_settled, mypath_month,
  legend_full/part/quiet. Verified: typecheck ✓ lint ✓ + web click-through
  (splash composition + skip, onboarding → Home evening state, blessing
  flip, jap 108→106, Body tile meta "61 exercises", workout muscle filter,
  My Path guest state). No migrations.
- **2026-08-13 — BMS redesign shell + "new feel" pass (owner demo build,
  `redesign` branch).** The app now looks and behaves like the approved
  clickable mockup (docs/mockups/bms-redesign-v2.html) plus the reviewed
  proposal decks. Shipped, UI-only (haptics deliberately deferred to the next
  pass): **BMS structure** — 4 tabs (Home · तन · मन · आत्मा), pillar pages,
  hidden module routes, BmsSplash, muscle-model workout filter; **3D coin
  rings** on Home (static-SVG bezel/face/aura port of the mockup's medallions —
  cheap on low-end Android); **a surface that keeps time** — greeting + ink
  wash follow the IST clock (Brahma Muhurta → night), evening reorders the
  stack Soul-first; **saadhana count** ("N of 3 complete"); **pillar
  done-states** (diya crown + tab-bar gold dots); **Purna** — once-a-day
  all-three-complete moment; **guest rings say "Begin"**; **My Path** replaces
  /progress (streak + record, weekly तन/मन/आत्मा grid, Fit-Points milestone
  track, one gentle nudge). Under the hood: shared `PillarsProvider` (one
  read feeds rings + tab dots), `daypart.ts`, `pillar`/`daypart` tokens,
  "1 more day" plural fix. Verified: typecheck ✓ lint ✓ `expo export` ✓ +
  web click-through of Home (evening state live) and My Path. Nothing needs
  a migration. `/code-review` (medium): 8 findings, all fixed pre-commit —
  ring order + saadhana total now derive from PILLAR_ORDER, one shared
  istDayKey in daypart.ts, IST-safe week window, memoized pillars context,
  dead RingProgress deleted, coin/ember/scrim palettes promoted to tokens,
  web-safe ring rotation. Next: haptics pass; deferred UI: next-step task
  strip, tile meta-rows, weekly practice mirror, reward-grammar
  consolidation; legacy sweep: istDayKey copies in session/content/progress,
  ember hexes in older screens, art.tsx splash ramp into tokens.
  **Follow-up 2 (same day) — the "complete the concept" pass.** Everything
  outstanding from the three reviewed decks, in one sweep: **named next step**
  (Home task strip — one chip per practice from the platform's own activity
  types, done-states from the rings' read, deep links into modules,
  daypart-ordered); **tiles that speak** (PillarTile meta rows fed by live
  published-content head-counts: countExercises/Mantras/MeditationSounds/
  SleepSounds — verified live: "61 exercises · Home & gym", "4 mantras ·
  108-bead mala"); **the week mirror** ("reflect, never ask": per-pillar
  active-day counts over 7 IST days, mirrored on Home, hidden for guests/
  empty weeks); **one material language** (new `EmberCard` + embossed
  `IconSlot` shared components; Home/My Path/blessing swept onto ember
  tokens — zero gradient hexes left in screens); tab icons now lift when
  active; a still gold mandala sits behind the ring stack (mockup ambience).
  usePillars additionally exposes today's raw types (one fetch feeds rings,
  tab dots AND the strip). Typecheck/lint/export green; guest + pillar pages
  DOM-verified.
  **Follow-up (same day):** the mockup's living medallions — `CoinHalo`
  (ambient pillar-colored ripples: soft bloom + two thin rings breathing
  outward, 3 UI-thread transform/opacity nodes per coin) and `CoinSplash`
  (tap = pillar ripple opening over a gold wash; navigation follows one beat
  behind so the moment reads). New motion tokens `ripple`/`splash`. NOTE:
  these animate on DEVICE only — the project's motion gate renders a static
  faint frame on web/reduce-motion, so demo the feel in Expo Go, not the
  web preview.

- **2026-08-11 — MILESTONE: v1 preserved, redesign starts.** Tagged
  `v1-devotional-fitness` at 2dec26b — the full first build: onboarding +
  guest-first auth, rule-based plan engine, workout (home/gym/custom, session
  player, composed templates), meditation, mantra jap (108 mala), sleep sounds,
  Fit-Points rewards, devotional home, notifications, settings. `onboarding-
  auth-plan-engine` is frozen at this commit; all new work moves to the
  `redesign` branch (branched from the same point). Recover or branch off v1
  anytime: `git checkout v1-devotional-fitness`. From here: a complete app-wide
  redesign.

- **2026-08-11 (follow-up)** — **Reward-burst smoothness, workout-screen lag,
  completion/set-done polish.** Owner reloaded the first batch: the burst felt
  choppy and the screens basic.
  - **Burst = one native vibration pattern**, not 10 JS-`setTimeout` impacts
    (which land late on the busy JS thread while the completion screen animates →
    the choppy feel). Accelerando (pulses lengthen 30→170ms as gaps shrink
    120→25ms) into a 320ms sustained pop synced to the sparks. New
    `feedback.completeChime()` plays the workout sound haptic-free so a
    notification buzz doesn't fight the pattern on the same motor.
  - **Lag:** memoised the exercise video so the per-second timer no longer
    rebuilds it (the heaviest subtree); dropped the JS-timer haptic that hogged
    the thread on completion.
  - **Polish:** completion screen gets a warm gradient backdrop + staggered
    `Reveal` (copy / points / stats assemble in *after* the burst) + a gold reward
    block; the set screen gets a glowing target medallion + set-progress pips
    (gold done · wide saffron current · dim upcoming). tsc + lint clean.

- **2026-08-11** — **Device-feedback fixes: sound overlap, Bunny video/thumbs,
  haptics, reward-burst.** Four issues from the owner's device run of ebc27d5:
  - **Ambient sound stacked + Stop did nothing.** `audio.ts` `playLoop` swapped
    sounds with `player.remove()` and no `pause()` first — on this expo-audio
    build a *looping* player keeps sounding after remove() alone, so every tap
    orphaned an unreachable loop and Stop / Silent / Exit / the sleep timer only
    killed the newest layer. Added a `teardown()` (pause **then** remove) used by
    both the swap path and `stopAudio` → one stoppable player at all times.
  - **Videos + thumbnails blank (fine on the old build).** The `VideoHero`
    rewrite handed the raw Bunny URL to the player with **no Referer header**;
    the Bunny Stream zone 403s referer-less requests → error → placeholder.
    Restored `src/lib/media.ts` (the helper lost when this branch diverged):
    HLS+Referer on native, MP4 on web, `posterUrl` derivation, `imageHeaders`.
    `VideoHero` builds its source via `videoSource()`; `AvatarTile` renders real
    posters again; the workout grid + detail + session pass `posterUrl(thumb,
    video)`. App-side only — Bunny + DB untouched, exactly as the owner deduced.
  - **Haptics silent.** The code was intact and default-on; the curated
    `app.json` Android permission allowlist omitted **`android.permission.
    VIBRATE`**. Added it. ⚠️ needs a dev-client REBUILD to take effect.
  - **Reward-burst haptic (owner ask).** `feedback.rewardBurst()` — a mid-level
    ramp that accelerates then **releases hard in sync with the diya spark burst
    (~1100 ms)**. Fired from `CompletionDiya` via a new `celebrate` prop, on the
    workout-complete screen + the Fit-Points `RewardOverlay` (jap/sleep); calm
    surfaces (meditation) stay gentle. tsc clean; web bundle renders clean.

- **2026-08-10** — **Reward popups, video autoplay, sound-stop, premium polish
  (owner device feedback).** Five fixes after the owner ran the build:
  - **Per-activity Fit-Points reward.** Finishing a workout / meditation / jap
    mala / sleep run now shows an earned-points moment (the lit diya + a
    counting-up **"+N फिट अंक"** + running total). New `src/ui/Reward.tsx`
    (`PointsEarned` block + `RewardOverlay` modal for the jap/sleep tabs) and
    `src/lib/points.ts` `earnSince` — an honest **server before/after diff** of
    `points_summary`, so it respects daily caps (a 2nd same-day workout truly
    shows +0) and never scores on the client. Gated on the write landing, so a
    failed/offline log shows the celebration without a false "already claimed".
  - **Workout video = clean autoplay, no player chrome.** `VideoHero` rebuilt:
    removed `nativeControls`, muted autoplay + loop, fades the stream in only on
    `readyToPlay`, and **falls back to the avatar tile on any playback error**
    (never a black box) with a `__DEV__` error label so a real Bunny/HLS failure
    is diagnosable on device.
  - **Sound now stops when you leave.** The Sleep tab stopped audio only on
    unmount, but tabs stay mounted on a tab-switch → the loop escaped the
    screen. Now stops on **blur** (`useFocusEffect`); a phone-lock (AppState
    background) still keeps playing, as intended for falling asleep.
  - **Premium polish:** workout completion reordered (reward as hero) with the
    stats in a structured card; the Progress/tracker streak is now an ember-
    gradient hero with dividers + a refined 30-day strip.
  - Verified: typecheck + lint (clean on every touched file) + Metro web bundle
    green; `/code-review` run (3 medium findings fixed: local `getSession` read,
    and gating the points diff on write-success at all four sites); clicked
    through jap/workout in the web preview, zero console errors.
  ⚠️ **USER MUST:** ensure **migration 0020** is applied in Supabase or points
  read zero (Home line AND the new reward popups). Video playback, audio-stop,
  and the reward numbers are native / auth-gated — **verify on a device build.**

- **2026-08-08** — **Feel & motion polish pass 2 (owner device feedback).**
  After running the dev build the owner flagged that the motion promised in the
  showcase wasn't landing on the phone. Fixed, all in `src/ui/` + the four
  screens:
  - **Gold-button bloom:** `PressableScale` gained an optional expanding-ring
    "bloom" (the visible twin of the haptic); the gold `Button` now fires it on
    every press. Ghost buttons stay a quiet dip.
  - **Haptics strengthened:** `press` Light → **Medium** (Light was
    imperceptible on most Android motors — "haptics don't work"); added a
    **Heavy** tier; SFX volume 0.7 → 1.0 (the earned chimes were too quiet to
    hear = "beep not functional").
  - **Jap button = a "precious artifact":** rebuilt on Reanimated — every tap
    now fires the **Heavy** haptic (owner override of the old light per-count
    tick — still no beep), dips smaller then springs bigger with overshoot,
    throws a gold ring-burst, and its glowing bed flares; slow breathing halo at
    rest.
  - **Completion diya (workout + meditation):** new `CompletionDiya` — the diya
    now *lights up slowly*, holds ~1.1s, then the spark burst radiates over
    ~1.5s (was an instant 900ms flash).
  - **Daily-blessing tile flip:** new `FlipCard`; the "tap to reveal" tile now
    does a real 3D Y-flip instead of a fade-swap.
  - **Meditation Om:** new `BreathingOm` — layered breathing halos + a session
    progress ring (react-native-svg) + warm backdrop gradient; was a bland
    single pulse.
  - **Audio stop:** `stopAudio()` now `pause()`s before `remove()` so a looping
    player is silenced immediately (was: could play out a beat → "stop doesn't
    work").
  - **Video playback, finally wired:** installed `expo-video` (native) + its
    config plugin; new `VideoHero` in `src/ui/` plays the exercise's HLS
    (`video.playback_url`) and *falls back to the AvatarTile placeholder* for
    null / `example.com` / web (so nothing breaks before real uploads exist).
    Dropped into the session player and the exercise-detail hero. ⚠️ **expo-video
    is a native module — the owner MUST rebuild the dev client** (`npx expo
    run:android` or an EAS dev build); a JS reload will NOT pick it up. And it
    only *shows* video once real exercise media is uploaded via the admin panel
    (the seed URLs are `example.com` placeholders → they keep showing the tile).
  - Typecheck + lint green on the diff (2 pre-existing `set-state-in-effect`
    errors in untouched workout list/template screens remain). Web preview is a
    smoke test only — the motion is intentionally inert on web (`useMotion()`
    gate) and video is native-only, so the owner verifies the real *feel* +
    playback on the dev build.
- **2026-08-06** — **UI polish, motion & engagement (slices A–D of
  docs/specs/ui-polish.md).** Owner ask: fix messy haptics, kill the irritating
  per-tap beep, add a glinting video loader, make the app feel premium/rich/
  interactive (boss said "basic"). Built an app-wide motion layer in `src/ui/`
  so every screen lifts at once:
  - **A — Motion foundation:** `motion.ts` (duration/spring/pressScale tokens +
    `useMotion()` — the web/reduce-motion gate), `PressableScale` (spring-dip +
    haptic, now the base for Button + pressable Card), `Shimmer` (the diagonal
    glint), `AnimatedNumber` (rAF count-up), `CelebrationBurst` (gold diya-sparks,
    not confetti), `Reveal` (entrance/stagger).
  - **B — Haptics + sound, fixed:** re-cut `feedback` so **sound fires only on
    outcomes** (success/complete/chime/error); every press/select/jap-count/set
    is haptic-only — a 108-mala is now 108 taps you feel + 1 chime, not 108
    beeps. Wired press/select haptics through Button/Card/Chip/Toggle/OptionRow/
    SelectCard so the whole app is tactile (was: Button fired nothing). SFX
    regenerated softer/warmer/quieter (peak ~0.22 + reduced player volume);
    `tap.wav` deleted (no per-tap sound anymore).
  - **C — Glint loader:** `AvatarTile` sweeps a diagonal gold shine (idle sheen;
    `loading` mode is the buffering state for a real player later). Off on the
    workout grid thumbnails (`glint={false}`) to avoid 20 loops at once.
  - **D — Rewarding completions + momentum:** workout + meditation completion
    now bloom a `CelebrationBurst` behind the diya with count-up stats; Home
    streak count + Fit-Points total count up, a gold milestone bar shows momentum,
    the week's diyas light in a stagger, and the shloka hero carries a faint sheen.
  - **E — Daily blessing:** a once-per-IST-day tap-to-reveal well-wish on Home
    (the come-back-tomorrow loop). Kept honest and on-brand — the blessing IS the
    reward (no fabricated points the client can't source), never gated, and the
    day's line is chosen deterministically from the IST date, persisted per day.
  - **F — App-wide overhaul:** the `Screen` wrapper now gives every screen a
    gentle fade+rise entrance (one change, whole app assembles in); `ProgressBar`
    gained an opt-in `animated` fill (UI-thread scaleX) used on the session and
    Home-milestone bars; the Progress screen's headline numbers count up and its
    plan bar fills. Press-springs + the glint reach every screen through the
    shared Button/Card/AvatarTile, so the uplift is one consistent motion
    language rather than per-screen redesigns.
  All motion runs on the UI thread (Reanimated 4) and no-ops to a correct static
  frame on web / reduce-motion. Typecheck green; new/edited files lint clean
  (2 pre-existing `set-state-in-effect` errors + 2 unused-import warnings remain
  on untouched workout screens — not introduced here; a follow-up task is
  tracking them). Verified: app boots + interacts across onboarding with zero
  console/server errors in the web preview; motion itself is device-only
  (Reanimated is inert on RN-web, haptics no-op on web) so it's shown via a
  self-contained motion-preview artifact for the owner's aesthetic read.
- **2026-08-05** — **Slice 5 follow-up: sleep-run crash recovery.** Closed the
  reviewer's HIGH finding that a backgrounded sleep run is lost if Android kills
  the app before a JS stop path writes it. New `src/lib/sleepRun.ts`: the run is
  mirrored to AsyncStorage at play-start (`beginSleepRun`), a 30 s heartbeat
  (`markSleepAlive`) records last-known-alive while playing, and
  `reconcileSleepRun` (wired into `app/_layout.tsx` on mount) logs a qualifying
  run on the next launch. `actual_min` at reconcile is the heartbeat span capped
  at the timer — **never** wall-clock-since-start, so a night the app sat killed
  can't be counted as listening. Live log and reconcile share one
  `client_event_id`, so 0012's unique key dedups any double-write —
  `logActivity` gained an optional `clientEventId` (idempotent upsert) for this.
  Residual gap (documented): the lock-immediately case where JS suspends within
  seconds still isn't measurable from JS — needs a native audio-session tracker.
  Typecheck clean; lint at the 2-error baseline (zero added); PGlite 104/104
  (recovery rides on the existing `client_event_id` dedup test); web preview —
  sleep renders clean, launch reconcile no-ops on an empty mirror, zero console
  errors. No migration.

- **2026-08-05** — **Slice 5: Fit Points engine (migration 0020).** A computed
  points layer over `activity_log` that rewards daily engagement without ever
  punishing a miss, tied to the streak. Owner override — points move into v1
  (see `docs/decisions.md` 2026-08-05; spec `docs/specs/points-rewards.md`).
  **Schema (0020):** `points_rules` + `streak_milestones` (admin-tunable config,
  public-read/admin-write), `daily_checkins` (app-open bonus, PK
  `(user_id, ist_date)` = unfarmable, append-only own-row RLS), the
  `points_daily` and `jap_rounds_today` `security_invoker` views, and
  `points_summary(uid)` (`stable`, not security-definer — same RLS contract as
  `streak_state`). Points are **computed, never stored** — no ledger table, zero
  backfill. **Rules:** workout 25 / meditation 15 (≥3 min) / jap 10 +2 per round
  past the 2nd (cap 18) / sleep 8 (≥5 min) / app-open 5 / meal 5×n (dormant, no
  writer yet); milestones 3→108 days (25→1108 pts) awarded off `longest_streak`
  so a break never claws back banked points. **Client:** new `src/lib/points.ts`
  (`usePoints()` mirroring `useStreak()`; `checkIn()` + `watchCheckIn()` fired
  from `app/_layout.tsx` on launch + every foreground, idempotent per IST day);
  a Fit Points row added to the Home sankalp card (`app/(tabs)/index.tsx`),
  signed-in only — a guest keeps the sign-in invitation, never a zero. **Fixed
  `app/(tabs)/sleep.tsx`** to log `sleep_sound` on stop/timer-complete with real
  `actual_min` (guarded, once per run) instead of on the play tap — the old code
  banked a point per tap and recorded nothing about real listening, so the sleep
  rule could never qualify. Types mirrored in `src/types/db.ts`; new i18n
  `{hi,en}` keys. **Verified:** PGlite **102/102** green (was 79 — +23 points
  checks: cap clamping, jap ladder, qualifiers, check-in idempotency +
  not-a-streak, milestone-survives-a-break, zero-history zeroes, user
  isolation, security contract, the double-active-rule guard); typecheck clean;
  lint held at the 2-error baseline (zero added); web preview — Home + Sleep
  render for a guest with zero console errors, points row correctly absent for
  the guest. **Reviewer caught a real currency-minting hole and three lesser
  issues, all fixed before commit:** (1) HIGH — `ist_date` was client-forgeable,
  so a direct REST insert could mint points across fabricated days; now pinned
  in the `daily_checkins` and `activity_log` insert RLS (`ist_date = ist_today()`
  / `between ist_today()-1 and ist_today()`). (2) a second active `points_rules`
  row for one `activity_type` would double-count — a partial unique index now
  forbids it. (3) `streak_milestones.program_id` was a false affordance the read
  path ignored — dropped (milestones are user-level, like the streak). (4)
  `points_summary` now filters `currency='fit'` so a future split is deliberate.
  **Deferred (task chip):** a sleep run is lost if Android kills the app while
  backgrounded (logging is stop-path-only now); the fix is a launch-reconcile
  like `session.ts`. Reverting to log-on-tap is not an option — it reopens the
  farm the ≥5-min rule closes. **Not verifiable here:** the real Supabase
  round-trip and points against genuine multi-day history (needs 0020 applied +
  the physical device); RLS enforcement of the `ist_date` bound (PGlite runs as
  owner, bypasses RLS — spot-check with a real anon session). ⚠️ **USER MUST RUN
  migration 0020 in Supabase.**

- **2026-08-03** — **Slice 3: phone + OTP auth, live end-to-end.** Turned on
  phone sign-in for the Hindi-first audience. Auth stays Supabase (RLS/JWT
  unchanged). Mostly wiring — a channel-agnostic OTP flow already existed from
  the onboarding work, developed against email. Changes: flipped
  `AUTH_CHANNEL` `"email"→"phone"` (`src/lib/auth.tsx`); added a fixed `+91`
  prefix + E.164 normalization on the entry screen (`app/auth/index.tsx`,
  `normalizeLocal`/`toIdentifier` — a 10-digit local becomes `+91…`); added a
  **60s resend cooldown** with a live countdown on the verify screen
  (`app/auth/verify.tsx`, new `auth_resend_in` i18n key). Kept **guest-first**
  (skippable sign-in) per the 2026-07-15 owner decision — explicitly did NOT
  hard-gate the app as the sprint pack's wording suggested. No migration: the
  verified phone lives in `auth.users.phone`, not a new `profiles` column. Spec:
  `docs/specs/auth-phone-otp.md` (CONFIRMED).
  **Verified live against the Supabase project** (test number
  `919109386355`/`123456`, web preview): entry → `signInWithOtp` 200 → verify
  screen shows `+919109386355` + the 60s countdown → `verifyOtp('123456')` →
  **authenticated session** (role `authenticated`, phone attached) → the session
  authorizes a real `activity_log` insert (201) with server-side IST date and an
  own-row read (200, RLS-scoped); test row cleaned up (204). This proves the
  slice's core promise: **auth lights up all the existing `logActivity` call
  sites.** `tsc` + web export green; lint at the pre-existing 2-error/3-warning
  baseline (zero added). Reviewer found two real issues, both fixed +
  re-verified: (1) native `maxLength={10}` truncated a pasted/autofilled full
  number to its *first* 10 raw chars *before* normalization, silently producing
  a wrong-but-valid number — removed `maxLength`, `normalizeLocal` now strips the
  `91` country code from a 12-digit paste (confirmed live: `919109386355` →
  `9109386355`); (2) a failed resend still locked the button 60s — now rolls the
  cooldown back to 0 on error.
  **Owner actions (prod SMS only — dev/demo run on test numbers, no SMS):**
  MSG91 + DLT registration is **not started** — start it today, it's the
  multi-day long pole. The MSG91 **Send SMS Hook** Edge Function is deferred
  until the DLT template is approved (Supabase's provider dropdown has no MSG91
  option by design; MSG91 plugs in via Authentication → Hooks → Send SMS Hook).
  **No migration to run.**

- **2026-08-03** — **Slice 2: fixed the white-text-on-gold-button color
  regression.** The owner reported that text inside gold buttons rendered white
  instead of the mockup's ink `#241503`. It was NOT a token edit or per-screen
  misuse — `src/ui/tokens.ts` was untouched. Root cause: commit `a42d45f` (B2,
  "Android glyph clipping fix", 2026-07-31) refactored `T`'s style array to wrap
  the variant+`style` in `withLineHeadroom(...)` and, in doing so, moved
  `{ color: tones[tone] }` to the END of the array. RN merges left-to-right, so
  the default `tone="cream"` then overrode any explicit `color` a caller passed
  through `style` — the gold `Button` label (`#241503`, `src/ui/Button.tsx:30`),
  the jap `ॐ`/"Start again" (`app/(tabs)/jap.tsx:296,301`), and the home shloka
  (`goldHi`, `app/(tabs)/index.tsx:86`) all silently went cream/white. The
  original scaffold ordering had `style` last (caller wins); B2 flipped it with
  no mention of color in its message — hence "unexplained". Fix: one line in
  `src/ui/Text.tsx` — put `{ color: tones[tone] }` FIRST as the default, and the
  flattened variant+`style` (which may carry the caller's color) LAST, so an
  explicit `style.color` wins again while the `withLineHeadroom` clip fix is
  preserved. Verified in web preview: "Start Meditation" button text computes to
  `rgb(36,21,3)` = `#241503`; default headings still cream `#F6EDDD`; no console
  errors. `tsc` + web export green; lint unchanged at the 5-problem pre-existing
  baseline; reviewer found nothing. No migration. **No USER MUST RUN steps.**

- **2026-08-03** — **Slice 1: fixed audio overlap / won't-stop.** The looping
  audio singleton (`src/lib/audio.ts`) could orphan a player and keep it looping
  past a stop. Root cause: `playLoop` is async and `await`s `ensureMode()` before
  it touches the module player, so two overlapping calls — or a call racing an
  explicit `stopAudio` — could each create a player, leaking the first. Fix: a
  monotonic generation counter (`gen`) that `playLoop` captures at entry and
  re-checks after the await; `stopAudio`/`pauseAudio` also bump `gen`, so any
  stale in-flight call bails before creating a player. Also scoped
  `shouldPlayInBackground` per surface (only sleep passes `{ background: true }`;
  meditation/jap now auto-pause on background), added a flow-boundary
  `stopAudio` via a new nested `app/meditation/_layout.tsx` `useFocusEffect`
  (stops on leaving the flow, never on internal sounds→setup→session nav), and a
  global "Stop sound" pill (`src/ui/AudioStopPill.tsx`, `useSyncExternalStore`
  over the service) mounted in the root layout so every screen has a stop while
  audio plays. Sleep subscribes to the service so an external stop resets its row
  state (no desync). New i18n key `stop_sound`. Verified in web preview: rapid
  sound-switching never stacks (no console errors), the pill appears/stops/hides,
  audio persists across internal nav but stops on leaving the flow, `dismissTo`
  after a completed session correctly returns to the meditation tab through the
  new nested navigator, and the sleep row re-syncs when stopped via the pill.
  `tsc` clean; lint unchanged at the 5-problem pre-existing baseline (all in
  untouched `app/workout/*`). No migration. Code-reviewed: one HIGH finding
  (stop-vs-playLoop race) fixed; a LOW "OS background-pause not mirrored to the
  JS flag" spun off as a follow-up task. **No USER MUST RUN steps.**

- **2026-08-01** — **Merged `origin/main` into `onboarding-auth-plan-engine`
  for a boss demo.** Pulled in the 3 commits main had that this branch
  lacked — admin Meals/Mantras CRUD, the legal/privacy-policy package, and
  the Bunny TUS video-upload fix — keeping this branch's newer onboarding
  (B6 card-based v2) and diet screens (B1-ported) wherever they collided
  with main's older versions. Caught and fixed three merge-corruption bugs
  before committing: a migration-number collision (main's old
  `0010_diet_plans_profile_fields.sql` duplicated columns this branch's own
  `0010_onboarding_v2.sql` already added, and was already superseded by
  `0015_diet_plan_requests.sql` — deleted); duplicate `Diet*` types and
  duplicate `Profile` fields in `src/types/db.ts` from git keeping both
  sides' additions; and duplicate `Checkbox`/`ProgressDots` exports in
  `src/ui/index.ts` pointing at orphaned files main added, superseded by
  this branch's existing `Choice.tsx` (both orphans deleted). Also stripped
  ~85 lines of dead onboarding-v1 translation keys duplicated in
  `i18n.tsx`. Verified: mobile `tsc` clean, admin `tsc` + `next build`
  clean, mobile lint unchanged at the 5-problem baseline, PGlite 79/79
  green through the full 0001–0018 chain, onboarding + admin login
  smoke-tested in the web preview with zero console errors. Pushed to
  origin. Kicked off a fresh EAS `preview` (standalone APK) build against
  the merge commit for a physical-device demo — see
  `docs/SPRINT-STATE.md` "Demo build in flight" for the build id/link.
  **Migrations 0015 and 0016 still need to run in Supabase before the demo**
  or diet/audio will look broken even though the code is correct.

- **2026-08-01** — **Regression-fix + polish batch (B1–B7).** Diagnosed that the
  jap counter, sleep timers and diet were never *regressions* — they were built
  on two sibling branches (`origin/main`, `claude/sad-payne-d01fff`) that were
  never merged here. **B1** surgically ported them onto this branch's APIs (jap
  108-mala counter, sleep auto-stop timers + playback, diet AI/n8n custom-plan
  restored; diet tab + home card rewired). **B2** fixed three Android-only
  glyph/shadow/SVG clips the web preview can't show — a systemic `lineHeight`
  headroom in `Text.tsx` for over-large numbers, the meditation ॐ glow, and the
  onboarding diya (a 🪔 emoji → the app's `DiyaIcon`, also honouring the
  no-emoji rule). **B5** bundled the Om chant + sleep flute as offline
  content-library rows (`localAudio.ts` resolver, `playLoop` takes a bundled
  source, `fadeOutStop`); Om plays in both meditation and sleep. **B4** added
  haptics/sound cues through the one feedback service (jap tick + mala-complete,
  a gentle meditation-end `chime`, selection taps). **B3** refined the ceremony
  loader (creep past the 80% stall) and splash (de-bounced gada, de-collided
  the mid-sequence, smoothed the shimmer exit) — four owner-approved polishes.
  **B6** reworked onboarding to card-based, one-question-per-screen with
  auto-advancing single-selects (<90s), and **removed the deity question** (the
  engine never read it) — `profiles.deity_id` dropped, deity kept as content
  metadata. **B7** added 8 widely-known mantras (flagged for team review in
  `docs/mantra-review.md`). Migrations **0015–0018** all validated against real
  Postgres (PGlite). ⚠ Owner must run 0015–0018 in Supabase. Verified in the
  web preview where observable; Android-only fixes are the owner's on-device
  check. See CHANGELOG.md for the full list.

- **2026-07-30** — **Feature sprint slice 7: push notifications end-to-end.**
  Migration **0014** puts the whole eligibility question in SQL: `push_audience()`
  answers who is due for which kind right now, and `push_claim()` writes the
  `(user, kind, IST day)` ledger row *before* returning the devices, so an
  at-least-once cron and two racing invocations both collapse to one send.
  `push_sends` and `push_receipts` have RLS on and deliberately **zero
  policies** — service_role only; a client that could write `push_sends` could
  silence its own reminders. `handle_new_user()` now creates the
  `notification_prefs` row (existing users backfilled) so the opt-in defaults
  live only in the table and nothing has to re-state them.
  `supabase/functions/send-push/` is the **first Edge Function in the repo** and
  the only send path: four invocations (two cron fan-outs, an app-triggered
  plan-ready, a receipts sweep), bilingual copy rendered against the recipient's
  `language_mode`, chunked at 100, and **both halves of the delivery contract** —
  tickets catch tokens Expo already knows are dead, receipts 15 minutes later
  catch the app-uninstalled-after-send case that tickets never report. The
  recipient is never read from the request body: cron proves itself with
  `CRON_SECRET`, the app with the user's own JWT, so a client can address nobody
  but itself. Client side, `src/lib/push.ts` keeps one token row per install,
  registers on sign-in and deletes on sign-out (shared handsets), and maps a tap
  through a **closed** kind→route table so a payload can never steer navigation.
  The permission is asked twice: an in-app card on the workout completion screen,
  and only a yes reaches the one-shot OS prompt. Settings gains a notifications
  section with four shapes (unavailable / guest / no OS permission / the real
  controls) and a 30-minute reminder stepper, debounced, matching the cron's own
  resolution. PGlite **79/79 green** (was 51); lint held at the 2-error baseline.
  **The reviewer caught three real bugs**, all fixed: the reminder window used
  bare `time` arithmetic, so 00:00 − 23:30 = −23:30 read as "less than two hours
  late" and a 23:30 reminder would have fired every midnight; `plan_ready`
  trusted the caller that a plan existed, so a signed-in client could be told
  "your plan is ready" having never been assigned one; and the cold-start
  notification response was re-read on every root-layout remount, replaying the
  navigation and yanking the user back to a screen they had left.
  ⚠️ **Migration 0014 not yet applied.** Delivery itself is untested from here —
  it needs FCM credentials in EAS, `extra.eas.projectId`, and a dev build on a
  physical Android device.

- **2026-07-29** — **Feature sprint slice 6: workout tracking + progress bars.**
  The player held every set in a `useRef` and wrote one `activity_log` row at
  the end — kill the app at set 9 of 10 and the whole session was gone. New
  `src/lib/session.ts` is the local-first write path: AsyncStorage mirror →
  durable queue → try to send, with the database owning dedup
  (`workout_sessions.id` client-generated, `exercise_logs` PK
  `(session_id, item_position, set_no)`, so every replay is
  `on conflict do nothing`). `reconcile()` on launch closes out a session the
  user was killed out of. Migration **0013** adds three aggregate RPCs
  (`progress_summary`, `body_area_progress`, `plan_progress`), all `stable` and
  NOT security definer so RLS applies — PGlite **51/51 green** (was 34), and the
  harness now asserts `prosecdef = false` rather than leaving it to review. It
  also fixes a latent ordering bug in that harness: it applied migrations with a
  `!startsWith("0012")` filter, which would sort 0013+ into the first pass and
  apply them *before* 0012. New `src/ui/ProgressBar.tsx` (deliberately
  unanimated — these move on discrete events) drives all three bars: in-session
  sets, plan days, per body area. New Progress screen behind the Home sankalp
  card with streak, this-week vs all-time, a 30-day strip hand-rolled from 30
  Views, and empty states that encourage rather than show zeros. Lint 11 → 2
  errors (all 9 in `session.tsx` cleared by the rewrite). **The reviewer caught
  four real data-loss bugs**, all fixed: the finish op was enqueued *after* the
  mirror was marked finished (a kill in that window orphaned the session as
  'active' forever and hid every already-flushed set from all aggregates); the
  streak row bypassed the queue entirely so an offline finish lost it silently;
  `enqueue`/mirror writes were unsynchronised read-modify-write; and one
  permanently-failing op wedged the whole FIFO. Also added set-write batching
  (the spec's own 2G mitigation), a `finishSet` double-tap guard, and removed a
  side effect from inside a `setState` updater that StrictMode would have
  double-fired on every timed set. ⚠️ **USER MUST RUN migration 0013 in
  Supabase.**
- **2026-07-29** — **Feature sprint slice 5: plan-ready ceremony.** The single
  most important write in the app — a guest's answers becoming a profile, a
  questionnaire row and an assigned plan — was running invisibly inside the OTP
  screen behind a disabled button, and its "no rule matched" outcome was
  indistinguishable from success. New `src/ui/CeremonyLoader.tsx` (reusable,
  parameterised on stage labels + status; workout-plan generation is meant to be
  its second caller) and `app/plan/ready.tsx` now own it. The four stages are
  driven by the four real awaits inside `flushOnboarding` — no faked timers —
  and the bar caps at 0.8 until the data actually lands. Three outcomes, none of
  them a dead screen: plan assigned; write succeeded but no rule matched (its own
  honest screen, not a silent drop into the tabs); write failed (retry, answers
  still on disk). Back blocked for the route, gesture and Android hardware. Cold
  start now resumes an interrupted flush via a new `isFlushPending()`. Reuses the
  slice 3 artwork so the two ceremonies read as one product. **Two bugs caught by
  verifying rather than assuming:** the art composition never rendered at all
  (`onLayout` never delivered a box — replaced the measure-then-render pass with
  flexbox `aspectRatio`), and both animations sat frozen because they were gated
  on `AccessibilityInfo.isReduceMotionEnabled()`, which never settles under
  react-native-web — the bar would have hung at zero while the writes ran fine.
  An isolated probe then established that Reanimated does not animate on RNW at
  all here, so web takes a plain-style path (see decisions). **Two more caught by
  the reviewer:** the cold-start resume could replay a completed flush and write
  a duplicate `questionnaire_responses` row, and Retry had no reentrancy guard.
  Added a `progressBar` token for slice 6's three bars. Typecheck green; lint at
  the 11-error baseline (new files add zero). Verified in web preview across all
  four stages, all four states, and mixed-language mode.
- **2026-07-29** — **Feature sprint slice 4: streak wired to the UI.** The Home
  "sankalp" card showed three permanently-dim diyas — a mockup stub. Replaced it
  with a live `StreakCard` driven by a new `useStreak()` hook (`src/lib/streak.ts`)
  that reads the server-side `streak_state()` RPC (migration 0012, already
  applied): the streak is computed in Postgres in Asia/Kolkata with the
  one-freeze-per-week rule, never on the untrustworthy device clock. The card
  now renders the real day count (gold headline + a seven-diya week row, lit =
  min(streak, 7)), the longest-streak line, the at-risk nudge, and the gentle
  "a forgiveness day kept your sankalp" line off `freezes_used`. Framing stays
  no-guilt: a broken streak reads as an invitation to begin again. Guests (no
  session) and the first-read window show that invitation rather than a zero or
  a flash of "start over". Streak logic itself was already proven by the PGlite
  harness — re-ran `supabase/tests/validate.mjs`, **34/34 green**, covering
  same-day double, one/two-day gaps, freeze bridging, at-risk, dead-streak,
  longest-survives, `freezes_used`, and per-user isolation. Two new i18n pairs
  (`sankalp_at_risk`, `sankalp_freeze_saved`) plus `{n}`-interpolated
  `sankalp_days`/`sankalp_longest` — all copy in the catalog. Reviewer
  (`.claude/agents/reviewer.md`) run on the diff: RLS/program-scoping/secrets/
  health-claims/perf all clean; flagged and fixed a slow-network flash of the
  invitation for returning streak-holders, and moved the dynamic strings into
  the catalog. Typecheck green, lint at the 11-error baseline (new files add
  zero). Verified in web preview: Home renders the StreakCard (8 diya SVGs = 1
  header + 7 week), invitation state for a guest, zero console errors. The
  lit-diya active state and the RPC round-trip are physical-device / real-session
  only. **Deferred, and now flagged:** the "guests bank a local streak" decision
  (2026-07-28) is recorded but NOT built — `activity.ts` still no-ops for guests,
  so the default signed-out user banks nothing. Left for its own slice.
- **2026-07-29** — **Feature sprint slice 3: splash / launch screen.** Replaced
  the bare `null` cold-start frame (the C4 "dead frame") with an animated
  oxblood-and-gold ceremony. `preventAutoHideAsync()` holds the native splash
  from module load; a `SplashGate` inside AuthProvider paints the animated
  overlay, hides the native splash on its first frame (seam-free — `app.json`
  splash background now matches `ceremony.field` maroon), plays the motion, then
  cross-fades to the home screen mounted underneath. Artwork is all
  `react-native-svg` paths in `src/ui/ceremony/art.tsx` (no bitmaps): radial
  field, gold ogee arch drawn via stroke-dash, gada emblem on a gold ring,
  terracotta filigree panels. Motion is Reanimated on the UI thread (added
  `babel.config.js` for the `react-native-worklets` plugin; `react-native-reanimated`
  + `react-native-worklets` declared in package.json — owner-approved). Budget
  1.6–2.2 s, 1.2 s min beat, gold-shimmer idle hold for slow data, 6 s hard
  timeout, reduce-motion → static. Completion runs on plain timers, not rAF
  callbacks, so a frozen frame loop can never trap the user — verified in web
  preview that the splash mounts (19 SVG paths, wordmark + tagline) and reliably
  self-dismisses to onboarding even in a backgrounded tab. Ceremony palette
  namespaced `tokens.ceremony.*` (splash + plan-ready only). Reviewer
  (`.claude/agents/reviewer.md`) run on the diff: no high/critical findings;
  fixed an idle-shimmer restart and recorded the brand-wordmark i18n exception.
  Motion smoothness on low-end hardware and the native handoff seam are
  physical-device-only.
- **2026-07-28** — **Feature sprint slice 2: haptics + sound feedback.** The app
  had zero tactile/audio feedback (not broken — never built). Added
  `src/lib/feedback.ts` — one service, `tap/success/complete/error`, each a
  haptic paired with a short chime, gated by two settings toggles (Vibration,
  Sound; local, default on) that persist to AsyncStorage. Players preloaded
  once at startup, never per tap. Four placeholder SFX synthesised into
  `assets/sfx/` (~49 KB total) for the sound designer to replace. Wired into:
  every set completed, workout complete, meditation complete, plan assigned, and
  the destructive sign-out confirm. Fixed the audio-mode leak the spec flagged —
  ambient meditation's `playsInSilentMode:true` no longer bleeds into UI chirps.
  Added `expo-haptics`, a `Toggle` UI primitive, and the Feedback section in
  Settings. Reviewer (`.claude/agents/reviewer.md`) caught an unhandled
  `seekTo` rejection and a misleading comment — both fixed. Verified in web
  preview (toggles persist, sound path fires clean); haptics + silent-switch
  are physical-device-only.
- **2026-07-28** — **Feature sprint slices 1 + 1b.** Migrations 0011 (workout
  sessions, exercise logs, push tokens, notification prefs + a security_invoker
  session_summary view) and 0012 (activity_log gets program_id + client_event_id,
  streak rewritten for one forgiveness day per rolling 7 days, new streak_state()
  RPC) — validated against real Postgres via PGlite (34 checks) and applied in
  Supabase. Then slice 1b: the app finally has a **settings screen**, a stack
  route behind a Home header gear. Three sections that are real today — Language
  (the first way to change language after onboarding; writes through to
  profiles.language_mode when signed in so it survives a reinstall), Account
  (guest → sign in, user → inline sign-out confirm), and About (privacy link
  when live, wellness disclaimer, build version). Slices 2 and 7 add Haptics/
  Sound and Notification sections. Verified by clicking through in web preview.
- **2026-07-15** — **Onboarding v2 + auth + plan engine — the app now has a
  middle.** Before today every user-data surface was wired but dead: no auth
  anywhere, onboarding was unreachable dead code (nothing routed to it, so the
  language question no user ever saw), language reset to English on every
  restart, and `assignment_rules` existed in the DB with nothing reading it.
  Shipped: migration 0010 (profiles.level + body_focus body_area[] +
  days_per_week, language_mode default 'mixed'→'english' to match the app);
  **11-step questionnaire** as one state machine (progress dots, back,
  resume-at-last-answered, ~45 new i18n pairs, questions as data in
  src/lib/onboarding.ts); **plan engine** (src/lib/planRules.ts pure +
  plan.ts I/O — first-match-by-priority, absent key = any, supersedes the
  active plan rather than violating one-active-per-user); **guest-first OTP
  auth** (src/lib/auth.tsx, channel-agnostic behind AUTH_CHANNEL) with the
  guest→user bridge flushing AsyncStorage answers → profiles +
  questionnaire_responses + user_plans; **app/index.tsx cold-start router**
  (what finally makes onboarding reachable). Jap + sleep tabs became
  content-driven lists (mantras deity-first, sounds kind='sleep') per new
  specs — publishing a row fills them, no release. APK config: RECORD_AUDIO
  removed, expo-splash-screen installed (legacy splash block was inert).
  Verified: PGlite all 10 migrations + seed + 13 assertions PASS; 16 plan-rule
  assertions PASS against the real module (incl. the seed rule → home wins,
  gym/later/unanswered → null not a crash); preview — full flow in Hindi,
  language flips live AND survives restart, 18+ gate blocks and is escapable,
  consent unticked by default and blocks until ticked, deity list loads 4 real
  deities from live Supabase, resume returns mid-flow, jap/sleep render live
  rows, zero console errors, typecheck green. Fixed en route: aria-checked was
  never reaching the DOM on the consent checkbox and answer rows
  (accessibilityState is dropped by RN Web) — a consent control that doesn't
  announce its state isn't acceptable. Lint ran for the first time (eslint was
  never installed): 11 errors + 6 warnings, ALL pre-existing, none in the new
  code — spun out as a separate task.
  ⚠️ USER MUST RUN migrations 0008 + 0009 + 0010 in Supabase.
  ⚠️ Auth is UNVERIFIED end-to-end: it needs a real OTP inbox — owner action.
  ⚠️ `eas init` still not run (no extra.eas.projectId) — blocks any APK.
- **2026-07-16** — Diet section + AI custom plan + admin unlock +
  onboarding questionnaire (5 features, owner-directed). **Admin:** Meals and
  Mantras CRUD unlocked (list/detail/form matching the exercises/sounds
  pattern; Meals gets a jsonb items sub-editor; Mantras handles the NOT NULL
  deity FK). **App:** full 10-step onboarding questionnaire built (was
  language-only) — goal→body-focus→level→days→age(18+)→diet→mode→deity→DPDP
  consent→plan-ready, back-nav + progress dots, auth-guarded save; new Diet
  tab with a "Generate your custom diet plan" hero, its own ht/wt/region
  questionnaire, and a polling plan viewer. **UI:** added TextField/
  NumberField/SelectCard/Checkbox/ProgressDots primitives to src/ui.
  **Backend (owner override of the no-AI rule, diet only):** migration 0010
  (`diet_plan_requests` own-row table + `diet_request_status` enum + profile
  fields), importable `n8n/diet-plan-workflow.json` (Anthropic Claude) +
  `docs/n8n-diet-setup.md` (paste 4 keys, copy 1 URL), `docs/specs/diet-custom-plan.md`.
  Docs reconciled (CLAUDE.md, decisions.md, onboarding spec). Both apps
  typecheck clean; admin `npm run build` green.
  ⚠️ USER MUST RUN migration 0010 in Supabase (0008 + 0009 also still pending).
  ⚠️ Compliance follow-up before launch: disclose Anthropic processor +
  ht/wt/region health data in legal/ + Play Data Safety.

- **2026-07-15** — Play Store setup delegated: wrote docs/play-store-setup.md
  — a non-technical, step-by-step runbook (documents to collect, D-U-N-S
  lookup → application, company Google account, Organization registration +
  $25, verification, inviting Amratash, listing assets, report-back
  checklist). Research doc updated for **Play-only** (Apple sections marked
  out of scope; timeline + gotchas revised). **Key finding: D-U-N-S is
  mandatory for a Play org account (PAN/GST/CIN don't substitute) and the
  free track runs up to 30 business days — paid expedited is 5–7 days and is
  the recommendation. It is now the entire critical path.** Also confirmed:
  individual accounts cannot publish Health & Fitness apps since 28 Jan 2026
  → Organization is mandatory, not just preferred. Privacy policy URL is a
  hard publishing blocker and still undrafted.
- **2026-07-15** — Workout v2 (reference-app model) + deploy pipeline:
  guided session player (work → rest → done; set tracking, timed sets,
  +20s/skip rest with next-up preview, gym weight input, completion stats →
  activity_log journal meta), My Workouts builder (migration 0009,
  own-row RLS, reliable 1..n ordering) with pre-auth placeholder, workout
  spec v2 + onboarding question-set v2 docs, eas.json (preview=APK) +
  docs/deploy.md runbook, admin production build verified green
  (Vercel-ready). Verified in preview: full session Squats 3 sets with
  weight, rest +20s/skip, completion 1/3/2min; PGlite: all 9 migrations +
  0009 smoke PASS. Learning log restarted (2 entries).
  ⚠️ USER MUST RUN migrations 0008 + 0009 in Supabase.
- **2026-07-14** — Premium pass + audit: SVG icon set replaces every emoji
  (tab bar, cards, tiles, meditation); AvatarTile component (gradient +
  silhouette + gold play) on all video placeholders; gold-gradient buttons
  with glow; daily home rebuilt to mockup quality with LIVE devotional data
  (deity-of-the-day via scheduled row → weekday fallback — verified: Tuesday
  → Hanuman → Hanuman Stuti shloka), sankalp/diya card, today cards; workout
  tab restructured — admin-composed templates first (verified: "Full Body —
  Beginner" template + ordered 5-exercise detail with effective sets/reps),
  library grid below; new /workout/template/[id] route. Audit fixes:
  migration 0008 (sounds.audio_media_id nullable — admin New-sound was
  broken against NOT NULL), root tsconfig excludes admin/. All flows
  re-verified in preview, zero console errors, both typechecks green.
  ⚠️ USER MUST RUN migration 0008 in the Supabase SQL editor.
- **2026-07-14** — Meditation section shipped (3-click flow per spec):
  entry (Start) → sound selector (default ॐ chant auto-plays on open, live
  switch, Silent option) → instructions + timer presets (15-min default) →
  session screen (pulsing ॐ, ticking countdown, keep-awake, pause/resume,
  end-early with ≥3-min generosity) → completion moment (🪔). Singleton
  audio service (expo-audio) so sound survives across screens; unreachable
  media fails silent by design. Activity logging call sites in place —
  no-op until app auth ships. Verified in preview: exactly 3 clicks to a
  running session, pause freezes timer, 1-min session reaches completion,
  zero console errors, typecheck green.
- **2026-07-14** — Admin panel v1 built (admin/ Next.js app): login +
  middleware auth gate + is_admin() check (no service-role key anywhere —
  RLS is the boundary); Library area (exercises + sounds: list, full editor,
  draft/publish) with the upload-into-placeholder flow — file upload → Bunny
  via server-only key OR paste-URL fallback (works before Bunny exists),
  media row + FK set in one action, inline preview player (hls.js/audio);
  Compose area (workout templates: add from library, reorder, per-slot
  overrides, single-save rewrite). Both apps typecheck green; root tsconfig
  excludes admin/. Login gate verified in browser. ⚠️ E2E content-flow
  verification pending USER bootstrap: create admin auth user + admin_users
  row (steps in session notes), then log in and click through.
- **2026-07-13** — Workout section v1 shipped (owner build priority): browse
  screen with 3 modes (Home / Gym / Custom-by-body-area, 7 area chips), tile
  cards with avatar placeholder + "Our Avatar" badge, exercise detail screen
  (avatar video hero, sets/reps/rest stat chips, instructions, gold Start,
  safety disclaimer). Typed content query layer (src/lib/content.ts) with
  media FK joins. Default language switched to English (owner call).
  Verified live against real Supabase: 6 home exercises load, Legs filter
  returns exactly Dand Baithak + Squats, detail renders seeded data, zero
  console errors, typecheck green. Content-model decision recorded (library
  + composed sessions; admin Library/Compose areas; upload-into-placeholder
  flow with server-side Bunny key + inline preview player).
- **2026-07-13** — Expo scaffold shipped: Expo Router (SDK 57) + TypeScript,
  5 tabs (home/workout/meditation/jap/sleep), design tokens + base components
  (src/ui: Screen/Card/Chip/Button/T/B) from the approved black-saffron-gold
  design, i18n layer with the 3 language modes (hindi/english/mixed) wired to
  onboarding question #1, Supabase client + .env.example, night mood on the
  sleep tab. Verified in web preview: all routes render, all 3 language modes
  switch live app-wide, onboarding → tabs navigation works, zero console/
  server errors, typecheck green. CLAUDE.md updated: design system lives in
  src/ui (app/ is the routes folder).
- **2026-07-12** — Data model v1: 7 migrations (enums/helpers → identity →
  media+content atoms → templates → programs+rules → user state+activity →
  devotional calendar), dev seed, TS types (app/types/db.ts), schema spec
  (docs/specs/data-model.md). RLS on every table. Syntax-validated with a
  real PG engine (PGlite): all 7 migrations apply, seed loads, streak
  functions + daily_activity view + custom body-area filter return correct
  results. Fixed two bugs found by executing (not just parsing): `date -
  bigint` in the streak functions (cast row_number to int), and a
  text→uuid cast in the seed's program_days insert. Added
  supabase/reset_dev.sql for clean re-apply. ⚠️ USER MUST RUN reset_dev.sql
  then migrations 0001–0007 then seed.sql in Supabase (a partial apply left
  some tables behind).
- **2026-07-12** — Product locked with owner: Fit Hindu pivot recorded; 5
  feature specs written (onboarding w/ 3 language modes, workout w/ 3 modes +
  exercise objects, meditation 3-click flow, tracking/streaks, content
  model); black/saffron/gold design mockups approved (6 screens) + owner
  review doc/PDF; design brief. Play-only v1.
- **2026-07-10** — Phase 0 research complete: store requirements, health/
  claims compliance, competitor teardown, media hosting (docs/research/).
  Key outcomes: D-U-N-S request is the critical path (owner action THIS
  WEEK); org accounts on both stores; Bunny Stream for video; free-for-buyers
  model validated; devotional daily ritual = strongest retention hook.
- **2026-07-10** — Project scaffold: idea doc (docs/idea.md), CLAUDE.md
  standing rules, workflow skills (/screen, /migration, /ship), decision +
  progress logs. Phase 0 research agents pending relaunch (first run was cut
  off by a session limit).
