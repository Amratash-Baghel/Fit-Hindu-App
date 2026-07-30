/**
 * Push notifications — the client half. Spec: docs/specs/feature-sprint.md
 * slice 7. Tables from 0011, fan-out from 0014.
 *
 * What this file does and does not do:
 *
 *   DOES     ask for permission at the right moment, obtain the Expo token,
 *            keep exactly one `push_tokens` row per (user, install), create the
 *            Android channel, and route a tap to the right screen.
 *   DOES NOT send anything, ever. There is no send path in the client and
 *            there must never be one — sending needs the Expo access token and
 *            the ability to read other users' rows, both of which live in the
 *            Edge Function (supabase/functions/send-push).
 *
 * Three constraints shaped the code more than anything else:
 *
 * 1. **Remote push does not work in Expo Go on Android from SDK 53 onward**, and
 *    we are on 57. Everything here is inert in Expo Go and on web; it needs a
 *    dev/EAS build. `pushUnavailableReason()` reports which wall you hit rather
 *    than failing silently, because "notifications don't work" with no
 *    explanation is the most expensive bug report this feature can generate.
 *
 * 2. **The app is guest-first.** A guest has no `auth.users` row, so there is
 *    nothing to hang a token on. The token is still fetched and cached locally,
 *    and `registerPushToken()` is re-run on sign-in (src/lib/auth.tsx), so the
 *    device is registered the moment an owner exists.
 *
 * 3. **A tap must never be able to navigate anywhere the payload asks.** The
 *    server sends a `kind`, not a route; the mapping to a screen lives here, in
 *    a closed table. A compromised or spoofed payload can therefore pick one of
 *    three known screens and nothing else — not a deep link into a flow that
 *    writes, and not an arbitrary path.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";
import { uuidv4 } from "./ids";
import type { NotificationKind } from "../types/db";

/** Stable across reinstalls of the JS bundle, regenerated on a fresh install. */
const DEVICE_KEY = "fithindu.push.device_id";
/** Whether the in-app invitation has been shown and answered (see below). */
const OFFERED_KEY = "fithindu.push.offered";

/**
 * The single Android channel. Android 8+ ignores per-notification importance
 * and takes it from the channel, and a channel's importance is immutable after
 * creation — so this choice is effectively permanent for an install.
 *
 * DEFAULT, not HIGH: HIGH means heads-up, which floats a card over whatever the
 * user is doing. A daily sadhana reminder is a gentle nudge, not an alarm, and
 * a habit app that interrupts is a habit app that gets muted. DEFAULT still
 * makes a sound and sits in the shade.
 */
const CHANNEL_ID = "reminders";

/**
 * Where a tap lands, per kind. A closed map, deliberately — see the header.
 * `plan_ready` goes to Home rather than /plan/ready: the ceremony route owns a
 * write and blocks back, and re-entering it from a notification would be a
 * trapdoor.
 */
const ROUTE_FOR: Record<NotificationKind, string> = {
  daily_reminder: "/(tabs)/workout",
  streak_at_risk: "/(tabs)",
  plan_ready: "/(tabs)",
};

const isKind = (v: unknown): v is NotificationKind =>
  v === "daily_reminder" || v === "streak_at_risk" || v === "plan_ready";

/** See `watchNotificationTaps` — the launch response is a one-shot, not a queue. */
let coldStartHandled = false;

/**
 * A notification that arrives while the app is open.
 *
 * Banner yes, sound no. All three v1 types are nudges to open the app — and the
 * app is already open, so the sound would be noise. The banner still carries
 * the message for someone who is in a different tab.
 *
 * Set at module scope so it is installed before any listener can fire.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ---------- availability ----------

/**
 * Why push cannot work here, or null if it can. Callers use this to explain
 * themselves in the UI and in logs instead of silently doing nothing.
 */
export function pushUnavailableReason(): "web" | "no-project-id" | null {
  if (Platform.OS === "web") return "web";
  if (!projectId()) return "no-project-id";
  return null;
}

/**
 * The EAS project id, which `getExpoPushTokenAsync` requires in a dev/EAS build
 * (it identifies which project's credentials sign the push).
 *
 * `eas init` writes this into app.json as `extra.eas.projectId`. It is NOT
 * there yet — see docs/SPRINT-STATE.md, owner actions. Until it is, every
 * function below no-ops rather than throwing: a missing build-time id must not
 * take down a workout.
 */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/** One id per install, so a reinstall replaces its row instead of orphaning it. */
async function deviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const fresh = uuidv4();
    await AsyncStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    // Unreadable storage: a per-launch id still works for THIS session's sends,
    // it just accumulates rows. Better than no notifications at all, and the
    // Edge Function prunes dead tokens on DeviceNotRegistered.
    return uuidv4();
  }
}

// ---------- permission ----------

export type PushPermission = "granted" | "denied" | "undetermined";

export async function getPushPermission(): Promise<PushPermission> {
  if (pushUnavailableReason()) return "denied";
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === "granted") return "granted";
    // iOS reports `undetermined` only before the first ask; Android 13+ reports
    // `denied` with canAskAgain=true when the runtime prompt has not been shown.
    return status === "denied" && !canAskAgain ? "denied" : "undetermined";
  } catch {
    return "denied";
  }
}

/**
 * Show the system prompt, and register the token if it is granted. Returns
 * whether we ended up with permission.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (pushUnavailableReason()) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return false;
  } catch {
    return false;
  }
  await registerPushToken();
  return true;
}

/**
 * Whether to show the in-app invitation — the pre-prompt that precedes the
 * system dialog.
 *
 * The two-step exists because the system prompt is ONE SHOT on iOS: a decline
 * is permanent short of a trip to iOS Settings, and Android 13+ behaves the
 * same way after two dismissals. Firing it unannounced spends that single
 * chance on a user who has no idea what they are being asked for.
 *
 * So the app asks first, in its own words, on the completion screen of a
 * workout the user just finished — where "remind me to do that again" is an
 * obvious yes. Only that yes reaches the OS. A no costs nothing: it never
 * touched the system prompt, so Settings can still offer it later.
 *
 * True only when: push can work here, the OS has not already decided, and we
 * have not already offered.
 */
export async function shouldOfferPush(): Promise<boolean> {
  if (pushUnavailableReason()) return false;
  if ((await getPushPermission()) !== "undetermined") return false;
  try {
    return (await AsyncStorage.getItem(OFFERED_KEY)) === null;
  } catch {
    return false; // can't tell — don't risk showing it on every workout
  }
}

/**
 * Remember that the invitation has been answered, either way.
 *
 * A "not now" is recorded too, and that is the point: the card never returns
 * uninvited. Settings keeps a permanent way in, so declining here closes a
 * nag, not a door.
 */
export async function markPushOffered(): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFERED_KEY, "1");
  } catch {
    /* worst case the invitation appears once more */
  }
}

// ---------- registration ----------

/**
 * Ensure the Android channel exists. Cheap and idempotent; Android keeps the
 * FIRST definition, so re-running with different settings changes nothing.
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Daily reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      vibrationPattern: [0, 200],
      lightColor: "#F0761E", // saffron — the app's action colour
    });
  } catch {
    // A missing channel means Android drops the notification, but there is
    // nothing useful to do about it here and it must not break the caller.
  }
}

/**
 * Fetch the Expo token and store it against the signed-in user.
 *
 * Safe to call often — it runs at launch, on sign-in, and after the permission
 * prompt. The upsert is keyed on (user_id, device_id) exactly so those repeats
 * refresh `last_seen_at` instead of piling up rows (migration 0011).
 *
 * Returns the token when a row was written, null in every other case (guest,
 * no permission, Expo Go, web, no project id, offline).
 */
export async function registerPushToken(): Promise<string | null> {
  if (pushUnavailableReason()) return null;
  if ((await getPushPermission()) !== "granted") return null;

  await ensureChannel();

  let token: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    token = res.data;
  } catch {
    // Expo Go on Android (SDK 53+), a simulator, an unreachable Expo service,
    // or FCM credentials not yet uploaded to EAS. All of them mean "no token
    // today"; none of them mean the app is broken.
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    // A guest has no row to own the token. It is not lost: this same function
    // runs again from onAuthStateChange the moment they sign in.
    if (!user) return null;

    // program_id is on the token because a send is targeted at a DEVICE and the
    // fan-out may one day want to segment by program (0011). Best-effort — the
    // column is nullable by design and a missing plan must not block the token.
    const { data: plan } = await supabase
      .from("user_plans")
      .select("program_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: user.id,
        device_id: await deviceId(),
        expo_push_token: token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        program_id: plan?.program_id ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" },
    );
    return error ? null : token;
  } catch {
    return null;
  }
}

/**
 * Drop this device's row on sign-out.
 *
 * Not optional hygiene: without it, the next scheduled reminder for the
 * previous account lands on a phone that is now signed out or signed in as
 * somebody else. Shared phones are common in the target audience.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("device_id", await deviceId());
  } catch {
    // Offline sign-out. The row survives; the Edge Function will delete it the
    // first time Expo answers DeviceNotRegistered, and until then the worst
    // case is one stale reminder.
  }
}

// ---------- taps ----------

/**
 * Resolve a notification payload to a route, or null if we do not recognise it.
 * Exported for the unit-style check in the settings screen's dev path and to
 * keep the allowlist testable in isolation.
 */
export function routeForNotification(data: unknown): string | null {
  const kind = (data as { kind?: unknown } | null | undefined)?.kind;
  return isKind(kind) ? ROUTE_FOR[kind] : null;
}

/**
 * Wire notification taps to navigation. Call once, from the root layout; the
 * returned function unsubscribes.
 *
 * Two paths, both needed:
 *   - cold start — the app was launched BY the tap, so there is no listener yet
 *     and the response is waiting in `getLastNotificationResponseAsync`
 *   - warm — the app was already running; the listener fires
 *
 * `navigate` is injected rather than importing the router here, so this module
 * stays free of expo-router and can be reasoned about (and called) outside a
 * navigation context.
 */
export function watchNotificationTaps(navigate: (route: string) => void): () => void {
  let alive = true;

  // The cold-start response is read at most ONCE per JS runtime.
  //
  // `getLastNotificationResponseAsync` keeps returning the same response for
  // the life of the process — it is a "what launched me", not a queue. So any
  // remount of the root layout (Fast Refresh in development, a provider swap,
  // a future error-boundary reset) would replay the navigation and yank the
  // user back to a screen they had already left. Module scope, not a ref,
  // because the guard has to outlive the component.
  if (!coldStartHandled) {
    coldStartHandled = true;
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!alive || !response) return;
        const route = routeForNotification(response.notification.request.content.data);
        if (route) navigate(route);
      })
      .catch(() => {});
  }

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = routeForNotification(response.notification.request.content.data);
    if (route) navigate(route);
  });

  return () => {
    alive = false;
    sub.remove();
  };
}

// ---------- plan-ready ----------

/**
 * Ask the server to send this user their plan-ready notification.
 *
 * This is NOT a send path in the client. The client cannot address anyone: the
 * Edge Function takes the recipient from the caller's JWT and ignores the body
 * entirely, then applies the same `push_claim()` eligibility every scheduled
 * send goes through. The most a malicious caller achieves is one notification
 * to themselves, once per day.
 *
 * Fire-and-forget, and deliberately not awaited by the ceremony: a plan is
 * ready whether or not a push about it lands.
 */
export async function requestPlanReadyPush(): Promise<void> {
  if (pushUnavailableReason()) return;
  try {
    // The body names the KIND only. There is no recipient field to send — the
    // function derives the user from the Authorization header — which is what
    // makes this endpoint safe to expose to the app at all.
    await supabase.functions.invoke("send-push", { body: { kind: "plan_ready" } });
  } catch {
    // The plan exists regardless. Never surface this.
  }
}
