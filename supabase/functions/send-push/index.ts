/**
 * send-push — the only thing in this project that can send a notification.
 * Spec: docs/specs/feature-sprint.md slice 7. Fan-out SQL: migration 0014.
 *
 * This is the first Edge Function in the repo. It runs on Deno inside Supabase,
 * NOT in the app bundle — nothing here is bundled by Metro, and the app's
 * imports (src/lib/*) are unavailable and irrelevant. That separation is the
 * point: sending requires `service_role` (to read every user's tokens) and,
 * once Expo push security is switched on, an Expo access token. Neither may
 * ever be shipped to a phone.
 *
 * ── Three invocations, one function ────────────────────────────────────────
 *
 *   {"kind":"daily_reminder"}   cron, half-hourly    → whoever's chosen time passed
 *   {"kind":"streak_at_risk"}   cron, 20:00 IST      → trained yesterday, not today
 *   {"kind":"plan_ready"}       the app, on assign   → the caller, and only the caller
 *   {"mode":"receipts"}         cron, every 10 min   → prune tokens Expo says are dead
 *
 * ── What this function does NOT decide ─────────────────────────────────────
 *
 * Eligibility. Not one line below asks whether a user opted in, whether they
 * already trained today, or whether we already notified them. `push_claim()`
 * answers all of that in SQL and hands back a list of devices, having already
 * written the ledger row that stops a retry from sending twice. This function
 * renders copy and talks to Expo. Keeping it that thin is deliberate: the
 * eligibility rules are the compliance surface of the feature, and they belong
 * somewhere reviewable and testable (supabase/tests/validate.mjs), not in a
 * deploy artefact.
 *
 * ── Deploy ─────────────────────────────────────────────────────────────────
 *
 *   supabase functions deploy send-push --no-verify-jwt
 *
 * `--no-verify-jwt` is required and is NOT a hole: the cron path carries no
 * JWT at all (it authenticates with a shared secret), so the platform's
 * built-in check would reject it. Every path is authorised explicitly in
 * `authorize()` below, and an unauthenticated request reaches nothing.
 *
 * Secrets (supabase secrets set …):
 *   CRON_SECRET        required. Shared with the pg_cron jobs in 0014.
 *   EXPO_ACCESS_TOKEN  optional. Required only once "Enhanced Security for
 *                      Push Notifications" is enabled on the Expo account.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const EXPO_SEND = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS = "https://exp.host/--/api/v2/push/getReceipts";

/** Expo's documented request ceilings. */
const SEND_CHUNK = 100;
const RECEIPT_CHUNK = 300;

/** Expo needs a few minutes before a receipt exists. Asking sooner just
 *  returns nothing and burns a request. */
const RECEIPT_DELAY_MS = 15 * 60 * 1000;

type Kind = "daily_reminder" | "streak_at_risk" | "plan_ready";
type Language = "hindi" | "english" | "mixed";

interface Device {
  user_id: string;
  device_id: string;
  expo_push_token: string;
  platform: "android" | "ios" | "web";
  language_mode: Language;
}

/**
 * Notification copy — the SECOND and only other place user-facing strings live
 * in this project (the first is src/lib/i18n.tsx, which says so).
 *
 * It cannot go through the app's i18n layer: a scheduled push is composed at
 * 19:00 IST by a cron job with the app not running on any device. So the text
 * is rendered here against the recipient's `profiles.language_mode`, which
 * `push_audience()` returns alongside their token for exactly this reason.
 *
 * COMPLIANCE — every string here is behavioural and devotional, never medical.
 * No claim about weight, health, symptoms, or outcomes; nothing that could read
 * as treatment or prevention. The rule is the same one CLAUDE.md sets for the
 * app, and it is easier to break here because these strings are invisible in
 * the codebase's UI. Anything added below gets read against that rule first.
 */
const COPY: Record<Kind, Record<"hi" | "en", { title: string; body: string }>> = {
  daily_reminder: {
    hi: { title: "आज का अभ्यास 🙏", body: "कुछ मिनट अपने लिए — आज का व्यायाम आपका इंतज़ार कर रहा है।" },
    en: { title: "Today's practice 🙏", body: "A few minutes for yourself — today's workout is waiting." },
  },
  streak_at_risk: {
    hi: { title: "आपका दीया अभी जल रहा है", body: "आज पूरा करें और अपना संकल्प बनाए रखें।" },
    en: { title: "Your diya is still lit", body: "Complete today to keep your sankalp going." },
  },
  plan_ready: {
    hi: { title: "आपका plan तैयार है", body: "आपके उत्तरों के अनुसार बना — अभी देखें।" },
    en: { title: "Your plan is ready", body: "Shaped by the answers you gave — take a look." },
  },
};

/**
 * How long a notification stays worth delivering.
 *
 * A phone that was off all night must not buzz at 7am with last evening's
 * "complete today to keep your sankalp" — the day it referred to is over and
 * the message is now simply wrong. Expo passes this to FCM/APNs, which drop
 * the message themselves rather than delivering it late.
 */
const TTL_SECONDS: Record<Kind, number> = {
  daily_reminder: 3 * 3600,
  streak_at_risk: 3 * 3600,
  plan_ready: 24 * 3600, // still true tomorrow
};

/** 'mixed' leads in Hindi, exactly like `t()` in the app's i18n layer. */
const langKey = (l: Language): "hi" | "en" => (l === "english" ? "en" : "hi");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function expoHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    // Expo compresses large responses; asking for the plain form keeps parsing
    // simple in a runtime where we cannot rely on transparent decoding.
    "Accept-Encoding": "identity",
  };
  const token = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ---------- authorisation ----------

/**
 * Who is allowed to ask for what.
 *
 * Two callers, two mechanisms, and the difference decides the target:
 *
 *   cron   — proves itself with CRON_SECRET, may fan out, may not name a user.
 *   the app — proves itself with the user's own JWT, may ONLY ask for
 *             plan_ready, and the recipient is taken from the verified token.
 *
 * The recipient is never read from the request body. That single rule is what
 * makes this endpoint safe to expose to the app: the worst a malicious client
 * achieves is one notification to itself, which `push_claim()` then limits to
 * once per day anyway.
 */
async function authorize(
  req: Request,
  kind: Kind,
  admin: SupabaseClient,
): Promise<{ ok: true; target: string | null } | { ok: false; status: number; error: string }> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const presented = req.headers.get("x-cron-secret");

  if (presented) {
    // Compare only when a secret is actually configured — otherwise a missing
    // CRON_SECRET would make `undefined === null` style slips authenticate.
    if (!cronSecret || presented !== cronSecret) {
      return { ok: false, status: 401, error: "bad cron secret" };
    }
    return { ok: true, target: null };
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return { ok: false, status: 401, error: "unauthenticated" };

  // A signed-in user may trigger exactly one kind. The scheduled kinds are
  // fan-outs; letting a client start one would be a spam button.
  if (kind !== "plan_ready") {
    return { ok: false, status: 403, error: "that kind is cron-only" };
  }

  const { data, error } = await admin.auth.getUser(auth.replace(/^Bearer /i, ""));
  if (error || !data.user) return { ok: false, status: 401, error: "invalid token" };

  return { ok: true, target: data.user.id };
}

// ---------- sending ----------

/**
 * Push one batch and interpret the tickets.
 *
 * Two outcomes matter and they are different things:
 *   - `DeviceNotRegistered` — the token is dead. Delete the row; it will never
 *     work again and re-sending to it every night is the "sending into the
 *     void" the spec calls out.
 *   - any other error — transient or our fault. Leave the token alone. A
 *     network blip must not cost a user their notifications permanently.
 *
 * Accepted tickets are parked in `push_receipts`, because a token can also die
 * BETWEEN a successful ticket and the actual delivery, and that only ever
 * surfaces in the receipt (see `collectReceipts`).
 */
async function sendBatch(
  admin: SupabaseClient,
  messages: { to: string; [k: string]: unknown }[],
): Promise<{ sent: number; dead: string[]; tickets: { ticket_id: string; expo_push_token: string }[] }> {
  const res = await fetch(EXPO_SEND, {
    method: "POST",
    headers: expoHeaders(),
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    // A whole-batch failure (Expo down, rate limited, bad access token). No
    // ticket exists for any message, so nothing is dead and nothing is parked;
    // the next scheduled run will find these users still unclaimed only if the
    // claim was rolled back — it was not. See the note in the handler.
    console.error(`expo send failed: ${res.status}`);
    return { sent: 0, dead: [], tickets: [] };
  }

  const payload = (await res.json()) as {
    data?: { status: string; id?: string; details?: { error?: string } }[];
  };
  const tickets = payload.data ?? [];

  const dead: string[] = [];
  const parked: { ticket_id: string; expo_push_token: string }[] = [];
  let sent = 0;

  // Expo returns tickets positionally, one per message, in request order.
  tickets.forEach((ticket, i) => {
    const to = messages[i]?.to;
    if (!to) return;
    if (ticket.status === "ok") {
      sent += 1;
      if (ticket.id) parked.push({ ticket_id: ticket.id, expo_push_token: to });
    } else if (ticket.details?.error === "DeviceNotRegistered") {
      dead.push(to);
    }
  });

  if (parked.length) {
    // ignoreDuplicates: a retried batch can re-park the same ticket id.
    await admin.from("push_receipts").upsert(parked, {
      onConflict: "ticket_id",
      ignoreDuplicates: true,
    });
  }

  return { sent, dead, tickets: parked };
}

/** Delete every row holding one of these tokens. Keyed on the token value,
 *  not the owner, because the same dead token may sit under several users on a
 *  handed-down phone (index push_tokens_token_idx, migration 0011). */
async function pruneTokens(admin: SupabaseClient, tokens: string[]): Promise<number> {
  if (!tokens.length) return 0;
  const unique = [...new Set(tokens)];
  const { error } = await admin.from("push_tokens").delete().in("expo_push_token", unique);
  if (error) {
    console.error("token prune failed");
    return 0;
  }
  return unique.length;
}

/**
 * The second half of the delivery contract.
 *
 * Tickets say Expo accepted the message. Receipts, a few minutes later, say
 * what FCM/APNs did with it — and they are the only place an app uninstalled
 * after our send shows up as `DeviceNotRegistered`. Without this pass,
 * push_tokens accumulates uninstalled devices forever and every nightly fan-out
 * gets slower and less accurate.
 *
 * `push_receipts` is a work queue: rows are deleted once resolved, whatever the
 * answer, so it stays near-empty. Rows too young to have a receipt are left for
 * the next run.
 */
async function collectReceipts(admin: SupabaseClient): Promise<{ checked: number; pruned: number }> {
  const cutoff = new Date(Date.now() - RECEIPT_DELAY_MS).toISOString();

  const { data, error } = await admin
    .from("push_receipts")
    .select("ticket_id, expo_push_token")
    .lt("created_at", cutoff)
    // Bounded so one invocation cannot run past the function's time limit and
    // die having done nothing. The backlog drains over subsequent runs.
    .limit(RECEIPT_CHUNK * 4);

  if (error || !data?.length) return { checked: 0, pruned: 0 };

  // Annotated rather than inferred: without generated database types the client
  // hands back untyped rows, and an inferred Map<unknown, unknown> makes every
  // ticket id below an `unknown` that silently stops being a string.
  const rows = data as { ticket_id: string; expo_push_token: string }[];
  const byTicket = new Map<string, string>(rows.map((r) => [r.ticket_id, r.expo_push_token]));
  const dead: string[] = [];
  const resolved: string[] = [];

  for (const batch of chunk([...byTicket.keys()], RECEIPT_CHUNK)) {
    const res = await fetch(EXPO_RECEIPTS, {
      method: "POST",
      headers: expoHeaders(),
      body: JSON.stringify({ ids: batch }),
    });
    if (!res.ok) {
      console.error(`expo receipts failed: ${res.status}`);
      continue; // leave this batch queued for the next run
    }

    const payload = (await res.json()) as {
      data?: Record<string, { status: string; details?: { error?: string } }>;
    };
    const receipts = payload.data ?? {};

    for (const id of batch) {
      const receipt = receipts[id];
      // Absent means "not ready yet" — keep it queued rather than dropping a
      // ticket we never got an answer for.
      if (!receipt) continue;
      resolved.push(id);
      if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
        const token = byTicket.get(id);
        if (token) dead.push(token);
      }
    }
  }

  const pruned = await pruneTokens(admin, dead);
  if (resolved.length) await admin.from("push_receipts").delete().in("ticket_id", resolved);

  return { checked: resolved.length, pruned };
}

// ---------- handler ----------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "function is not configured" }, 500);

  // service_role: it must read every user's tokens and write the ledger, so it
  // bypasses the RLS that makes push_sends / push_receipts unreadable to
  // everyone else. This client is never given a user's Authorization header.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: { kind?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  // --- receipts mode: cron only, no kind, no audience ---
  if (body.mode === "receipts") {
    const secret = Deno.env.get("CRON_SECRET");
    if (!secret || req.headers.get("x-cron-secret") !== secret) {
      return json({ error: "unauthenticated" }, 401);
    }
    return json(await collectReceipts(admin));
  }

  const kind = body.kind;
  if (kind !== "daily_reminder" && kind !== "streak_at_risk" && kind !== "plan_ready") {
    return json({ error: "unknown kind" }, 400);
  }

  const auth = await authorize(req, kind, admin);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  // Claim first: this writes the (user, kind, IST day) ledger row and returns
  // only the devices whose row we won. Two overlapping cron runs therefore
  // split into one that sends and one that gets nothing, rather than both
  // sending. The cost is that a total Expo outage still burns the day's claim —
  // accepted deliberately, because the alternative (claim after sending) turns
  // every lost response into a duplicate notification, and a duplicate is what
  // makes people disable notifications.
  const { data, error } = await admin.rpc("push_claim", {
    p_kind: kind,
    p_target: auth.target,
  });
  if (error) {
    console.error("push_claim failed");
    return json({ error: "claim failed" }, 500);
  }

  const devices = (data ?? []) as Device[];
  if (!devices.length) return json({ kind, claimed: 0, sent: 0, pruned: 0 });

  const messages = devices.map((d) => {
    const copy = COPY[kind][langKey(d.language_mode)];
    return {
      to: d.expo_push_token,
      title: copy.title,
      body: copy.body,
      sound: "default",
      ttl: TTL_SECONDS[kind],
      priority: "normal" as const,
      // Must match the channel src/lib/push.ts creates, or Android files this
      // under a default channel the user never configured.
      channelId: "reminders",
      // The tap payload. A KIND, never a route: the app maps it through a
      // closed allowlist, so this cannot be used to steer navigation.
      data: { kind },
    };
  });

  let sent = 0;
  const dead: string[] = [];
  for (const batch of chunk(messages, SEND_CHUNK)) {
    const result = await sendBatch(admin, batch);
    sent += result.sent;
    dead.push(...result.dead);
  }

  const pruned = await pruneTokens(admin, dead);

  // Counts only. Never log a token, a user id, or the secret — function logs
  // are retained and readable by anyone with dashboard access.
  console.log(`send-push ${kind}: claimed=${devices.length} sent=${sent} pruned=${pruned}`);
  return json({ kind, claimed: devices.length, sent, pruned });
});
