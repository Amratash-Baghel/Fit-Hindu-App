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
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import Constants from "expo-constants";
import {
  Screen, Card, Button, OptionRow, Toggle, T, B, ChevronLeft, color, radius, space, tapTarget,
} from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { useAuth } from "../../src/lib/auth";
import { supabase } from "../../src/lib/supabase";
import { feedback } from "../../src/lib/feedback";
import { useFeedbackPrefs, setFeedbackPref } from "../../src/lib/settings";
import {
  useNotificationPrefs, toDbTime, toDisplayTime, type PrefsPatch,
} from "../../src/lib/notificationPrefs";
import {
  getPushPermission, pushUnavailableReason, requestPushPermission, type PushPermission,
} from "../../src/lib/push";
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
      <FeedbackSection />
      <NotificationSection />
      <AccountSection />
      <AboutSection />
    </Screen>
  );
}

/** Section shell — a labelled group. Local to settings; built from tokens only. */
function Section({ titleKey, children }: { titleKey: StringKey; children: React.ReactNode }) {
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

/** Haptics + sound, two independent toggles, both default on (slice 2). */
function FeedbackSection() {
  const { t } = useI18n();
  const prefs = useFeedbackPrefs();

  return (
    <Section titleKey="settings_feedback">
      <Card style={{ gap: space.md }}>
        <ToggleRow
          label={t("settings_haptics")}
          value={prefs.haptics}
          onChange={(v) => {
            void setFeedbackPref("haptics", v);
            if (v) feedback.tap(); // let it be felt the moment it's turned on
          }}
        />
        <View style={{ height: 1, backgroundColor: color.line }} />
        <ToggleRow
          label={t("settings_sound")}
          value={prefs.sound}
          onChange={(v) => {
            void setFeedbackPref("sound", v);
            if (v) feedback.tap(); // let it be heard the moment it's turned on
          }}
        />
      </Card>
    </Section>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <T variant="bodyBold">{label}</T>
      <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

/**
 * Notifications (slice 7) — master switch, per-type switches, reminder time.
 *
 * Persisted SERVER-SIDE, unlike the two toggles above. The fan-out runs in
 * Postgres with the phone in a pocket, so a preference it cannot read is a
 * preference it cannot honour; it also has to survive a reinstall, or "stop
 * reminding me" is undone by the next app update.
 *
 * Four shapes, because there are four genuinely different situations and
 * collapsing them produces dead controls:
 *   unavailable  — web or Expo Go; say so, offer nothing
 *   guest        — no row to write; offer sign-in
 *   no OS permit — toggles here would be a lie; offer the ask, or the OS screen
 *   ready        — the real controls
 */
function NotificationSection() {
  const { t } = useI18n();
  const { session } = useAuth();
  const router = useRouter();
  const { prefs, failed, update } = useNotificationPrefs();
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const unavailable = pushUnavailableReason();

  // Re-read on every return to the foreground: "Open phone settings" sends the
  // user out of the app to change exactly this, and coming back to a stale
  // "notifications are off" card would make the trip look like it failed.
  const refresh = useCallback(() => {
    void getPushPermission().then(setPermission);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  let body: React.ReactNode;

  if (unavailable) {
    body = (
      <Card>
        <B k="notif_unavailable" variant="caption" tone="muted" />
      </Card>
    );
  } else if (!session) {
    body = (
      <Card style={{ gap: space.md }}>
        <B k="notif_guest_hint" variant="caption" tone="muted" />
        <Button k="sign_in" onPress={() => router.push("/auth")} />
      </Card>
    );
  } else if (permission !== "granted") {
    body = (
      <Card style={{ gap: space.md }}>
        <B k="notif_blocked" variant="caption" tone="muted" />
        {permission === "undetermined" ? (
          // We can still show the system prompt. requestPushPermission also
          // registers the token, so a yes here is immediately usable.
          <Button
            k="notif_enable_cta"
            onPress={() => void requestPushPermission().then(refresh)}
          />
        ) : (
          // The OS has decided and will not ask again. The only honest move is
          // to hand them to the screen that can change it.
          <Button k="notif_open_settings" kind="ghost" onPress={() => void Linking.openSettings()} />
        )}
      </Card>
    );
  } else if (prefs) {
    body = (
      <Card style={{ gap: space.md }}>
        <ToggleRow
          label={t("notif_master")}
          value={prefs.enabled}
          onChange={(v) => update({ enabled: v })}
        />

        {/* The per-type rows hide rather than grey out when the master is off:
            the server checks `enabled` first, so leaving them visible would
            show switches that change nothing tonight. */}
        {prefs.enabled ? (
          <>
            <Divider />
            <ToggleRow
              label={t("notif_daily")}
              value={prefs.daily_reminder}
              onChange={(v) => update({ daily_reminder: v })}
            />
            {prefs.daily_reminder ? (
              <TimeStepper value={prefs.reminder_time} onCommit={update} />
            ) : null}
            <Divider />
            <ToggleRow
              label={t("notif_streak")}
              value={prefs.streak_at_risk}
              onChange={(v) => update({ streak_at_risk: v })}
            />
            <Divider />
            <ToggleRow
              label={t("notif_plan")}
              value={prefs.plan_ready}
              onChange={(v) => update({ plan_ready: v })}
            />
          </>
        ) : null}

        {failed ? <B k="notif_save_failed" variant="caption" tone="saffron" /> : null}
      </Card>
    );
  } else {
    // Signed in, permission granted, first read still in flight. Render the
    // shell rather than nothing, so the section does not appear then jump.
    body = (
      <Card>
        <B k="loading" variant="caption" tone="muted" />
      </Card>
    );
  }

  return <Section titleKey="settings_notifications">{body}</Section>;
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: color.line }} />;
}

/**
 * Reminder time in 30-minute steps.
 *
 * Thirty minutes, not one, and not a wheel picker. There is no date-time picker
 * in this project and adding `@react-native-community/datetimepicker` for one
 * field needs owner approval — but the resolution is not a compromise either:
 * the fan-out cron runs every half hour (migration 0014), so half an hour is
 * the finest promise the server can actually keep. Offering 19:07 would be a
 * lie told by the UI.
 *
 * Writes are debounced. The value is optimistic locally so the number moves the
 * instant it is tapped, but eight taps on a 2G connection must not be eight
 * round-trips — chatty writes on a bad network are the risk this whole sprint
 * keeps designing against.
 */
function TimeStepper({ value, onCommit }: { value: string; onCommit: (p: PrefsPatch) => void }) {
  const { t } = useI18n();
  // Local while the user is stepping; the server value takes over once the
  // pending write lands and `value` catches up.
  const [pending, setPending] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = pending ?? toDisplayTime(value);

  const commit = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        setPending(null); // hand control back to the server value
        onCommit({ reminder_time: toDbTime(next) });
      }, 700);
    },
    [onCommit],
  );

  // Leaving the screen mid-step must still save. Without this, tapping + and
  // immediately pressing back silently discards the change.
  //
  // The latest values reach the unmount cleanup through refs synced in an
  // effect — assigning them during render is a mutation during render, and the
  // cleanup below must not re-subscribe on every keystroke either.
  const pendingRef = useRef<string | null>(null);
  const commitRef = useRef(onCommit);
  useEffect(() => {
    pendingRef.current = pending;
    commitRef.current = onCommit;
  });
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (pendingRef.current) commitRef.current({ reminder_time: toDbTime(pendingRef.current) });
      }
    },
    [],
  );

  const step = (deltaMinutes: number) => {
    const [h, m] = shown.split(":").map(Number);
    // +1440 before the modulo so stepping back from 00:00 wraps to 23:30
    // rather than producing a negative.
    const total = (h * 60 + m + deltaMinutes + 1440) % 1440;
    const next = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    feedback.tap();
    setPending(next);
    commit(next);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1 }}>
        <T variant="body">{t("notif_time")}</T>
        <T variant="caption" tone="muted">
          {t("notif_time_hint")}
        </T>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <StepButton label="−" onPress={() => step(-30)} accessibilityLabel={`${t("notif_time")} −30`} />
        <T
          variant="bodyBold"
          tone="gold"
          style={{ minWidth: 64, textAlign: "center", fontVariant: ["tabular-nums"] }}
        >
          {shown}
        </T>
        <StepButton label="+" onPress={() => step(30)} accessibilityLabel={`${t("notif_time")} +30`} />
      </View>
    </View>
  );
}

function StepButton({
  label, onPress, accessibilityLabel,
}: { label: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        width: tapTarget,
        height: tapTarget,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: color.line,
        backgroundColor: color.surface2,
      }}
    >
      <T variant="h2" tone="gold">
        {label}
      </T>
    </Pressable>
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
                  <Button k="sign_out" kind="ghost" onPress={() => { feedback.error(); setConfirming(false); void signOut(); }} />
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
