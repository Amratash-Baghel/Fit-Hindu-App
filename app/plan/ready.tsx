/**
 * Plan-ready ceremony — the moment a guest's answers become their plan.
 * Spec: docs/specs/feature-sprint.md slice 5.
 *
 * This screen OWNS `flushOnboarding`. It used to run invisibly inside the OTP
 * screen (`auth/verify.tsx`), which meant the single most important write in the
 * app — profile, questionnaire, plan assignment — happened behind a disabled
 * button, and the one interesting outcome (no rule matched) was silently
 * indistinguishable from success.
 *
 * The stages are driven by the real awaits inside `flushOnboarding`, not by
 * timers: see FLUSH_STAGES in src/lib/auth.tsx.
 *
 * Three outcomes, all handled, none of them a dead screen:
 *   assigned  → the plan exists; celebrate and go in
 *   no-plan   → the write worked, no rule matched; say so honestly and go in
 *   throw     → answers are still on disk (auth.tsx keeps them for exactly
 *               this); offer retry, and a way in regardless
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { useRouter } from "expo-router";
import { Button, CeremonyLoader, type CeremonyStatus } from "../../src/ui";
import { FLUSH_STAGES, flushOnboarding } from "../../src/lib/auth";
import { markOnboarded } from "../../src/lib/onboarding";
import { feedback } from "../../src/lib/feedback";

/** Copy per outcome. Every status has a headline, a body and a way onward. */
const COPY = {
  working: { title: "plan_working_title", bodyText: "plan_working_body" },
  success: { title: "ready_title", bodyText: "ready_body" },
  empty: { title: "plan_none_title", bodyText: "plan_none_body" },
  error: { title: "plan_error_title", bodyText: "auth_flush_failed" },
} as const;

export default function PlanReady() {
  const router = useRouter();
  const [stageIndex, setStageIndex] = useState(0);
  const [status, setStatus] = useState<CeremonyStatus>("working");
  const started = useRef(false);
  const alive = useRef(true);
  /** True while a flush is in flight — the reentrancy gate for Retry. */
  const inFlight = useRef(false);

  const enter = useCallback(() => router.replace("/(tabs)"), [router]);

  /**
   * Leaving a failed write behind, on purpose.
   *
   * Marking onboarded is what makes that choice stick: `isFlushPending()` goes
   * false, so the cold-start resume in app/index.tsx stops steering them back
   * here on every launch. The answers stay on disk, so the next sign-in still
   * retries the write — they are just no longer held at the door by it.
   */
  const leaveAfterFailure = useCallback(async () => {
    await markOnboarded();
    enter();
  }, [enter]);

  const run = useCallback(async () => {
    if (inFlight.current) return; // a double-tapped Retry must not write twice
    inFlight.current = true;
    setStatus("working");
    setStageIndex(0);
    try {
      const outcome = await flushOnboarding((i) => {
        if (alive.current) setStageIndex(i);
      });
      if (!alive.current) return;
      // Nothing to flush: they arrived here already saved (a re-entry, or a
      // sign-in with no pending answers). Don't stage a ceremony over no work.
      if (outcome === "no-answers") return enter();
      setStatus(outcome === "assigned" ? "success" : "empty");
      // The reward chirp fires HERE, not in flushOnboarding — this is the
      // moment the user is actually looking at (slice 2's feedback service).
      feedback.complete();
    } catch {
      if (!alive.current) return;
      setStatus("error");
      feedback.error();
    } finally {
      inFlight.current = false;
    }
  }, [enter]);

  // Run once on mount. StrictMode double-invokes effects in development, and
  // this effect performs writes, so the guard is load-bearing rather than tidy.
  useEffect(() => {
    alive.current = true;
    if (!started.current) {
      started.current = true;
      void run();
    }
    return () => {
      alive.current = false;
    };
  }, [run]);

  // Back is blocked for the whole route, not just while writing. During the
  // write it would orphan a half-finished flush; after it, "back" means the OTP
  // screen the user has already cleared. Every state below offers an explicit
  // way onward, so nobody is trapped — they just cannot go backwards.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const copy = COPY[status];

  return (
    <CeremonyLoader
      stages={FLUSH_STAGES}
      stageIndex={stageIndex}
      status={status}
      titleKey={copy.title}
      bodyKey={copy.bodyText}
    >
      {status === "success" ? <Button k="ready_cta" onPress={enter} /> : null}
      {status === "empty" ? <Button k="plan_enter" onPress={enter} /> : null}
      {status === "error" ? (
        <>
          <Button k="retry" onPress={() => void run()} />
          {/* A failed write must never be a wall in front of the app. */}
          <Button k="plan_enter" kind="ghost" onPress={() => void leaveAfterFailure()} />
        </>
      ) : null}
    </CeremonyLoader>
  );
}
