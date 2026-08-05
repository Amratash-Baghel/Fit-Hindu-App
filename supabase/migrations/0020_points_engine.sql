-- 0020 — Fit Points engine. Spec: docs/specs/points-rewards.md.
--
-- Owner override 2026-08-05: points UI moves into v1 scope (the confirmed
-- tracking-streaks spec had it "schema-ready only"). Recorded in
-- docs/decisions.md, same pattern as the 2026-07-16 diet-AI override.
--
-- The shape, and why: points are COMPUTED, never stored. No ledger table, no
-- record_activity RPC — just a config table the content team tunes and views
-- over activity_log. This keeps the zero-backfill guarantee the streak already
-- rests on (docs/specs/tracking-streaks.md): switching points on, or retuning
-- them, touches no historical row.
--
-- Additive only: three new tables + two views + one function. No existing
-- table, policy, or the streak is touched. Reverting is a `drop`.
--
-- SECURITY, the same contract as streak_state() (0012) and the 0013 aggregates:
-- points_summary() is `stable` and NOT `security definer`, and both views are
-- `security_invoker`, so activity_log's own-row RLS applies to the caller.
-- Passing another user's uid returns their (empty, to you) rows -> zeroes.

-- A stand-in for "no program" in the unique indexes below. coalesce(program_id,
-- this) lets a NULL (global) rule and a program-specific rule coexist for one
-- rule_key without uuid_nil() / the uuid-ossp extension.
--   '00000000-0000-0000-0000-000000000000'

-- ---------- rules (admin-authored config) ----------
-- program_id NULL = applies to EVERY program (platform standing rule: nothing
-- hardcodes one program). rule_key is TEXT, not the activity_type enum, so
-- non-activity earners like 'checkin' — and anything the content team invents
-- later — need no enum migration.
create table points_rules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs (id) on delete cascade,   -- null = global
  rule_key text not null,
  -- The activity_type this rule scores. NULL for earners with no activity_log
  -- row (checkin). A rule with a type matches activity_log rows of that type.
  activity_type activity_type,
  -- Split-ready: one visible currency in v1 (all 'fit'); a future bhakti split
  -- is a data change, not a migration (owner decision 2026-08-05).
  currency text not null default 'fit',
  base_points int not null default 0,
  per_unit_points int not null default 0,
  -- Which meta key holds the unit count. NULL = one unit per qualifying row
  -- (jap logs one row per completed mala, meal one row per meal).
  unit_meta_key text,
  -- Units that earn only base_points; per_unit kicks in beyond this. Jap: the
  -- first 2 malas are flat, rounds 3+ add per_unit each.
  units_free int not null default 0,
  -- Qualifier: a row counts only if meta[min_qualify_meta_key] >= value.
  -- NULL key = every row qualifies. Sleep needs actual_min >= 5; meditation 3.
  min_qualify_meta_key text,
  min_qualify_value numeric,
  daily_cap int not null,   -- per (user, rule, IST day), applied after per-unit
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index points_rules_key_idx
  on points_rules (coalesce(program_id, '00000000-0000-0000-0000-000000000000'::uuid), rule_key);

-- At most ONE active rule per (program, activity_type). Without this, the
-- content team could author a second active rule for the same activity_type
-- under a different rule_key (e.g. a "workout_diwali" bonus alongside the base
-- "workout" rule); points_daily would then join a row to BOTH and silently
-- double its points. The unique key above is on rule_key, so it does not stop
-- that on its own. checkin/meal-style earners with a null type are exempt.
create unique index points_rules_one_active_per_type_idx
  on points_rules (coalesce(program_id, '00000000-0000-0000-0000-000000000000'::uuid), activity_type)
  where active and activity_type is not null;

alter table points_rules enable row level security;
-- Config, same posture as programs/media (0003-0005): public read, admin write.
create policy "points_rules: public read" on points_rules for select using (true);
create policy "points_rules: admin write" on points_rules for all
  using (is_admin()) with check (is_admin());

-- ---------- streak milestones (admin-authored config) ----------
-- No program_id: the streak itself is USER-LEVEL, not program-scoped (0012
-- owner decision — a program filter would show a permanent zero to anyone doing
-- only devotional activity). Milestones are bonuses ON that streak, so they are
-- user-level too. A program_id column here would be a false affordance the read
-- path (points_summary) could never honour without redefining what a
-- cross-program streak even means — so it is deliberately absent.
create table streak_milestones (
  id uuid primary key default gen_random_uuid(),
  day_count int not null unique,
  bonus_points int not null,
  currency text not null default 'fit',
  label_key text,           -- i18n key for the celebration line
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table streak_milestones enable row level security;
create policy "streak_milestones: public read" on streak_milestones for select using (true);
create policy "streak_milestones: admin write" on streak_milestones for all
  using (is_admin()) with check (is_admin());

-- ---------- daily check-ins (app-open bonus) ----------
-- Deliberately NOT an activity_log row. streak_state() counts a day on >=1 row
-- of ANY type, so an app-open row there would let merely opening the app earn
-- the sankalp streak — gutting its meaning and contradicting "a day counts if
-- >=1 CORE activity is logged". It would also need a new activity_type enum
-- value (a two-migration split per the migration skill).
--
-- The PK (user_id, ist_date) makes the bonus unfarmable in the database: a
-- second open the same IST day is `on conflict do nothing`. Check-ins earn
-- points; they NEVER touch the streak. Append-only, like activity_log — no
-- update or delete policy, ever.
create table daily_checkins (
  user_id uuid not null references auth.users (id) on delete cascade,
  ist_date date not null default ist_today(),
  created_at timestamptz not null default now(),
  primary key (user_id, ist_date)
);

alter table daily_checkins enable row level security;
create policy "daily_checkins: read own" on daily_checkins for select using (user_id = auth.uid());
-- ist_date is PINNED to today in the WITH CHECK, not merely defaulted. The
-- default only fires when the client omits the column; a hostile client hitting
-- the REST endpoint directly can SEND a forged ist_date, and the PK
-- (user_id, ist_date) would then let it insert one row per fabricated day —
-- minting the app-open bonus without limit. Bounding it here is what makes the
-- "one per real day" guarantee true at the database. The app always omits it.
create policy "daily_checkins: insert own" on daily_checkins for insert
  with check (user_id = auth.uid() and ist_date = ist_today());

-- ---------- harden activity_log against forged ist_date ----------
-- Same class of hole, and points make it worse. activity_log's insert policy
-- (0006) only checked user_id = auth.uid(); ist_date defaults to ist_today()
-- but a direct REST insert can forge it. Before points that only inflated the
-- streak; now every points_daily rule (workout 25, jap 18, …) is scored per
-- ist_date, so a forged date mints spendable points at full daily-cap value.
--
-- Legit clients NEVER send ist_date — logActivity() and the offline session
-- queue both omit it, so it always defaults server-side. Allowing yesterday too
-- covers an offline finish that flushes just after the IST midnight boundary.
drop policy "activity: insert own" on activity_log;
create policy "activity: insert own" on activity_log for insert
  with check (
    user_id = auth.uid()
    and ist_date between ist_today() - 1 and ist_today()
  );

-- ---------- points_daily: one row per (user, IST day, rule) ----------
-- The unit of computation is the DAY, not the row: both the daily caps and
-- jap's "per round beyond the 2nd" are per-day rules a per-row ledger cannot
-- express. This grouping is also exactly what the slice-8 history list wants.
--
-- security_invoker so activity_log's RLS applies to the caller (same as
-- daily_activity in 0006).
create view points_daily
with (security_invoker = true) as
with matched as (
  -- Each qualifying activity_log row paired with its scoring rule.
  -- "Most specific wins": a program-specific rule overrides the global
  -- (program_id null) rule for the same activity_type. In v1 every seeded rule
  -- is global, so the NOT EXISTS branch is what runs — but scoring a row
  -- against BOTH a global and a specific rule would silently inflate points,
  -- so the guard is here from the start.
  select
    a.user_id, a.ist_date, a.meta,
    r.id as rule_id, r.rule_key, r.currency, r.program_id,
    r.base_points, r.per_unit_points, r.unit_meta_key, r.units_free, r.daily_cap
  from activity_log a
  join points_rules r
    on r.active
   and r.activity_type = a.activity_type
   and (
     r.program_id = a.program_id
     or (r.program_id is null
         and not exists (
           select 1 from points_rules rp
           where rp.active
             and rp.activity_type = a.activity_type
             and rp.program_id = a.program_id))
   )
  where r.min_qualify_meta_key is null
     or coalesce((a.meta ->> r.min_qualify_meta_key)::numeric, -1) >= r.min_qualify_value
),
activity_scored as (
  select
    user_id, ist_date, rule_id, rule_key, currency, program_id,
    base_points, per_unit_points, units_free, daily_cap,
    -- units: sum a named meta value, else one per qualifying row
    sum(case when unit_meta_key is not null
             then coalesce((meta ->> unit_meta_key)::numeric, 0)
             else 1 end) as units
  from matched
  group by user_id, ist_date, rule_id, rule_key, currency, program_id,
           base_points, per_unit_points, units_free, daily_cap
)
select
  user_id, ist_date, rule_key, currency, program_id,
  units::int as units,
  least(daily_cap,
        base_points + per_unit_points * greatest(0, (units - units_free)::int))::int as points
from activity_scored
union all
-- The app-open bonus. One row per (user, day) by the PK, so it is structurally
-- capped at base_points. Only the global 'checkin' rule.
select
  c.user_id, c.ist_date, r.rule_key, r.currency, r.program_id,
  1 as units,
  least(r.daily_cap, r.base_points)::int as points
from daily_checkins c
join points_rules r
  on r.rule_key = 'checkin' and r.active and r.program_id is null;

-- ---------- jap_rounds_today: the jap screen's today counter ----------
-- One activity_log row per completed mala, so rounds is a row count, grouped by
-- deity + IST day. security_invoker for the same RLS reason.
create view jap_rounds_today
with (security_invoker = true) as
select
  user_id,
  ist_date,
  (meta ->> 'deity_id') as deity_id,
  count(*)::int as rounds
from activity_log
where activity_type = 'jap'
group by user_id, ist_date, (meta ->> 'deity_id');

-- ---------- points_summary: one round-trip for the Home card ----------
-- A function, not a view, because milestone bonuses need streak_state(uid).
-- stable + NOT security definer: same RLS contract as streak_state and the
-- 0013 aggregates.
--
-- Milestones are earned off LONGEST streak, not current: a broken streak keeps
-- every bonus it earned (never punishing — docs/specs/tracking-streaks.md "no
-- streak-loss guilt"), and because nothing is stored there is no way to
-- double-award. next_milestone_* is NULL once the last milestone is passed.
create or replace function points_summary(uid uuid)
returns table (
  total_points int,
  today_points int,
  activity_points int,
  milestone_points int,
  current_streak int,
  longest_streak int,
  next_milestone_day int,
  next_milestone_bonus int
)
language plpgsql
stable
as $$
declare
  s record;
  act_total int;
  act_today int;
  mile_total int;
begin
  select * into s from streak_state(uid);

  -- currency = 'fit' is explicit, not incidental: v1 seeds only 'fit', but the
  -- currency column is split-ready (a future Fit/Bhakti split is data, not a
  -- migration). Filtering here means turning a second currency on is a
  -- deliberate change to this function, not a silent merge into one total.
  select coalesce(sum(points), 0)::int into act_total
    from points_daily where user_id = uid and currency = 'fit';
  select coalesce(sum(points), 0)::int into act_today
    from points_daily where user_id = uid and currency = 'fit' and ist_date = ist_today();

  select coalesce(sum(bonus_points), 0)::int into mile_total
    from streak_milestones
    where active and currency = 'fit' and day_count <= s.longest_streak;

  return query select
    (act_total + mile_total),
    act_today,
    act_total,
    mile_total,
    s.current_streak,
    s.longest_streak,
    (select day_count from streak_milestones
       where active and currency = 'fit' and day_count > s.longest_streak
       order by day_count limit 1),
    (select bonus_points from streak_milestones
       where active and currency = 'fit' and day_count > s.longest_streak
       order by day_count limit 1);
end;
$$;

-- ---------- seed: defaults (tunable in the admin panel afterwards) ----------
-- Magnitude order (owner 2026-08-05): milestone > workout > meditation > jap >
-- sleep, with the app-open bonus present but never decisive.
insert into points_rules
  (rule_key, activity_type, base_points, per_unit_points, unit_meta_key,
   units_free, min_qualify_meta_key, min_qualify_value, daily_cap)
values
  ('workout',     'workout',     25, 0, null,     0, null,         null, 25),
  ('meditation',  'meditation',  15, 0, null,     0, 'actual_min', 3,    15),
  -- jap: 10 flat, +2 per round beyond the 2nd (unit = one row per mala), cap 18
  ('jap',         'jap',         10, 2, null,     2, null,         null, 18),
  -- sleep: only after 5 real minutes of listening (sleep.tsx writes actual_min)
  ('sleep_sound', 'sleep_sound',  8, 0, null,     0, 'actual_min', 5,    8),
  -- app-open bonus: no activity row, PK-capped at one per day
  ('checkin',      null,          5, 0, null,     0, null,         null, 5),
  -- dormant until diet logging lands: nothing writes 'meal' rows yet
  ('meal',        'meal',         0, 5, null,     0, null,         null, 15);

-- Frequent early, dominant by design — the day-7 bonus alone beats the best
-- single activity, and the ladder stays dense where drop-off actually happens.
insert into streak_milestones (day_count, bonus_points, label_key) values
  (3,   25,  'milestone_3'),
  (7,   60,  'milestone_7'),
  (10,  80,  'milestone_10'),
  (14,  120, 'milestone_14'),
  (21,  200, 'milestone_21'),
  (30,  300, 'milestone_30'),
  (51,  500, 'milestone_51'),
  (108, 1108,'milestone_108');
