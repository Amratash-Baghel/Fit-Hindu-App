# Spec — Mantra Jap (mala counter)

> Status: CONFIRMED by owner 2026-07-16 (deity picker + day default).
> Built 2026-07-16.

## Purpose

The lowest-friction devotional habit in the app: open, tap, chant. One mala =
108 repetitions. No setup, no account, no reading. This is the surface most
likely to be opened daily, so it must render instantly and never block on the
network.

## User flow

One screen, no navigation:

1. **Deity chips** — the deities that have a published mantra. Defaults to
   today's deity-of-the-day. Changing the deity swaps the mantra and resets
   the count.
2. **Mantra** — Devanagari text large and centred, transliteration under it,
   meaning below (muted). This is the thing the user reads while chanting.
3. **Counter** — starts at 108 and counts DOWN to 0. Fixed at 108 in v1
   (a mala is 108; other lengths are not a v1 need).
4. **Big glowing button** — the centre of the screen and the only thing to
   tap. Each tap = one count. The glow is a slow saffron pulse (the "diya"
   feel) plus a press flash, so the screen looks alive when idle.
5. **Finish** — at 0 the button becomes **Start again**, a diya lights, and
   one `activity_log` row (`jap`) is written. Tapping restarts at 108.

## Rules

- **Never gated.** Jap is core worship — no paywall, no sign-in, ever
  (CLAUDE.md fence-line).
- Mantras are content (`mantras` table, per-deity), authored in admin. The
  screen hardcodes no mantra text and no deity.
- All chrome strings via i18n. Mantra text itself is Devanagari content and
  renders as authored (it is not translated).
- Count is **local and ephemeral** in v1 — it lives in component state. A
  half-finished mala is not persisted across app restarts; only the completed
  mala writes an activity row. (Persisting partial malas needs auth; see
  Later.)
- Deity switch resets the count. Chanting one mantra then switching would
  otherwise log a mala the user never completed on that deity.

## States

- Loading: spinner while mantras load.
- Empty (no published mantra for any deity): quiet "coming soon" card. The
  screen must not crash or show a broken counter.
- Error: retry CTA.
- Offline: the mantra list is small; a failed load shows the error state.

## Not doing (v1)

- No audio chant loop on this screen (`sounds.kind='jap_loop'` exists and is
  seeded, but audio belongs to the meditation/sleep surfaces in v1).
- No mala length other than 108.
- No partial-mala persistence, no per-deity lifetime totals, no haptics
  (expo-haptics is not installed).

## Later

- Persist partial malas + lifetime per-deity counts once auth ships
  (`activity_log.meta` already carries `{deity_id, count}`).
- Optional `jap_loop` audio behind the button.
- Haptic tick per count (needs expo-haptics).

## Data

- Reads `mantras` (published) joined to `deities`.
- Default deity from `daily_devotional.deity_id` → weekday fallback, mirroring
  `getTodayDevotional()`.
- Writes one `activity_log` row on completion:
  `activity_type='jap'`, `ref_id=mantra_id`, `meta={deity_id, count:108}`.
