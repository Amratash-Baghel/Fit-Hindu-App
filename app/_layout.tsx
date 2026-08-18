import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { I18nProvider } from "../src/lib/i18n";
import { AuthProvider, useAuth } from "../src/lib/auth";
import { hydrateFeedbackPrefs } from "../src/lib/settings";
import { preloadFeedback } from "../src/lib/feedback";
import { reconcile, watchForFlush } from "../src/lib/session";
import { flushActivityQueue, watchActivityFlush } from "../src/lib/activityQueue";
import { reconcileSleepRun } from "../src/lib/sleepRun";
import { watchCheckIn } from "../src/lib/points";
import { watchNotificationTaps } from "../src/lib/push";
import { AudioStopPill, BmsSplash, color } from "../src/ui";

// Hold the native splash from the very first module evaluation so there is zero
// flash of white before the animated ceremony paints (slice 3). The animated
// overlay hides it again once its first frame is up.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * The animated splash lives here, inside AuthProvider, so it can gate on the
 * auth session ("first data"). It renders on top of the router and unmounts
 * itself once it has cross-faded to the home screen underneath.
 */
function SplashGate() {
  const { loading } = useAuth();
  const [done, setDone] = useState(false);
  if (done) return null;
  return <BmsSplash ready={!loading} onFinish={() => setDone(true)} />;
}

export default function RootLayout() {
  const router = useRouter();

  // Load the haptics/sound choice and warm the SFX players once, so the first
  // tap is neither silent-by-default-race nor stuttering on player creation.
  useEffect(() => {
    void hydrateFeedbackPrefs();
    preloadFeedback();
  }, []);

  // Deliver anything the last run couldn't, and close out a session the user
  // was killed out of (slice 6). Also retries on every return to the
  // foreground, which is this app's stand-in for a connectivity listener.
  useEffect(() => {
    void reconcile();
    // Recover a sleep run whose write was lost to a background process-kill
    // (slice 5 follow-up): the mirror survives the kill, this logs it once.
    void reconcileSleepRun();
    return watchForFlush();
  }, []);

  // Same idea, for the queue behind meditation/jap/sleep/diet completions
  // (2026-08-17 durability pass) — a separate module, so it gets its own
  // launch flush and its own foreground watcher rather than being folded
  // into the workout session's.
  useEffect(() => {
    void flushActivityQueue();
    return watchActivityFlush();
  }, []);

  // Bank the daily app-open bonus on launch and on every foreground (slice 5).
  // Idempotent per IST day at the database (daily_checkins PK) and a no-op for
  // guests — it earns points, never a streak day.
  useEffect(() => watchCheckIn(), []);

  // A tapped notification opens the screen it is about (slice 7). Mounted here
  // because a cold start launched BY a tap has no listener yet — push.ts also
  // reads the response that was already waiting. The route comes from a closed
  // map keyed on the payload's `kind`, never from the payload itself.
  useEffect(() => watchNotificationTaps((route) => router.push(route)), [router]);

  // Last-resort safety: if the ceremony gate never mounts (e.g. a provider
  // never hydrates), the native splash must still come down so the user is
  // never trapped. The overlay's own 6 s timeout handles the common path.
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 6500);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaProvider>
      {/* AuthProvider sits inside I18nProvider: on sign-in it reads the
          profile's language_mode and pushes it into the i18n layer. */}
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.ink },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding/index" />
            <Stack.Screen name="auth/index" />
            <Stack.Screen name="auth/verify" />
            {/* The ceremony writes the plan; swiping out mid-write would orphan
                a half-finished flush. The route blocks the Android hardware
                back too — see app/plan/ready.tsx. */}
            <Stack.Screen name="plan/ready" options={{ gestureEnabled: false }} />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="progress/index" />
          </Stack>
          {/* Global stop-sound affordance — floats over every screen while the
              shared audio service is playing. */}
          <AudioStopPill />
          <SplashGate />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
