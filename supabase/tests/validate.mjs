/**
 * Validates migrations 0001-0020 against a real Postgres engine (PGlite), then
 * exercises the streak rules, the progress aggregates, the push fan-out
 * (docs/specs/feature-sprint.md) and the points engine (docs/specs/points-rewards.md).
 *
 * RUN:  npm install --no-save @electric-sql/pglite && node supabase/tests/validate.mjs
 *
 * (`--no-save` leaves package.json and the lockfile untouched. The previously
 * documented `npx -p @electric-sql/pglite node …` form does not put the package
 * on Node's resolution path on Windows and fails with ERR_MODULE_NOT_FOUND.)
 *
 * PGlite is deliberately NOT a package.json dependency — it is a validation
 * tool, not something that ships in the app bundle.
 *
 * Deliberately applies 0001-0011, inserts LEGACY activity rows, and only THEN
 * applies 0012 — so the program_id backfill is tested against pre-existing
 * data the way it will actually run in Supabase, not against an empty table.
 *
 * WHAT THIS DOES NOT COVER: RLS enforcement. PGlite runs as the table owner,
 * and owners bypass RLS unless FORCE ROW LEVEL SECURITY is set — so a passing
 * run here says the policies EXIST and are well-formed, not that they hold
 * against a hostile client. That is verified by .claude/agents/reviewer.md and
 * must be spot-checked in Supabase with a real anon session.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUPABASE = join(HERE, "..");
const MIG = join(SUPABASE, "migrations");
const U = "11111111-0000-4000-8000-000000000001"; // test user
const U2 = "11111111-0000-4000-8000-000000000002"; // second user (isolation)
const PROG = "30000000-0000-4000-8000-000000000001"; // seeded program

let pass = 0, fail = 0;
const results = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  ok ? pass++ : fail++;
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        expected ${e}\n        actual   ${a}`}`);
}

const db = new PGlite();

// ---- Supabase shims (PGlite has no auth schema / GoTrue) ----
await db.exec(`
  create schema if not exists auth;
  create table auth.users (id uuid primary key);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('app.uid', true), '')::uuid;
  $$;
`);

// ---- apply migrations ----
const files = readdirSync(MIG).filter(f => f.endsWith(".sql")).sort();
async function apply(f) {
  let sql = readFileSync(join(MIG, f), "utf8");
  // pgcrypto is not bundled with PGlite; gen_random_uuid() is native in PG13+
  sql = sql.replace(/create extension if not exists pgcrypto;/g, "");
  try {
    await db.exec(sql);
    return true;
  } catch (e) {
    console.error(`\n!! ${f} FAILED TO APPLY\n   ${e.message}\n`);
    return false;
  }
}

// Everything BEFORE 0012 goes on first, so legacy rows can be inserted against
// the pre-0012 shape below. Ordering by name, not by an exclusion filter: a
// filter of `!startsWith("0012")` would sort 0013+ into this first pass and
// apply them before the migration they follow.
for (const f of files.filter(f => f < "0012")) {
  if (!(await apply(f))) { console.error("aborting"); process.exit(1); }
}
check("migrations 0001-0011 apply", true, true);

await db.exec(`insert into auth.users (id) values ('${U}'), ('${U2}');`);
await db.exec(readFileSync(join(SUPABASE, "seed.sql"), "utf8"));
check("seed loads", true, true);

// ---- LEGACY rows, written before 0012 exists (the real backfill scenario) ----
await db.exec(`
  insert into user_plans (user_id, program_id, started_on, status)
    values ('${U}', '${PROG}', ist_today() - 30, 'active');
  insert into activity_log (user_id, activity_type, ist_date) values
    ('${U}', 'workout',    ist_today() - 5),   -- after plan start -> backfills
    ('${U}', 'meditation', ist_today() - 5),
    ('${U}', 'jap',        ist_today() - 40);  -- BEFORE plan start -> stays null
  insert into activity_log (user_id, activity_type, ist_date) values
    ('${U2}', 'jap', ist_today() - 3);         -- user with no plan -> stays null
`);

// ---- now 0012, against populated tables ----
if (!(await apply("0012_activity_program_streak.sql"))) process.exit(1);
check("migration 0012 applies over existing rows", true, true);

// ---- and everything after it, in order ----
for (const f of files.filter(f => f > "0012z")) {
  if (!(await apply(f))) { console.error("aborting"); process.exit(1); }
}
check("migrations after 0012 apply", true, true);

const q = async (sql) => (await db.query(sql)).rows;

// ---- backfill ----
check("backfill: rows after plan start get program_id",
  (await q(`select count(*)::int c from activity_log
            where user_id='${U}' and ist_date=ist_today()-5 and program_id='${PROG}'`))[0].c, 2);
check("backfill: row before plan start stays null",
  (await q(`select program_id from activity_log
            where user_id='${U}' and ist_date=ist_today()-40`))[0].program_id, null);
check("backfill: user with no plan stays null",
  (await q(`select program_id from activity_log where user_id='${U2}'`))[0].program_id, null);

// ---- client_event_id ----
check("client_event_id backfilled distinct per existing row",
  (await q(`select count(distinct client_event_id)::int c from activity_log`))[0].c, 4);

const EV = "22222222-0000-4000-8000-000000000001";
await db.exec(`insert into activity_log (user_id, activity_type, client_event_id)
               values ('${U}','workout','${EV}')`);
await db.exec(`insert into activity_log (user_id, activity_type, client_event_id)
               values ('${U}','workout','${EV}') on conflict (user_id, client_event_id) do nothing`);
check("guest replay: duplicate client_event_id is a no-op",
  (await q(`select count(*)::int c from activity_log where client_event_id='${EV}'`))[0].c, 1);
// same event id, different user, must be allowed
await db.exec(`insert into activity_log (user_id, activity_type, client_event_id)
               values ('${U2}','workout','${EV}') on conflict do nothing`);
check("client_event_id is scoped per user, not global",
  (await q(`select count(*)::int c from activity_log where client_event_id='${EV}'`))[0].c, 2);

// ---- ist_today() boundary ----
const ist = (await q(`select ist_today() d, (now() at time zone 'Asia/Kolkata')::date e`))[0];
check("ist_today() is the Asia/Kolkata calendar date",
  String(ist.d), String(ist.e));

// ---- streak cases ----
const S = "33333333-0000-4000-8000-000000000001";
await db.exec(`insert into auth.users (id) values ('${S}')`);

async function streak(offsets) {
  await db.exec(`delete from activity_log where user_id='${S}'`);
  for (const o of offsets) {
    await db.exec(`insert into activity_log (user_id, activity_type, ist_date)
                   values ('${S}', 'workout', ist_today() - ${o})`);
  }
  const r = (await q(`select * from streak_state('${S}')`))[0];
  return [r.current_streak, r.longest_streak, r.at_risk];
}

/** freezes_used for the current run only */
async function freezes(offsets) {
  await db.exec(`delete from activity_log where user_id='${S}'`);
  for (const o of offsets) {
    await db.exec(`insert into activity_log (user_id, activity_type, ist_date)
                   values ('${S}', 'workout', ist_today() - ${o})`);
  }
  return (await q(`select freezes_used f from streak_state('${S}')`))[0].f;
}

check("no history", await streak([]), [0, 0, false]);
check("today only", await streak([0]), [1, 1, false]);

// same-day double completion must not count twice
await db.exec(`delete from activity_log where user_id='${S}'`);
await db.exec(`insert into activity_log (user_id, activity_type, ist_date) values
  ('${S}','workout',ist_today()), ('${S}','meditation',ist_today()), ('${S}','jap',ist_today())`);
const dbl = (await q(`select * from streak_state('${S}')`))[0];
check("same-day triple completion counts once", [dbl.current_streak, dbl.longest_streak], [1, 1]);

check("3 contiguous days", await streak([0, 1, 2]), [3, 3, false]);
check("one-day gap: freeze bridges it", await streak([0, 1, 3]), [3, 3, false]);
check("two-day gap: streak breaks", await streak([0, 1, 4]), [2, 2, false]);
check("second freeze within 7 days refused", await streak([0, 2, 4]), [2, 2, false]);
check("second freeze allowed when >=7 days apart",
  await streak([0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]), [11, 11, false]);
check("at risk: last activity yesterday", await streak([1]), [1, 1, true]);
check("dead streak: last activity 2 days ago", await streak([2]), [0, 1, false]);
check("longest survives a broken older run",
  await streak([0, 10, 11, 12, 13, 14]), [1, 5, false]);
check("frozen day does not itself increment", await streak([0, 2]), [2, 2, false]);

// freezes_used — drives slice 4's "a forgiveness day kept your sankalp" line
check("freezes_used: none on a clean run", await freezes([0, 1, 2]), 0);
check("freezes_used: one after a bridged gap", await freezes([0, 1, 3]), 1);
check("freezes_used: two when spaced >=7 days apart",
  await freezes([0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]), 2);
check("freezes_used: zero when no history", await freezes([]), 0);
// a freeze spent in an OLD, already-broken run must not be reported as current
check("freezes_used: counts the current run only, not older ones",
  await freezes([0, 10, 12]), 0);

// User isolation: S has an 11-day run in scope. U2 owns exactly two rows
// (jap at -3, workout today), so its streak must be 1 — if S's history leaked
// across the user filter this would be much larger.
check("streak counts only the asked-for user's rows",
  (await q(`select current_streak c, longest_streak l from streak_state('${U2}')`))
    .map(r => [r.c, r.l])[0], [1, 1]);

// current_streak() delegates and stays freeze-aware
await db.exec(`delete from activity_log where user_id='${S}'`);
for (const o of [0, 1, 3]) {
  await db.exec(`insert into activity_log (user_id, activity_type, ist_date)
                 values ('${S}','workout', ist_today() - ${o})`);
}
check("current_streak() delegates to streak_state",
  (await q(`select current_streak('${S}') c`))[0].c, 3);

// ---- append-only invariant ----
const pol = await q(`select cmd from pg_policies where tablename='activity_log'`);
check("activity_log has no update/delete policy",
  pol.map(p => p.cmd).sort(), ["INSERT", "SELECT"]);

// ---- RLS enabled on every new table ----
const rls = await q(`select relname, relrowsecurity from pg_class
  where relname in ('workout_sessions','exercise_logs','push_tokens','notification_prefs')
  order by relname`);
check("RLS enabled on all 4 new tables",
  rls.map(r => `${r.relname}:${r.relrowsecurity}`),
  ["exercise_logs:true", "notification_prefs:true", "push_tokens:true", "workout_sessions:true"]);

// ---- session_summary is security_invoker (else it leaks every user's rows) ----
const inv = await q(`select reloptions from pg_class where relname='session_summary'`);
check("session_summary is security_invoker",
  String(inv[0].reloptions).includes("security_invoker=true"), true);

// ---- exercise_logs dedup key tolerates one exercise at two positions ----
const SESS = "44444444-0000-4000-8000-000000000001";
const EX = (await q(`select id from exercises limit 1`))[0].id;
await db.exec(`insert into workout_sessions (id, user_id, source) values ('${SESS}','${U}','template')`);
await db.exec(`insert into exercise_logs (session_id, item_position, set_no, exercise_id)
               values ('${SESS}', 0, 1, '${EX}'), ('${SESS}', 3, 1, '${EX}')`);
check("same exercise at two positions does not collide",
  (await q(`select count(*)::int c from exercise_logs where session_id='${SESS}'`))[0].c, 2);
await db.exec(`insert into exercise_logs (session_id, item_position, set_no, exercise_id)
               values ('${SESS}', 0, 1, '${EX}') on conflict do nothing`);
check("offline replay of the same set is a no-op",
  (await q(`select count(*)::int c from exercise_logs where session_id='${SESS}'`))[0].c, 2);

// ---------- 0013: progress aggregates ----------
// Purpose-built fixtures rather than the seed's exercises, so every expected
// number below is derivable by hand from what is inserted here.
const P = "55555555-0000-4000-8000-0000000000"; // progress-test id prefix
const EX_CHEST_ARMS = `${P}01`; // two body areas — a set counts toward BOTH
const EX_LEGS = `${P}02`;
const U3 = "11111111-0000-4000-8000-000000000003"; // isolated progress user

await db.exec(`
  insert into auth.users (id) values ('${U3}');
  insert into exercises (id, slug, name_hi, name_en, body_areas, status) values
    ('${EX_CHEST_ARMS}', 'p-pushup', 'x', 'Push-up', '{chest,arms}', 'published'),
    ('${EX_LEGS}',       'p-squat',  'y', 'Squat',   '{legs}',       'published');
`);

// Three sessions for U3: two completed (one today, one 20 days ago) and one
// abandoned today. 6 non-skipped sets + 1 skipped across the completed pair.
const S1 = `${P}11`, S2 = `${P}12`, S3 = `${P}13`;
await db.exec(`
  insert into workout_sessions (id, user_id, source, status, ist_date, started_at, completed_at) values
    ('${S1}', '${U3}', 'template', 'completed', ist_today(),      now() - interval '30 min', now()),
    ('${S2}', '${U3}', 'template', 'completed', ist_today() - 20, now() - interval '10 min', now()),
    ('${S3}', '${U3}', 'template', 'abandoned', ist_today(),      now() - interval '90 min', null);
  insert into exercise_logs (session_id, item_position, set_no, exercise_id, skipped) values
    ('${S1}', 0, 1, '${EX_CHEST_ARMS}', false),
    ('${S1}', 0, 2, '${EX_CHEST_ARMS}', false),
    ('${S1}', 1, 1, '${EX_LEGS}',       false),
    ('${S1}', 1, 2, '${EX_LEGS}',       true),   -- skipped: excluded everywhere
    ('${S2}', 0, 1, '${EX_CHEST_ARMS}', false),
    ('${S2}', 1, 1, '${EX_LEGS}',       false),
    ('${S2}', 1, 2, '${EX_LEGS}',       false),
    ('${S3}', 0, 1, '${EX_LEGS}',       false);  -- abandoned: excluded everywhere
`);

const sum = (await q(`select * from progress_summary('${U3}')`))[0];
check("progress_summary: counts completed sessions only", sum.sessions_total, 2);
check("progress_summary: week window excludes the 20-day-old session", sum.sessions_week, 1);
check("progress_summary: distinct training days", sum.active_days, 2);
// session_summary.sets_done already filters skipped -> 3 + 3
check("progress_summary: sets exclude skipped and abandoned", sum.sets_total, 6);
check("progress_summary: minutes are positive and week <= total",
  sum.minutes_total >= sum.minutes_week && sum.minutes_week > 0, true);

const areas = await q(`select * from body_area_progress('${U3}')`);
const byArea = Object.fromEntries(areas.map(r => [r.area, r.sets_done]));
// chest+arms exercise: 2 sets in S1 + 1 in S2 = 3, counted toward each area.
check("body_area_progress: multi-area exercise counts toward every area",
  [byArea.chest, byArea.arms], [3, 3]);
// legs: S1 has 1 done + 1 skipped, S2 has 2 done -> 3
check("body_area_progress: skipped sets excluded", byArea.legs, 3);
check("body_area_progress: abandoned session excluded", areas.length, 3);
check("body_area_progress: last_done is the most recent training date",
  (await q(`select (last_done = ist_today()) t from body_area_progress('${U3}') where area='chest'`))[0].t, true);

// A user with no history gets one row of zeroes, never a null row.
const empty = (await q(`select * from progress_summary('${U2}')`))[0];
check("progress_summary: no history returns zeroes, not null",
  [empty.sessions_total, empty.minutes_total, empty.sets_total], [0, 0, 0]);
check("body_area_progress: no history returns no rows",
  (await q(`select count(*)::int c from body_area_progress('${U2}')`))[0].c, 0);

// plan_progress: U (seeded active plan, started 30 days ago) vs U3 (no plan).
await db.exec(`insert into workout_sessions (id, user_id, source, status, ist_date)
               values ('${P}21','${U}','template','completed', ist_today()),
                      ('${P}22','${U}','template','completed', ist_today()),
                      ('${P}23','${U}','template','completed', ist_today() - 2),
                      ('${P}24','${U}','template','completed', ist_today() - 60)`);
const pp = (await q(`select * from plan_progress('${U}')`))[0];
check("plan_progress: two sessions in one day count as one day", pp.days_done, 2);
check("plan_progress: sessions before the plan started are excluded", pp.days_done < 3, true);
check("plan_progress: reports the program length", pp.duration_days > 0, true);
check("plan_progress: no active plan returns no rows",
  (await q(`select count(*)::int c from plan_progress('${U3}')`))[0].c, 0);

// Same security contract as streak_state: these must NOT be security definer,
// or RLS stops applying and any uid could be read.
const prosec = await q(`select proname, prosecdef from pg_proc
  where proname in ('progress_summary','body_area_progress','plan_progress') order by proname`);
check("progress functions are not security definer",
  prosec.map(p => `${p.proname}:${p.prosecdef}`),
  ["body_area_progress:false", "plan_progress:false", "progress_summary:false"]);

// ---------- 0014: push fan-out ----------
// Fresh users throughout: every user above already carries activity_log history
// from the streak cases, and "has this person trained today" is the single most
// load-bearing condition in the audience query.
const PU = "66666666-0000-4000-8000-00000000000";
const N1 = `${PU}1`; // plain: no activity at all, one device
const N2 = `${PU}2`; // trained today
const N3 = `${PU}3`; // master switch off
const N4 = `${PU}4`; // trained yesterday, not today -> the at-risk case
const N5 = `${PU}5`; // two devices

await db.exec(`insert into auth.users (id) values
  ('${N1}'), ('${N2}'), ('${N3}'), ('${N4}'), ('${N5}')`);

// The trigger 0014 replaces must create the prefs row alongside the profile,
// or every one of these users drops out of the audience join silently.
check("0014: new user gets a notification_prefs row",
  (await q(`select count(*)::int c from notification_prefs
            where user_id in ('${N1}','${N2}','${N3}','${N4}','${N5}')`))[0].c, 5);
// U and U2 were created BEFORE 0014 applied — they exercise the backfill, not
// the trigger.
check("0014: backfill gave pre-existing users a prefs row",
  (await q(`select count(*)::int c from notification_prefs where user_id in ('${U}','${U2}')`))[0].c, 2);

await db.exec(`
  insert into push_tokens (user_id, device_id, expo_push_token, platform) values
    ('${N1}', 'd1', 'ExponentPushToken[n1]',  'android'),
    ('${N2}', 'd1', 'ExponentPushToken[n2]',  'android'),
    ('${N3}', 'd1', 'ExponentPushToken[n3]',  'android'),
    ('${N4}', 'd1', 'ExponentPushToken[n4]',  'android'),
    ('${N5}', 'd1', 'ExponentPushToken[n5a]', 'android'),
    ('${N5}', 'd2', 'ExponentPushToken[n5b]', 'ios');

  update notification_prefs set reminder_time = '06:00'
    where user_id in ('${N1}','${N2}','${N3}','${N4}','${N5}');
  update notification_prefs set enabled = false where user_id = '${N3}';
  update profiles set language_mode = 'hindi' where id = '${N1}';

  insert into activity_log (user_id, activity_type, ist_date) values
    ('${N2}', 'workout', ist_today()),      -- showed up today
    ('${N4}', 'workout', ist_today() - 1);  -- showed up yesterday, not today

  -- plan_ready is only truthful for someone who HAS a plan. N2 and N5 get one;
  -- N1 deliberately does not, which is the common real state (the rules engine
  -- leaves unmatched users with no plan at all).
  insert into user_plans (user_id, program_id, started_on, status) values
    ('${N2}', '${PROG}', ist_today() - 1, 'active'),
    ('${N5}', '${PROG}', ist_today() - 1, 'active');
`);

/** Distinct users in an audience, sorted, as short ids for readable failures. */
const short = (id) => id.slice(-1);
async function audience(kind, { target = "null", now = "null" } = {}) {
  const rows = await q(`select distinct user_id from push_audience(
    '${kind}'::notification_kind, ${target}, ${now}) order by user_id`);
  return rows.map((r) => short(r.user_id));
}

// --- daily reminder: the time window ---
// p_now pins the IST clock so these assertions do not depend on when the suite
// is run. Production always passes null and reads the real clock.
check("daily_reminder: due when the chosen time has just passed",
  await audience("daily_reminder", { now: "'07:00'" }), ["1", "4", "5"]);
check("daily_reminder: not due before the chosen time",
  await audience("daily_reminder", { now: "'05:00'" }), []);
check("daily_reminder: not due more than 2 hours late",
  await audience("daily_reminder", { now: "'09:00'" }), []);
check("daily_reminder: still due at the 2-hour edge",
  await audience("daily_reminder", { now: "'07:59'" }), ["1", "4", "5"]);

// Midnight. Two bare `time` values subtract to a NEGATIVE interval across the
// boundary (00:00 - 23:30 = -23:30), which reads as "less than two hours late"
// and would fire a 23:30 reminder every single midnight. Comparing instants
// instead is what stops that — and the second case documents the accepted
// consequence: a late-night slot has no catch-up once the date has rolled.
await db.exec(`update notification_prefs set reminder_time = '23:30' where user_id = '${N1}'`);
check("daily_reminder: a 23:30 reminder is due at 23:45",
  (await audience("daily_reminder", { now: "'23:45'" })).includes("1"), true);
check("daily_reminder: a 23:30 reminder does NOT fire again after midnight",
  (await audience("daily_reminder", { now: "'00:15'" })).includes("1"), false);
await db.exec(`update notification_prefs set reminder_time = '06:00' where user_id = '${N1}'`);

// --- opt-outs and "already showed up" ---
// N2 and N3 are absent from every list above. Asserting it explicitly so the
// reason a regression appears is legible.
check("daily_reminder: a user who already trained today is never nudged",
  (await audience("daily_reminder", { now: "'07:00'" })).includes("2"), false);
check("daily_reminder: the master switch excludes every kind",
  (await audience("daily_reminder", { now: "'07:00'" })).includes("3"), false);

await db.exec(`update notification_prefs set daily_reminder = false where user_id = '${N1}'`);
check("daily_reminder: per-type opt-out excludes only that kind",
  await audience("daily_reminder", { now: "'07:00'" }), ["4", "5"]);
await db.exec(`update notification_prefs set daily_reminder = true where user_id = '${N1}'`);

// --- one row per device, and the language the copy is rendered in ---
const devs = await q(`select expo_push_token, platform, language_mode
                      from push_audience('daily_reminder', '${N5}', '07:00') order by device_id`);
check("audience returns one row per device",
  devs.map((d) => `${d.platform}:${d.expo_push_token}`),
  ["android:ExponentPushToken[n5a]", "ios:ExponentPushToken[n5b]"]);
check("audience carries the profile's language for the copy",
  (await q(`select language_mode from push_audience('daily_reminder', '${N1}', '07:00')`))[0].language_mode,
  "hindi");

// --- streak at risk ---
// Exactly the users streak_state() would call at_risk: activity yesterday, none
// today. N1 and N5 have no history at all and must not be told a streak is in
// danger when there is no streak.
check("streak_at_risk: only a user who trained yesterday and not today",
  await audience("streak_at_risk"), ["4"]);
check("streak_at_risk: agrees with streak_state().at_risk",
  (await q(`select at_risk from streak_state('${N4}')`))[0].at_risk, true);
// A dead streak (nothing for two days) has nothing left to rescue.
await db.exec(`insert into activity_log (user_id, activity_type, ist_date)
               values ('${N1}', 'workout', ist_today() - 2)`);
check("streak_at_risk: a streak already broken is not nudged",
  await audience("streak_at_risk"), ["4"]);

// --- plan_ready is targeted, never a fan-out ---
check("plan_ready: a null target reaches nobody",
  await audience("plan_ready"), []);
check("plan_ready: a target reaches exactly that user",
  await audience("plan_ready", { target: `'${N5}'` }), ["5"]);
// plan_ready is event-driven, so it deliberately ignores "trained today".
check("plan_ready: delivered even to a user who already trained",
  await audience("plan_ready", { target: `'${N2}'` }), ["2"]);
// requestPlanReadyPush() is reachable from any signed-in client, so the claim
// in the notification has to be checked here rather than trusted from the app.
check("plan_ready: not sent to a user who has no plan",
  await audience("plan_ready", { target: `'${N1}'` }), []);

// --- the claim ledger (everything below MUTATES push_sends) ---
const claim1 = await q(`select * from push_claim('daily_reminder', null, '07:00')`);
check("push_claim: returns every due device the first time",
  claim1.length, 4); // N1 + N4 + N5's two devices
check("push_claim: records one ledger row per user, not per device",
  (await q(`select count(*)::int c from push_sends
            where kind = 'daily_reminder' and ist_date = ist_today()`))[0].c, 3);
check("push_claim: a second run in the same day returns nothing",
  (await q(`select count(*)::int c from push_claim('daily_reminder', null, '07:00')`))[0].c, 0);
check("push_audience: a claimed user drops out of the audience",
  await audience("daily_reminder", { now: "'07:00'" }), []);
// The ledger is per (user, kind, day) — claiming the reminder must not silence
// the evening nudge.
check("push_claim: kinds are claimed independently",
  (await q(`select count(*)::int c from push_claim('streak_at_risk')`))[0].c, 1);

// --- security contract ---
// push_sends is service_role-only: RLS on, and deliberately zero policies. If a
// policy is ever added, a client could mark its own reminder sent and silence
// itself, and push_claim() would stop being service_role-only.
const svcOnly = await q(`select relname, relrowsecurity from pg_class
  where relname in ('push_sends','push_receipts') order by relname`);
check("push_sends and push_receipts have RLS enabled",
  svcOnly.map((r) => `${r.relname}:${r.relrowsecurity}`),
  ["push_receipts:true", "push_sends:true"]);
check("neither service-role table has any policy",
  (await q(`select count(*)::int c from pg_policies
            where tablename in ('push_sends','push_receipts')`))[0].c, 0);
// Same contract as streak_state / the 0013 aggregates: definer here would turn
// push_audience into a readable roster of every user's push tokens.
const pushsec = await q(`select proname, prosecdef from pg_proc
  where proname in ('push_audience','push_claim') order by proname`);
check("push functions are not security definer",
  pushsec.map((p) => `${p.proname}:${p.prosecdef}`),
  ["push_audience:false", "push_claim:false"]);

// ---------- 0020: points engine ----------
// Purpose-built fixtures so every expected number is derivable by hand.
const PT = "77777777-0000-4000-8000-0000000000"; // points-test id prefix
const PU1 = `${PT}01`; // scores across every rule
const PU2 = `${PT}02`; // isolation — never leaks into PU1
const PDEITY = "88888888-0000-4000-8000-000000000001";
await db.exec(`insert into auth.users (id) values ('${PU1}'), ('${PU2}')`);

// A full day for PU1, today: 1 workout, 1 qualifying meditation, 3 jap malas,
// 1 qualifying sleep, plus a check-in.
await db.exec(`
  insert into activity_log (user_id, activity_type, ist_date, meta) values
    ('${PU1}', 'workout',     ist_today(), '{}'),
    ('${PU1}', 'meditation',  ist_today(), '{"actual_min": 12}'),
    ('${PU1}', 'jap',         ist_today(), '{"deity_id": "${PDEITY}", "count": 108}'),
    ('${PU1}', 'jap',         ist_today(), '{"deity_id": "${PDEITY}", "count": 108}'),
    ('${PU1}', 'jap',         ist_today(), '{"deity_id": "${PDEITY}", "count": 108}'),
    ('${PU1}', 'sleep_sound', ist_today(), '{"actual_min": 30}');
  insert into daily_checkins (user_id, ist_date) values ('${PU1}', ist_today());
`);

const pd = async (uid, key) =>
  (await q(`select coalesce(sum(points),0)::int p from points_daily
            where user_id='${uid}' and rule_key='${key}' and ist_date=ist_today()`))[0].p;

check("points: workout scores its base", await pd(PU1, "workout"), 25);
check("points: qualifying meditation scores its base", await pd(PU1, "meditation"), 15);
// 3 malas: 10 base + 2*(3-2) = 12
check("points: jap adds per-round beyond the free 2", await pd(PU1, "jap"), 12);
check("points: qualifying sleep scores its base", await pd(PU1, "sleep_sound"), 8);
check("points: check-in scores its base", await pd(PU1, "checkin"), 5);

// meditation BELOW the qualifier earns nothing; sleep below 5 earns nothing.
await db.exec(`insert into activity_log (user_id, activity_type, ist_date, meta) values
  ('${PU2}', 'meditation',  ist_today(), '{"actual_min": 2}'),
  ('${PU2}', 'sleep_sound', ist_today(), '{"actual_min": 4}')`);
check("points: meditation under 3 min does not qualify", await pd(PU2, "meditation"), 0);
check("points: sleep under 5 min does not qualify", await pd(PU2, "sleep_sound"), 0);

// jap cap: 6 malas would be 10 + 2*4 = 18 (at cap); 9 malas still 18.
await db.exec(`delete from activity_log where user_id='${PU2}'`);
for (let i = 0; i < 9; i++)
  await db.exec(`insert into activity_log (user_id, activity_type, ist_date, meta)
                 values ('${PU2}','jap', ist_today(), '{"count":108}')`);
check("points: jap is clamped to its daily cap", await pd(PU2, "jap"), 18);

// two workouts one day still cap at a single workout's base (no per-unit)
await db.exec(`insert into activity_log (user_id, activity_type, ist_date)
               values ('${PU2}','workout', ist_today()), ('${PU2}','workout', ist_today())`);
check("points: repeated workouts are capped, not additive", await pd(PU2, "workout"), 25);

// check-in is unfarmable: a second open the same IST day is a no-op
await db.exec(`insert into daily_checkins (user_id, ist_date) values ('${PU1}', ist_today())
               on conflict do nothing`);
check("check-in: a second open the same day inserts once",
  (await q(`select count(*)::int c from daily_checkins
            where user_id='${PU1}' and ist_date=ist_today()`))[0].c, 1);

// check-ins never touch the streak: PU with ONLY a check-in has streak 0.
await db.exec(`insert into auth.users (id) values ('${PT}03')`);
await db.exec(`insert into daily_checkins (user_id, ist_date) values ('${PT}03', ist_today())`);
check("check-in does not earn a streak day",
  (await q(`select current_streak('${PT}03') c`))[0].c, 0);

// points_summary rolls activity + milestones. PU1 today = 25+15+12+8+5 = 65.
const psum = (await q(`select * from points_summary('${PU1}')`))[0];
check("points_summary: today's activity total", psum.today_points, 65);
check("points_summary: no milestone yet (streak below 3)", psum.milestone_points, 0);
check("points_summary: next milestone is the first rung", psum.next_milestone_day, 3);

// Milestone survives a broken streak: longest 5 (>=3) earns the day-3 bonus,
// even though the current streak is dead. streak([0,10,11,12,13,14]) -> cur 1,
// longest 5. mile_total = 25 (only day-3 <= 5).
await db.exec(`delete from activity_log where user_id='${PU1}'`);
await db.exec(`delete from daily_checkins where user_id='${PU1}'`);
for (const o of [0, 10, 11, 12, 13, 14])
  await db.exec(`insert into activity_log (user_id, activity_type, ist_date)
                 values ('${PU1}','workout', ist_today() - ${o})`);
const pmile = (await q(`select * from points_summary('${PU1}')`))[0];
check("points_summary: milestone earned off LONGEST streak survives a break",
  [pmile.current_streak, pmile.longest_streak, pmile.milestone_points], [1, 5, 25]);
check("points_summary: next milestone is the 7-day rung after passing 3",
  pmile.next_milestone_day, 7);

// zero-history user: one row of zeroes, never null.
const pempty = (await q(`select * from points_summary('${U3}')`))[0];
check("points_summary: no history returns zeroes, not null",
  [pempty.total_points, pempty.today_points, pempty.milestone_points], [0, 0, 0]);

// isolation: PU1 now has 6 daily-capped workouts (150) + the day-3 milestone
// (25) = 175, and PU2's separate jap/workout totals never leak in.
check("points_summary: counts only the asked-for user",
  (await q(`select total_points from points_summary('${PU1}')`))[0].total_points, 175);

// jap_rounds_today groups by deity + IST day
check("jap_rounds_today: counts malas per deity for today",
  (await q(`select rounds from jap_rounds_today
            where user_id='${PU2}' and ist_date=ist_today()`))[0].rounds, 9);

// security contract: not security definer, views are security_invoker
check("points_summary is not security definer",
  (await q(`select prosecdef from pg_proc where proname='points_summary'`))[0].prosecdef, false);
const pinv = await q(`select relname, reloptions from pg_class
  where relname in ('points_daily','jap_rounds_today') order by relname`);
check("points views are security_invoker",
  pinv.map(r => `${r.relname}:${String(r.reloptions).includes("security_invoker=true")}`),
  ["jap_rounds_today:true", "points_daily:true"]);

// append-only: daily_checkins has no update/delete policy
check("daily_checkins has no update/delete policy",
  (await q(`select cmd from pg_policies where tablename='daily_checkins'`))
    .map(p => p.cmd).sort(), ["INSERT", "SELECT"]);

// config tables: public read + admin write, RLS enabled
const cfgrls = await q(`select relname, relrowsecurity from pg_class
  where relname in ('points_rules','streak_milestones','daily_checkins') order by relname`);
check("RLS enabled on all 3 new tables",
  cfgrls.map(r => `${r.relname}:${r.relrowsecurity}`),
  ["daily_checkins:true", "points_rules:true", "streak_milestones:true"]);

// Guardrail (reviewer finding): a SECOND active rule for an activity_type that
// already has one must be rejected by the partial unique index — else
// points_daily joins a row to both and doubles that type's points. Unique
// indexes bind the table owner too, so PGlite can prove this (unlike RLS).
let dupRejected = false;
try {
  await db.exec(`insert into points_rules (rule_key, activity_type, base_points, daily_cap)
                 values ('workout_bonus', 'workout', 5, 5)`);
} catch { dupRejected = true; }
check("points_rules: a second active rule for one activity_type is rejected", dupRejected, true);
// …but an INACTIVE duplicate is fine (the guard is on active rules only).
let inactiveOk = true;
try {
  await db.exec(`insert into points_rules (rule_key, activity_type, base_points, daily_cap, active)
                 values ('workout_off', 'workout', 5, 5, false)`);
} catch { inactiveOk = false; }
check("points_rules: an inactive duplicate rule is allowed", inactiveOk, true);

console.log("\n" + results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
