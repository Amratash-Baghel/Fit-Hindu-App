import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "../src/lib/i18n";
import { color } from "../src/ui";

export default function RootLayout() {
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
