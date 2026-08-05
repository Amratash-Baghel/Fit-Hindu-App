# Spec — Fit Points engine

> Status: CONFIRMED by owner 2026-08-05. Owner override of `tracking-streaks.md`,
> which had points "schema-ready only, not v1". Migration: **0020**.

## Purpose

Reward showing up, every day, without ever punishing a miss. Points are the
visible engagement layer over the retention spine (`activity_log`); the streak
is the emotional one. They read from the same log and never disagree.

## Non-negotiables carried from `tracking-streaks.md`

- **Computed, never stored.** No ledger table, no `record_activity` RPC. Points
  are views over `activity_log` plus a config table. Retuning a rule touches no
  historical row (zero-backfill guarantee).
- **No streak-loss guilt.** A broken streak never claws back banked points.
- **Program-scoped.** Every rule can be global (`program_id null`) or
  per-program; nothing hardcodes one program.

## The currency

One visible currency in v1 — **Fit Points** ("फिट अंक"). The schema is
split-ready (`currency` column on every earner, seeded all `'fit'`), so a future
Fit/Bhakti split is a data change, not a migration (owner decision 2026-08-05).

## Earning rules (seed; admin-tunable in `points_rules`)

| rule_key | base | per unit | free units | qualifies when | daily cap |
|---|---|---|---|---|---|
| `workout` | 25 | — | — | any workout logged | 25 |
| `meditation` | 15 | — | — | `meta.actual_min ≥ 3` | 15 |
| `jap` | 10 | 2 / round | 2 | any completed mala | 18 |
| `sleep_sound` | 8 | — | — | `meta.actual_min ≥ 5` | 8 |
| `checkin` | 5 | — | — | one app-open per IST day | 5 |
| `meal` | 0 | 5 / meal | 0 | any meal logged | 15 |

Magnitude order (owner 2026-08-05): **milestone > workout > meditation > jap >
sleep**, with the app-open bonus present but never decisive. A full ordinary day
is ~71 points without meals. `jap` earns 10 flat, then +2 per round beyond the
2nd (12 at 3 malas, capped 18 at 6+). `meal` is seeded but **dormant** — nothing
writes `meal` rows yet; it starts paying the day diet logging lands.

## Milestone bonuses (seed; admin-tunable in `streak_milestones`)

| streak day | 3 | 7 | 10 | 14 | 21 | 30 | 51 | 108 |
|---|---|---|---|---|---|---|---|---|
| bonus | 25 | 60 | 80 | 120 | 200 | 300 | 500 | 1108 |

Frequent early (where drop-off happens), dominant by design — the day-7 bonus
alone beats the best single activity. **Awarded off `longest_streak`, not
`current_streak`:** earned once when the longest run ever reaches the day count,
permanent thereafter. This is the whole "never punishing" property — a break
costs *future* bonuses only — and because nothing is stored there is no way to
double-award.

## Why the app-open bonus is not an `activity_log` row

`streak_state()` counts a day on **≥1 row of any type**. An app-open row in
`activity_log` would let merely opening the app earn the संकल्प streak — gutting
its meaning and contradicting "a day counts if ≥1 **core activity** is logged".
It would also need a new `activity_type` enum value (a two-migration split).

So check-ins get their own table, `daily_checkins`, keyed `(user_id, ist_date)`.
The primary key makes the bonus unfarmable in the database — a second open the
same IST day is `on conflict do nothing`. **Check-ins earn points; they never
touch the streak.** `streak_state`, `daily_activity`, `current_streak_for` are
untouched.

## Anti-gaming

- **Daily caps** per `(user, rule, IST day)` in the `points_daily` view make
  repeated logging pointless (10 workouts still score 25, 9 malas still 18).
- **Qualifiers** gate junk: meditation needs `actual_min ≥ 3`, sleep needs
  `actual_min ≥ 5`. This forced the `sleep_sound` write to move off the play tap
  (it used to bank a row per tap, recording nothing about real listening) to a
  stop/timer-complete write carrying `actual_min` — see `app/(tabs)/sleep.tsx`.
- **`ist_date` is pinned in RLS, not merely defaulted.** A hostile client
  hitting the REST endpoint directly can forge `ist_date`; the PK / caps only
  bound points *per date*, so a forged date would mint points per fabricated
  day. The `daily_checkins` and (tightened here) `activity_log` insert policies
  bound `ist_date` to today (checkin) / today-or-yesterday (activity, for
  offline flush across the IST midnight). Legit clients never send `ist_date`.
- **One active rule per `(program, activity_type)`** — a partial unique index
  stops the content team from authoring a second active rule for a type that
  already has one (which `points_daily` would join twice and double).
- **Check-in PK** caps the app-open bonus at one per real day at the database.

## Milestones are user-level

`streak_milestones` has **no `program_id`** — the streak itself is user-level,
not program-scoped (0012), and a milestone is a bonus on that streak. A
`program_id` there would be a false affordance the read path could never honour.

## Known limitation (v1)

A sleep run is banked only when a JS stop path runs (user stop, timer complete,
tab blur, global stop pill). If Android kills the app process while it is
backgrounded — the phone-locked-and-asleep case — a qualifying run is lost, with
no recovery. The robust fix is a launch-reconcile like `session.ts` (persist
run-start, log on next open if elapsed ≥ 5 min); deferred as its own task.
Logging at play-start instead would restore durability but reintroduces the
tap-farm the ≥5-min rule exists to close, so it is not an option.

## Schema (migration 0020)

- `points_rules`, `streak_milestones` — admin-authored config, public-read +
  `is_admin()` write (same posture as `programs`/`media`).
- `daily_checkins` — append-only, own-row RLS, PK `(user_id, ist_date)`.
- `points_daily` view (`security_invoker`) — one capped row per
  `(user, IST day, rule)`, unioning scored `activity_log` rows with check-ins.
  The unit of computation is the day, not the row, because caps and jap's
  per-round bonus are per-day rules — and it is exactly the grouping the
  profile history list (slice 8) wants.
- `jap_rounds_today` view — completed malas per deity today, for the jap screen.
- `points_summary(uid)` function — one round-trip for the Home card; totals +
  today + milestone state + next milestone. `stable`, **not** security definer,
  so `activity_log`'s RLS applies to the caller (same contract as
  `streak_state`).

## v1 surface

Home sankalp card gains a Fit Points line: total, today's earn, next-milestone
hint. Signed-in only — a guest sees the sign-in invitation, never a zero.
Full points history + rewards scaffold stay slice 8 (`tracking-streaks.md`
profile surface).

## Not doing (v1)

- No rewards redemption/checkout (deferred monetization — leave the seam).
- No Bhakti-points split (schema-ready only).
- No leaderboard.
