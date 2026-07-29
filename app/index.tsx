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
import { hasOnboarded } from "../src/lib/onboarding";
import { ceremony } from "../src/ui";

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

  // Hold the frame rather than flashing onboarding at a signed-in user. This is
  // the C4 "dead frame on cold start": the animated splash overlay (rendered by
  // the root layout, on top) covers this window, but we paint the ceremony field
  // rather than a bare `null` so there is never a black/white flash if the
  // overlay has already faded but the redirect target hasn't mounted yet.
  if (loading || onboarded === null)
    return <View style={{ flex: 1, backgroundColor: ceremony.field }} />;

  return <Redirect href={session || onboarded ? "/(tabs)" : "/onboarding"} />;
}
