-- 0014 — push fan-out: who is due for which notification, and the ledger that
-- stops us sending it twice. Spec: docs/specs/feature-sprint.md (slice 7).
--
-- 0011 already shipped the two storage tables (`push_tokens`,
-- `notification_prefs`). What was missing is the DECISION: given a kind and a
-- moment, which devices should receive it. That decision lives here, in SQL,
-- and deliberately NOT in the Edge Function.
--
-- Why here and not in TypeScript: eligibility is the compliance surface of this
-- feature. "Only if they haven't trained today", "only if they opted in", "only
-- once per day" are the rules that keep a devotional habit app from becoming a
-- nagging app, and they are exactly the rules that rot when they live in a
-- deploy artefact nobody reviews. In the database they are reviewable, testable
-- against a real engine (supabase/tests/validate.mjs), and impossible for a
-- future sender to forget. The Edge Function's only job becomes: call this,
-- render copy, POST to Expo.
--
-- Additive: one enum, one table, two functions, one `create or replace` of
-- handle_new_user(). No existing table or policy is altered.

-- ---------- kinds ----------
-- The three v1 notification types. An enum, not text, so a typo in the Edge
-- Function is a 400 from Postgres rather than a fan-out that silently matches
-- nobody — the worst failure mode for a scheduled job, because it looks exactly
-- like "nobody was due".
create type notification_kind as enum ('daily_reminder', 'streak_at_risk', 'plan_ready');

-- ---------- the send ledger ----------
-- One row per (user, kind, IST day). This is the idempotency key for the whole
-- feature.
--
-- It exists because the cron that drives the fan-out is at-least-once, not
-- exactly-once: a retried invocation, two overlapping schedules, or a function
-- that times out after sending but before returning would each re-notify every
-- user who was due. A duplicate push is not a cosmetic bug in a habit app —
-- it is the thing that gets notifications turned off for good.
--
-- Keyed on the IST date, not a timestamp window, for the same reason the streak
-- is: the day boundary is Asia/Kolkata everywhere in this app (0001 ist_today).
create table push_sends (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind notification_kind not null,
  ist_date date not null default ist_today(),
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ist_date)
);

alter table push_sends enable row level security;

-- DELIBERATELY NO POLICIES. RLS with zero policies denies every anon and
-- authenticated request; `service_role` bypasses RLS, and the Edge Function is
-- the only thing that ever touches this table. There is no client feature that
-- needs to read its own send history, and granting one would hand a caller the
-- ability to mark itself "already sent" and silence its own reminders.
--
-- This is load-bearing for push_claim() below: with no insert policy, a
-- non-service caller's claim raises 42501 instead of quietly succeeding.

-- ---------- every user has a prefs row ----------
-- notification_prefs' column defaults are the product decision (opted in, 19:00
-- IST). Making the row always exist means those defaults live in exactly ONE
-- place — the table — instead of being re-stated as a coalesce() in every read.
--
-- Without this, push_audience() would need a left join plus a defaults
-- expression, and the settings screen would need a second copy of the same
-- defaults to render toggles for a user with no row. Two copies of a default is
-- how a "master switch off" turns into "on" after a reinstall.
insert into notification_prefs (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Same shape as 0002's version, with the prefs row added. `on conflict do
-- nothing` on both inserts: this trigger must never be the reason a signup
-- fails.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id) values (new.id) on conflict (id) do nothing;
  insert into notification_prefs (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------- who is due ----------
-- The audience for one kind at this moment. Read-only; push_claim() below is
-- the one that has side effects.
--
-- SECURITY, the same contract as streak_state() (0012) and the progress
-- functions (0013): `stable`, and deliberately NOT `security definer`. The
-- Edge Function calls it as `service_role`, which bypasses RLS and therefore
-- sees the whole audience. Any other caller is filtered by the RLS already on
-- push_tokens / notification_prefs / activity_log to their OWN rows, so the
-- worst an authenticated user can learn from this function is which of their
-- own devices would receive their own reminder. A security definer here would
-- have turned it into a full roster of every user's push tokens.
--
-- Parameters are prefixed `p_` rather than following the `uid` convention of
-- the earlier functions: `kind` and `user_id` are also column names in here,
-- and in a `language sql` body a bare parameter that collides with a column is
-- an ambiguity error, not a silent preference.
--
-- `p_now` is the IST wall-clock time to evaluate the daily-reminder window
-- against. It exists so supabase/tests/validate.mjs can pin the clock: the
-- reminder rule is a time-of-day boundary, and the last time this codebase
-- shipped an untested boundary rule (the streak, 0012) it was wrong. Null —
-- which is what production always passes — reads the real IST clock.
create or replace function push_audience(
  p_kind notification_kind,
  p_target uuid default null,
  p_now time default null
)
returns table (
  user_id uuid,
  device_id text,
  expo_push_token text,
  platform device_platform,
  language_mode language_mode
)
language sql
stable
as $$
  select
    t.user_id,
    t.device_id,
    t.expo_push_token,
    t.platform,
    -- A token can outlive its profile row in theory; English is the same
    -- pre-choice default the app and 0010 both use.
    coalesce(pr.language_mode, 'english'::language_mode)
  from push_tokens t
  join notification_prefs np on np.user_id = t.user_id
  left join profiles pr on pr.id = t.user_id
  where
    -- master switch
    np.enabled

    -- plan_ready is event-driven and always aimed at one person. Without this
    -- guard, invoking it with a null target would fan a "your plan is ready"
    -- push out to the entire user base.
    and (p_kind <> 'plan_ready' or p_target is not null)
    and (p_target is null or t.user_id = p_target)

    -- per-type opt-out
    and case p_kind
          when 'daily_reminder' then np.daily_reminder
          when 'streak_at_risk' then np.streak_at_risk
          when 'plan_ready'     then np.plan_ready
        end

    -- already notified for this kind today (see push_sends above)
    and not exists (
      select 1 from push_sends s
      where s.user_id = t.user_id
        and s.kind = p_kind
        and s.ist_date = ist_today()
    )

    -- kind-specific eligibility
    and (
      p_kind = 'plan_ready'
      or (
        -- Never nudge someone who already showed up today. The spec states this
        -- for streak_at_risk ("only when today is incomplete"); it is applied to
        -- the daily reminder too, because "time to train!" sent to a user who
        -- trained at 6am is the single fastest way to lose the permission.
        --
        -- activity_log, not workout_sessions: the streak counts every activity
        -- type, so a morning of jap or meditation is showing up.
        not exists (
          select 1 from activity_log al
          where al.user_id = t.user_id and al.ist_date = ist_today()
        )
        and case p_kind
              when 'daily_reminder' then
                -- Their chosen wall-clock time has passed in IST, and by less
                -- than two hours. The upper bound matters: the ledger stops
                -- duplicates but not LATENESS, and without it a cron outage
                -- from 19:00 to 23:00 would deliver a stack of "time to train"
                -- pushes at eleven at night. Two hours also means a schedule
                -- coarser than hourly still catches everyone.
                np.reminder_time <= coalesce(p_now, (now() at time zone 'Asia/Kolkata')::time)
                and coalesce(p_now, (now() at time zone 'Asia/Kolkata')::time) - np.reminder_time
                      < interval '2 hours'
              when 'streak_at_risk' then
                -- Activity yesterday and none today — which is exactly what
                -- streak_state().at_risk reports (0012: `days[1] = today - 1`),
                -- computed set-wise here instead of calling that plpgsql
                -- function once per candidate user.
                --
                -- A freeze-bridged run is correctly excluded: if the last
                -- activity was two days ago the streak is already dead
                -- (streak_state returns 0), and there is nothing at risk to
                -- warn about.
                exists (
                  select 1 from activity_log al
                  where al.user_id = t.user_id and al.ist_date = ist_today() - 1
                )
            end
      )
    );
$$;

-- ---------- claim, then send ----------
-- Returns the devices to send to, having ALREADY recorded the send.
--
-- Claim-before-send, not send-then-mark. Both orders can go wrong once — this
-- one loses a notification if the Expo POST then fails, the other sends a
-- duplicate if the ledger write fails. For a daily nudge a missed one is a
-- non-event and a duplicate is a reason to disable notifications, so the
-- direction of the risk is the whole argument. It is also the only order that
-- is safe against two cron invocations racing: the primary key makes exactly
-- one of them win the insert, and the loser gets zero rows back rather than a
-- second copy of the audience.
--
-- Volatile (it writes). Callable in practice only by service_role: push_sends
-- has RLS on with no policies, so an authenticated caller's insert raises
-- 42501 rather than claiming anything.
create or replace function push_claim(
  p_kind notification_kind,
  p_target uuid default null,
  p_now time default null
)
returns table (
  user_id uuid,
  device_id text,
  expo_push_token text,
  platform device_platform,
  language_mode language_mode
)
language sql
volatile
as $$
  -- `materialized` so the audience is computed once and both the ledger insert
  -- and the returned rows are derived from the same snapshot. Without it the
  -- planner may inline the function twice, and the second evaluation would run
  -- against a clock that has moved.
  with aud as materialized (
    select * from push_audience(p_kind, p_target, p_now)
  ),
  claimed as (
    insert into push_sends (user_id, kind)
    select distinct a.user_id, p_kind from aud a
    -- Someone else got there first (a racing cron, a retry). They own the send.
    on conflict (user_id, kind, ist_date) do nothing
    returning push_sends.user_id
  )
  select a.user_id, a.device_id, a.expo_push_token, a.platform, a.language_mode
  from aud a
  join claimed c on c.user_id = a.user_id;
$$;

-- ---------- delivery receipts ----------
-- Expo's push API answers in two stages, and the second one is the only place
-- some failures ever appear.
--
--   TICKET  — immediate, per message. Says Expo accepted it, or rejected it
--             outright (a malformed or already-known-dead token).
--   RECEIPT — available a few minutes later, keyed by ticket id. This is where
--             FCM/APNs reports that the app was uninstalled between our send
--             and the delivery attempt: `DeviceNotRegistered`.
--
-- Without the second stage, a token that dies after one successful send is
-- never cleaned up and we push into the void for that device forever. The
-- spec's "delete those rows" cannot be satisfied by tickets alone.
--
-- So the ticket ids are parked here and a second, later invocation of the same
-- Edge Function collects the receipts. Rows are deleted as they are processed;
-- this table is a work queue, not a log, and it stays near-empty.
create table push_receipts (
  ticket_id text primary key,
  -- Kept alongside so a DeviceNotRegistered receipt can be resolved back to a
  -- row without a second lookup. Not a foreign key: the token may already be
  -- gone (sign-out, a reinstall that upserted a new value), and a dangling
  -- ticket should be dropped quietly rather than block the insert.
  expo_push_token text not null,
  created_at timestamptz not null default now()
);

-- The collector asks for "tickets old enough to have a receipt" — Expo needs a
-- few minutes — so this is the access path that matters.
create index push_receipts_created_idx on push_receipts (created_at);

alter table push_receipts enable row level security;
-- Same reasoning as push_sends: no policies, service_role only. A client has
-- no business reading which devices we sent to.

-- ---------- scheduling (OWNER ACTION — not run here) ----------
-- This migration does not create the cron jobs. pg_cron and pg_net must be
-- enabled per-project in the Supabase dashboard, and the job body embeds a
-- function URL and a secret that do not belong in a committed file.
--
-- Once `send-push` is deployed, run this ONCE in the SQL editor, substituting
-- the project ref and the CRON_SECRET set in the function's secrets:
--
--   select cron.schedule('push-daily-reminder', '0,30 * * * *', $cron$
--     select net.http_post(
--       url     := 'https://<ref>.functions.supabase.co/send-push',
--       headers := '{"Content-Type":"application/json","x-cron-secret":"<secret>"}'::jsonb,
--       body    := '{"kind":"daily_reminder"}'::jsonb
--     );
--   $cron$);
--
--   select cron.schedule('push-streak-at-risk', '30 14 * * *', $cron$   -- 20:00 IST
--     select net.http_post(
--       url     := 'https://<ref>.functions.supabase.co/send-push',
--       headers := '{"Content-Type":"application/json","x-cron-secret":"<secret>"}'::jsonb,
--       body    := '{"kind":"streak_at_risk"}'::jsonb
--     );
--   $cron$);
--
--   select cron.schedule('push-receipts', '*/10 * * * *', $cron$
--     select net.http_post(
--       url     := 'https://<ref>.functions.supabase.co/send-push',
--       headers := '{"Content-Type":"application/json","x-cron-secret":"<secret>"}'::jsonb,
--       body    := '{"mode":"receipts"}'::jsonb
--     );
--   $cron$);
--
-- Note the schedules are UTC (pg_cron always is). 14:30 UTC = 20:00 IST, the
-- evening slot the spec asks for. The half-hourly reminder job is what makes a
-- user-chosen `reminder_time` meaningful at 30-minute resolution; the two-hour
-- lateness bound in push_audience() is what keeps a missed run from becoming a
-- late-night pile-up. The receipts job is the one that prunes dead tokens; skip
-- it and push_tokens grows uninstalled devices forever.
--
-- plan_ready has no cron. It is invoked by the app the moment an assignment
-- lands, with the user taken from the caller's JWT — never from the request
-- body (see supabase/functions/send-push/index.ts).
