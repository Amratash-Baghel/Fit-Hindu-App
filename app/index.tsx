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
import { Redirect } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { hasOnboarded } from "../src/lib/onboarding";

export default function Index() {
  const { session, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void hasOnboarded().then((v) => alive && setOnboarded(v));
    return () => {
      alive = false;
    };
  }, []);

  // Hold the frame rather than flashing onboarding at a signed-in user.
  if (loading || onboarded === null) return null;

  return <Redirect href={session || onboarded ? "/(tabs)" : "/onboarding"} />;
}
