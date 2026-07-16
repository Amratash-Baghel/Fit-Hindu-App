import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "../src/lib/i18n";
import { ensureSession } from "../src/lib/auth";
import { color } from "../src/ui";

export default function RootLayout() {
  // Anonymous session bootstrap — fire-and-forget; screens already tolerate
  // the signed-out window while this resolves.
  useEffect(() => {
    void ensureSession();
  }, []);

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.ink },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding/index" />
        </Stack>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
