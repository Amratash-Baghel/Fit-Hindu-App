import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "../src/lib/i18n";
import { AuthProvider } from "../src/lib/auth";
import { hydrateFeedbackPrefs } from "../src/lib/settings";
import { preloadFeedback } from "../src/lib/feedback";
import { color } from "../src/ui";

export default function RootLayout() {
  // Load the haptics/sound choice and warm the SFX players once, so the first
  // tap is neither silent-by-default-race nor stuttering on player creation.
  useEffect(() => {
    void hydrateFeedbackPrefs();
    preloadFeedback();
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
            <Stack.Screen name="settings/index" />
          </Stack>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
