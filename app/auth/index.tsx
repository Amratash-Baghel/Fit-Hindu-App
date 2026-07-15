/**
 * Sign-in step 1 — identifier entry.
 *
 * Offered AFTER the plan-ready moment and skippable: the user has already seen
 * what they get, and nothing here is a wall (owner decision 2026-07-15).
 * Channel comes from AUTH_CHANNEL, so this screen is the same for email or SMS.
 */
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Button, FooterAction, B, T, space, color, radius, tapTarget } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { AUTH_CHANNEL, sendOtp } from "../../src/lib/auth";

const isPhone = AUTH_CHANNEL === "phone";

/** Deliberately loose: the provider is the real validator, this only catches typos. */
function looksValid(v: string): boolean {
  const s = v.trim();
  return isPhone ? /^\+?[0-9]{10,15}$/.test(s) : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

export default function AuthStart() {
  const router = useRouter();
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState<"invalid" | "send" | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const id = value.trim();
    if (!looksValid(id)) return setError("invalid");
    setError(null);
    setSending(true);
    try {
      await sendOtp(id);
      // No params: sendOtp holds the identifier, so it never reaches the URL.
      router.push("/auth/verify");
    } catch {
      setError("send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, gap: space.lg, paddingTop: space.xxl }}>
        <B k="auth_title" variant="h1" center />
        <B k="auth_why" variant="body" tone="soft" center />

        <View style={{ gap: space.sm, paddingTop: space.lg }}>
          <B k={isPhone ? "auth_phone_label" : "auth_email_label"} variant="caption" tone="muted" />
          <TextInput
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setError(null);
            }}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={isPhone ? "phone-pad" : "email-address"}
            textContentType={isPhone ? "telephoneNumber" : "emailAddress"}
            placeholder={isPhone ? "+91" : "you@example.com"}
            placeholderTextColor={color.muted}
            onSubmitEditing={() => void submit()}
            style={{
              minHeight: tapTarget,
              borderWidth: 1,
              borderColor: error ? color.danger : color.line,
              borderRadius: radius.button,
              backgroundColor: color.surface,
              paddingHorizontal: space.lg,
              color: color.cream,
              fontSize: 18,
            }}
          />
          {error ? (
            <T variant="caption" tone="danger">
              {t(error === "invalid" ? "auth_invalid_identifier" : "auth_send_failed")}
            </T>
          ) : null}
        </View>
      </View>

      <FooterAction>
        <Button
          k={sending ? "loading" : "auth_send_code"}
          disabled={sending}
          onPress={() => void submit()}
        />
        {/* Guest-first: never a wall. Their answers stay on the device. */}
        <Button k="auth_skip" kind="ghost" onPress={() => router.replace("/(tabs)")} />
      </FooterAction>
    </Screen>
  );
}
