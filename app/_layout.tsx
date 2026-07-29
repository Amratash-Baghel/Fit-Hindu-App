import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { I18nProvider } from "../src/lib/i18n";
import { AuthProvider, useAuth } from "../src/lib/auth";
import { hydrateFeedbackPrefs } from "../src/lib/settings";
import { preloadFeedback } from "../src/lib/feedback";
import { CeremonySplash, color } from "../src/ui";

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
  return <CeremonySplash ready={!loading} onFinish={() => setDone(true)} />;
}

export default function RootLayout() {
  // Load the haptics/sound choice and warm the SFX players once, so the first
  // tap is neither silent-by-default-race nor stuttering on player creation.
  useEffect(() => {
    void hydrateFeedbackPrefs();
    preloadFeedback();
  }, []);

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
          </Stack>
          <SplashGate />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
