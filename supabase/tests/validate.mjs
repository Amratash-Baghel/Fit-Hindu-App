/**
 * Validates migrations 0001-0012 against a real Postgres engine (PGlite), then
 * exercises the streak rules from docs/specs/feature-sprint.md.
 *
 * RUN:  npx --yes -p @electric-sql/pglite node supabase/tests/validate.mjs
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

for (const f of files.filter(f => !f.startsWith("0012"))) {
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

console.log("\n" + results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
