# n8n setup — AI custom diet plan

The importable workflow is `n8n/diet-plan-workflow.json`. It receives the
questionnaire answers from the app, asks Claude for a plan, and writes the
result back into Supabase. You only need to paste **4 values** and copy **1
URL** back into the app. No code changes.

## What the workflow does

```
App → (POST request_id + answers) → n8n Webhook
      → verify shared secret
      → Supabase: set status = 'generating'
      → Anthropic Claude: generate the plan (JSON)
      → parse the JSON
      → Supabase: set plan + status = 'ready'   (or status = 'failed')
      → respond 200 to the app
App ← polls the diet_plan_requests row until status is ready/failed
```

The app **never** holds the Supabase service-role key or the Anthropic key —
both live only inside n8n. The app only knows the webhook URL and the shared
secret.

## Step 1 — import

n8n → **Workflows → Import from File** → pick `n8n/diet-plan-workflow.json`.

## Step 2 — replace the 4 placeholders

Search-and-replace these literal strings across the workflow nodes (they appear
in the HTTP Request nodes' URL / headers / body, and one in the IF node):

| Placeholder | Replace with | Where to get it |
|---|---|---|
| `REPLACE_SUPABASE_HOST` | your project host, e.g. `hkycmhzsubrccdhlcqsj.supabase.co` (no `https://`) | Supabase → Project Settings → API → Project URL |
| `REPLACE_SUPABASE_SERVICE_ROLE_KEY` | the **service_role** secret (NOT anon) | Supabase → Project Settings → API → `service_role` |
| `REPLACE_ANTHROPIC_API_KEY` | your Anthropic API key | console.anthropic.com → API Keys |
| `REPLACE_SHARED_SECRET` | any random string you invent (e.g. a UUID) | you make it up; used to reject forged calls |

> The service-role key bypasses RLS — that's how n8n writes the plan back into
> a user's row. Keep it inside n8n only. Never put it in the app or in git.

Nodes that use each placeholder:
- `Set Generating`, `Save Ready`, `Save Failed` → all four Supabase fields.
- `Anthropic` → the Anthropic key. Change `claude-sonnet-5` there if you want a
  different model.
- `Check Secret` → the shared secret.

## Step 3 — activate + copy the webhook URL

Toggle the workflow **Active**. Open the **Webhook** node → copy the
**Production URL** (looks like `https://<your-n8n>/webhook/diet-plan`).

## Step 4 — wire the app

In the app's `.env` (see `.env.example`):

```
EXPO_PUBLIC_N8N_DIET_WEBHOOK_URL=https://<your-n8n>/webhook/diet-plan
EXPO_PUBLIC_N8N_DIET_SECRET=<the same REPLACE_SHARED_SECRET value>
```

Rebuild/restart the app so the env vars load. Done.

> Don't want a secret? Delete the `Check Secret` node and connect `Extract
> Input → Set Generating` directly, and leave `EXPO_PUBLIC_N8N_DIET_SECRET`
> blank. (Not recommended — the webhook URL would then accept any caller.)

## The plan shape

The `Anthropic` node instructs Claude to return exactly this JSON, which the
app renders in `app/diet/plan.tsx` (and is typed as `DietPlan` in
`src/types/db.ts`):

```json
{
  "summary_hi": "…", "summary_en": "…",
  "daily_kcal": 2000,
  "days": [
    {
      "label_hi": "दिन 1", "label_en": "Day 1",
      "meals": [
        {
          "meal_time": "breakfast",
          "title_hi": "…", "title_en": "…",
          "items_hi": ["…"], "items_en": ["…"],
          "kcal": 400
        }
      ]
    }
  ]
}
```

If Claude returns something unparseable, the workflow sets `status='failed'`
with the reason and the app shows a retry.

## Testing without the app

`curl` the webhook with a real `request_id` (a row you inserted into
`diet_plan_requests` while signed in), and watch the row flip to `ready`:

```
curl -X POST https://<your-n8n>/webhook/diet-plan \
  -H "Content-Type: application/json" \
  -H "x-fithindu-secret: <your secret>" \
  -d '{"request_id":"<uuid>","answers":{"height_cm":170,"weight_kg":68,"region":"north","goal":"weight_loss","diet_type":"veg","activity_level":"moderate"}}'
```

## Compliance reminder

This pipeline sends user health data (height/weight/region/goal) to Anthropic.
Before public launch, update `legal/THIRD_PARTY_PROCESSORS.md`,
`legal/DATA_INVENTORY.md`, the privacy policy, and the Play Data Safety form to
disclose the AI processor and this data flow. See `docs/decisions.md`
(2026-07-16 AI diet override).
