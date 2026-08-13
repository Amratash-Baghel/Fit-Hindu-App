/**
 * Cold start — decides where the user lands.
 *
 * This is what makes onboarding reachable: before it existed, `(tabs)` was the
 * de facto entry route and the questionnaire was dead code no user ever saw.
 *
 *   finished the questionnaire (or signed in) → tabs
 *   otherwise                                 → onboarding (resumes mid-flow)
 *
 * A signed-in user never re-onboards even with empty local storage (new device,
 * reinstall): their answers are on the profile.
 */
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { hasOnboarded, isFlushPending } from "../src/lib/onboarding";
import { color } from "../src/ui";

export default function Index() {
  const { session, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  /** Consented answers on disk that have never been flushed. */
  const [pending, setPending] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([hasOnboarded(), isFlushPending()]).then(([v, p]) => {
      if (!alive) return;
      setOnboarded(v);
      setPending(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Hold the frame rather than flashing onboarding at a signed-in user. This is
  // the C4 "dead frame on cold start": the animated splash overlay (rendered by
  // the root layout, on top) covers this window, but we paint the splash's ink
  // field rather than a bare `null` so there is never a black/white flash if the
  // overlay has already faded but the redirect target hasn't mounted yet.
  if (loading || onboarded === null || pending === null)
    return <View style={{ flex: 1, backgroundColor: color.ink }} />;

  // Signed in with answers that were never flushed: the ceremony was cut short
  // — a kill mid-write, or a failure the user never retried. `hasOnboarded()`
  // counts those pending answers as done, so without this they would land in
  // the tabs and the answers would sit there forever, with no plan and no route
  // back to one. Resume the ceremony; it ends in the tabs either way.
  //
  // `isFlushPending` (not the raw answers) is what makes this safe to repeat:
  // it is false once the flush has completed, so a successful write is never
  // replayed, and false once the user has walked away from a failing one.
  if (session && pending) return <Redirect href="/plan/ready" />;

  return <Redirect href={session || onboarded ? "/(tabs)" : "/onboarding"} />;
}
