# send-push

The only send path in this project. Runs on Deno inside Supabase; never bundled
into the app.

Spec: `docs/specs/feature-sprint.md` slice 7. Fan-out SQL: migration `0014`.

## Prerequisites (all on the owner)

1. **Migration 0014 applied.** The function calls `push_claim()`; without it
   every invocation returns `claim failed`.
2. **FCM v1 service-account JSON uploaded to EAS** (`eas credentials`,
   Android → push). Without it Expo has nothing to hand the message to on
   Android and every ticket errors.
3. **`extra.eas.projectId` in `app.json`** — written by `eas init`. Without it
   the app never obtains a token, so there is nobody to send to.
4. **A dev/EAS build installed on a physical Android device.** Remote push does
   not work in Expo Go on Android from SDK 53 onward, and this project is on 57.

## Deploy

```bash
supabase functions deploy send-push --no-verify-jwt
```

`--no-verify-jwt` is required, and it is not a hole. The cron path carries no
JWT at all — it authenticates with a shared secret — so the platform's built-in
check would reject it before the function ran. Every path is authorised
explicitly inside `authorize()`, and an unauthenticated request reaches nothing.

## Secrets

```bash
supabase secrets set CRON_SECRET="$(openssl rand -hex 32)"
# Only once "Enhanced Security for Push Notifications" is enabled on the Expo
# account. Leave unset otherwise.
supabase secrets set EXPO_ACCESS_TOKEN="…"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform —
do not set them, and never put either in `eas.json`, `app.json`, or any file the
app can read.

## Invocations

| Body | Caller | When |
|---|---|---|
| `{"kind":"daily_reminder"}` | cron | every 30 min; sends to whoever's chosen IST time just passed |
| `{"kind":"streak_at_risk"}` | cron | 20:00 IST; trained yesterday, nothing today |
| `{"kind":"plan_ready"}` | the app | on plan assignment, and only while backgrounded |
| `{"mode":"receipts"}` | cron | every 10 min; prunes tokens Expo reports dead |

Cron requests carry `x-cron-secret`. The app's request carries the user's JWT,
and the recipient is taken from that token — **never** from the body. A client
therefore cannot address anyone but itself, and `push_claim()` limits even that
to once per day.

The three cron jobs are not created by the migration; the `cron.schedule` calls
are written out at the bottom of `0014_push_fanout.sql` and must be run once by
hand, because they embed the project ref and the secret.

## Smoke test

```bash
curl -X POST "https://<ref>.functions.supabase.co/send-push" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -d '{"kind":"daily_reminder"}'
```

Expect `{"kind":"daily_reminder","claimed":N,"sent":N,"pruned":0}`.

`claimed: 0` is the normal answer most of the time and is not a failure — it
means nobody was due. To force yourself into the audience: set your
`notification_prefs.reminder_time` to a few minutes ago, make sure you have no
`activity_log` row for today (IST), and delete your `push_sends` row for
`daily_reminder` and today's date.

## What it deliberately does not do

**It decides nothing about eligibility.** Whether a user opted in, whether they
already trained today, whether we already notified them — all of that is
`push_claim()` in SQL, tested by `supabase/tests/validate.mjs`. This function
renders copy and talks to Expo. Keep it that thin: those rules are the
compliance surface of the feature and they belong somewhere reviewable.

**It does not roll back a claim when Expo is down.** The ledger row is written
before the send, so a total Expo outage burns that day's notification for the
affected users. That direction is chosen: claiming afterwards turns every lost
response into a duplicate push, and duplicates are what make people disable
notifications for good.

## Notification copy

The strings live in `COPY` at the top of `index.ts` — the second and only other
place user-facing text lives in this project. It cannot go through
`src/lib/i18n.tsx`, because a scheduled push is composed at 19:00 IST with the
app not running on any device; the text is rendered against the recipient's
`profiles.language_mode`, which `push_audience()` returns for that purpose.

Every string is behavioural and devotional. **No health, medical or therapeutic
claim in either language** — no weight, no symptoms, no outcomes. Read anything
new against that rule before adding it; these strings are easy to miss because
they never appear in the app's UI code.
