/**
 * Settings — a stack route behind the Home header gear (slice 1b).
 *
 * Not a sixth tab: five tabs already, and the Hindi labels are wide at 360dp
 * (docs/decisions.md 2026-07-28). This ships the sections that are real TODAY —
 * Language, Account, About — and later slices bolt their own sections on:
 * Haptics + Sound toggles (slice 2), Notifications (slice 7).
 *
 * Everything here is guest-safe. Language and the About block work signed-out;
 * the Account section is the one place that changes shape with a session.
 */
import React, { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import Constants from "expo-constants";
import {
  Screen, Card, Button, OptionRow, T, B, ChevronLeft, color, space,
} from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { useAuth } from "../../src/lib/auth";
import { supabase } from "../../src/lib/supabase";
import { PRIVACY_POLICY_URL } from "../../src/lib/config";
import type { LanguageMode } from "../../src/types/db";

const LANGUAGES: { value: LanguageMode; k: "lang_hindi" | "lang_english" | "lang_mixed" }[] = [
  { value: "hindi", k: "lang_hindi" },
  { value: "english", k: "lang_english" },
  { value: "mixed", k: "lang_mixed" },
];

export default function Settings() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      {/* own top bar — the app hides native headers everywhere */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.xs }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          onPress={() => router.back()}
          hitSlop={10}
          style={{ padding: space.xs }}
        >
          <ChevronLeft />
        </Pressable>
        <T variant="h1">{t("settings_title")}</T>
      </View>

      <LanguageSection />
      <AccountSection />
      <AboutSection />
    </Screen>
  );
}

/** Section shell — a labelled group. Local to settings; built from tokens only. */
function Section({ titleKey, children }: { titleKey: "settings_language" | "settings_account" | "settings_about"; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: space.sm, marginTop: space.md }}>
      <T variant="eyebrow" tone="gold" style={{ marginLeft: space.xs }}>
        {t(titleKey)}
      </T>
      {children}
    </View>
  );
}

/** Q1's choice, changeable for the first time after onboarding. */
function LanguageSection() {
  const { mode, setMode, t } = useI18n();
  const { session } = useAuth();

  const choose = (m: LanguageMode) => {
    setMode(m); // flips the UI + AsyncStorage immediately (i18n owns that)
    // A signed-in user's language lives on the profile too, so it survives a
    // reinstall — auth.tsx reads it back from there on a fresh device. Best
    // effort: never block the UI, and a guest simply has no row to write.
    if (session) {
      void supabase
        .from("profiles")
        .update({ language_mode: m })
        .eq("id", session.user.id);
    }
  };

  return (
    <Section titleKey="settings_language">
      {/* Same OptionRow the onboarding language step uses, so the selection
          affordance reads identically across the app. */}
      {LANGUAGES.map((l) => (
        <OptionRow
          key={l.value}
          label={t(l.k)}
          selected={mode === l.value}
          onPress={() => choose(l.value)}
        />
      ))}
    </Section>
  );
}

/** The one section that changes with a session. Guest → sign in; user → sign out. */
function AccountSection() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  const identifier = session?.user.email ?? session?.user.phone ?? "";

  return (
    <Section titleKey="settings_account">
      {session ? (
        <Card style={{ gap: space.md }}>
          <View>
            <T variant="caption" tone="muted">
              {t("settings_account")}
            </T>
            {identifier ? <T variant="bodyBold">{identifier}</T> : null}
          </View>

          {confirming ? (
            <View style={{ gap: space.sm }}>
              <B k="sign_out_q" variant="bodyBold" />
              <B k="sign_out_body" variant="caption" tone="muted" />
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button k="cancel" kind="ghost" onPress={() => setConfirming(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  {/* Leaves the user on this screen; the section re-renders to
                      the guest state, which is the confirmation that it worked. */}
                  <Button k="sign_out" kind="ghost" onPress={() => { setConfirming(false); void signOut(); }} />
                </View>
              </View>
            </View>
          ) : (
            <Button k="sign_out" kind="ghost" onPress={() => setConfirming(true)} />
          )}
        </Card>
      ) : (
        <Card style={{ gap: space.md }}>
          <View>
            <T variant="bodyBold">{t("settings_guest")}</T>
            <B k="settings_guest_hint" variant="caption" tone="muted" />
          </View>
          <Button k="sign_in" onPress={() => router.push("/auth")} />
        </Card>
      )}
    </Section>
  );
}

/** Privacy, the wellness disclaimer (compliance), and the build version. */
function AboutSection() {
  const { t } = useI18n();
  const version = Constants.expoConfig?.version ?? "—";

  return (
    <Section titleKey="settings_about">
      <Card style={{ gap: space.md }}>
        {/* Appears only once the policy page is live — same honest pattern as
            the consent screen (src/lib/config.ts). */}
        {PRIVACY_POLICY_URL ? (
          <T variant="bodyBold" tone="saffron" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
            {t("settings_privacy")}
          </T>
        ) : null}

        <B k="wellness_disclaimer" variant="caption" tone="muted" />

        <View style={{ height: 1, backgroundColor: color.line }} />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T variant="caption" tone="muted">
            {t("settings_version")}
          </T>
          <T variant="caption" tone="muted" style={{ fontVariant: ["tabular-nums"] }}>
            {version}
          </T>
        </View>
      </Card>
    </Section>
  );
}
