/**
 * Auth — session state + the guest→user bridge.
 *
 * Shape (owner decisions 2026-07-15):
 *  - Guest-first. The questionnaire runs with no account; sign-in is offered
 *    AFTER the plan-ready moment, and is skippable. Everything the user
 *    answered lives in AsyncStorage until a session exists.
 *  - OTP, channel-agnostic. `AUTH_CHANNEL` is the only switch between email and
 *    phone: the screens, the verify step, and this file are identical either
 *    way. Phone is the v1 target for a Hindi-first audience; we develop against
 *    email until the SMS provider (MSG91/Twilio) is wired into Supabase, since
 *    without it Supabase cannot send a single SMS.
 *
 * Session persistence is already configured in ./supabase (AsyncStorage +
 * autoRefreshToken), so a signed-in user stays signed in across restarts.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { useI18n, type StringKey } from "./i18n";
import { assignPlan } from "./plan";
import { flushQueue } from "./session";
import { registerPushToken, unregisterPushToken } from "./push";
import {
  QUESTIONNAIRE_VERSION, answersToProfile, clearProgress, loadProgress, markOnboarded,
} from "./onboarding";
import type { LanguageMode } from "../types/db";

/**
 * The OTP channel. Flip to "phone" the day the SMS provider is live in
 * Supabase (Auth → Providers → Phone). Nothing else changes.
 */
export const AUTH_CHANNEL: "email" | "phone" = "email";

/**
 * The identifier awaiting verification, held in module state rather than passed
 * as a route param: on web, route params land in the address bar, and a phone
 * number or email does not belong in a URL (browser history, referrers, any
 * analytics that records the path).
 */
let pendingIdentifier: string | null = null;

export const getPendingIdentifier = (): string | null => pendingIdentifier;

/** Send the one-time code. `identifier` is an email, or E.164 phone (+91…). */
export async function sendOtp(identifier: string): Promise<void> {
  const { error } =
    AUTH_CHANNEL === "phone"
      ? await supabase.auth.signInWithOtp({ phone: identifier })
      : await supabase.auth.signInWithOtp({ email: identifier });
  if (error) throw error;
  pendingIdentifier = identifier;
}

/** Exchange the code for a session. Creates the account on first use. */
export async function verifyOtp(identifier: string, token: string): Promise<void> {
  const { error } =
    AUTH_CHANNEL === "phone"
      ? await supabase.auth.verifyOtp({ phone: identifier, token, type: "sms" })
      : await supabase.auth.verifyOtp({ email: identifier, token, type: "email" });
  if (error) throw error;
}

/**
 * The four real awaits `flushOnboarding` performs, in order, as catalog keys.
 *
 * The list lives HERE, next to the awaits it describes, rather than in the
 * ceremony screen: that adjacency is what keeps the staged progress honest. A
 * stage is painted because a network round-trip is genuinely in flight, never
 * because a timer fired (docs/specs/feature-sprint.md slice 5). Add an await,
 * add a label — they cannot drift apart unnoticed.
 */
export const FLUSH_STAGES = [
  "plan_stage_profile", // profiles upsert
  "plan_stage_answers", // questionnaire_responses insert
  "plan_stage_matching", // assignment_rules query
  "plan_stage_assembling", // user_plans insert
] as const satisfies readonly StringKey[];

/**
 * What the flush actually achieved. `no-answers` means there was nothing to do
 * (already flushed, or the user never consented); `no-plan` is the survivable
 * plan.ts null — the write succeeded, the content team simply has no program
 * for this combination yet, and the ceremony owes the user a real screen rather
 * than a silent drop into the tabs.
 */
export type FlushOutcome = "no-answers" | "assigned" | "no-plan";

/**
 * The guest→user bridge: everything answered before sign-in becomes real here.
 *
 * Writes the typed columns on `profiles`, appends a versioned
 * `questionnaire_responses` row (insert-only by RLS, so a re-take is history,
 * not an overwrite), then assigns the plan. Local answers are cleared ONLY on
 * success — a failure leaves them on disk so the caller can retry, which is
 * what the spec's "retain answers locally, retry CTA" state requires
 * (docs/specs/onboarding-questionnaire.md:57).
 *
 * `onStage` receives the index into FLUSH_STAGES of the step now in flight.
 * Deliberately no success chirp in here: the plan-ready ceremony owns that
 * moment now, and firing it twice would double-buzz.
 */
export async function flushOnboarding(
  onStage?: (index: number) => void,
): Promise<FlushOutcome> {
  const saved = await loadProgress();
  if (!saved || !saved.answers.consent) return "no-answers"; // nothing consented to save

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "no-answers";

  const profile = answersToProfile(saved.answers);
  // upsert, not update: handle_new_user() normally creates the row, but an
  // upsert also covers the case where it didn't rather than silently updating
  // zero rows.
  onStage?.(0);
  const { error: pErr } = await supabase.from("profiles").upsert({ id: user.id, ...profile });
  if (pErr) throw pErr;

  onStage?.(1);
  const { error: qErr } = await supabase.from("questionnaire_responses").insert({
    user_id: user.id,
    version: QUESTIONNAIRE_VERSION,
    answers: saved.answers,
  });
  if (qErr) throw qErr;

  // No matching rule is survivable (see plan.ts) — don't fail the flush over it.
  const plan = await assignPlan(saved.answers, (s) => onStage?.(s === "matching" ? 2 : 3));

  // Marker first, then drop the answers: if the app died between these two, a
  // spare marker is harmless, whereas cleared answers with no marker would
  // re-ask all 11 questions.
  await markOnboarded();
  await clearProgress();

  return plan ? "assigned" : "no-plan";
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  /** True until the stored session (if any) has been restored. */
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { setMode } = useI18n();

  useEffect(() => {
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!alive) return;
      setSession(s);
      setLoading(false);
      // The session-tracking queue (slice 6) needs an authenticated user to
      // send anything, and its launch-time flush can run BEFORE the stored
      // session has been restored — on a cold start that never returns to the
      // foreground, nothing else would retry. Flushing the moment a user
      // exists closes that window; the queue is idempotent, so an extra call
      // is free.
      if (s) {
        void flushQueue();
        // The push token is fetched before any account exists (a guest can grant
        // permission after their first workout), so this is the moment it gets
        // an owner. Idempotent — the upsert is keyed on (user_id, device_id) —
        // and a no-op when permission was never granted.
        void registerPushToken();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Once signed in, the profile carries the language to a new device, where
  // local storage knows nothing.
  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return;
    let alive = true;

    void (async () => {
      // Unflushed answers are the NEWER truth — they are about to be written to
      // this very profile. Reading it now would race flushOnboarding and lose:
      // the row still holds the pre-answer default ('english', migration 0010),
      // so a user who just chose हिंदी would be flipped back to English and,
      // because setMode writes through, have it persisted. Skip until flushed.
      const pending = await loadProgress();
      if (!alive || pending) return;

      const { data } = await supabase
        .from("profiles")
        .select("language_mode")
        .eq("id", uid)
        .maybeSingle();
      if (alive && data?.language_mode) setMode(data.language_mode as LanguageMode);
    })();

    return () => {
      alive = false;
    };
  }, [session?.user.id, setMode]);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        // Drop this device's token BEFORE the session goes, while RLS still
        // lets us delete our own row. Otherwise tonight's reminder for the
        // account that just left lands on a phone somebody else is now using —
        // shared handsets are normal in this audience.
        const uid = session?.user.id;
        if (uid) await unregisterPushToken(uid);
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
