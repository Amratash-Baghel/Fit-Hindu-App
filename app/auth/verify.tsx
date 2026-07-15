/**
 * Sign-in step 2 — the 6-digit code, and the moment everything becomes real.
 *
 * On success this is where the guest→user bridge runs: the answers held in
 * AsyncStorage become profile columns, a questionnaire_responses row, and an
 * assigned plan. If that write fails the answers stay on disk and the user gets
 * a retry — the spec's "retain answers locally, retry CTA" state
 * (docs/specs/onboarding-questionnaire.md:57).
 */
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Screen, Button, FooterAction, B, T, space, color, radius, tapTarget } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { flushOnboarding, getPendingIdentifier, sendOtp, verifyOtp } from "../../src/lib/auth";

export default function AuthVerify() {
  const router = useRouter();
  const { t } = useI18n();
  // Held in module state, not a route param — it must not reach the URL.
  const id = getPendingIdentifier();
  const [code, setCode] = useState("");
  const [error, setError] = useState<"code" | "flush" | "resend" | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  const submit = async () => {
    if (code.trim().length < 6 || !id) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(id, code.trim());
    } catch {
      setError("code");
      setBusy(false);
      return;
    }
    // Signed in. Now save what they answered as a guest.
    try {
      await flushOnboarding();
      router.replace("/(tabs)");
    } catch {
      // Session is live but the write failed — answers are still on disk, so
      // Verify becomes Retry rather than losing 10 questions of work.
      setError("flush");
      setBusy(false);
    }
  };

  // Landing here without having asked for a code (a web reload, a deep link):
  // module state is empty, so there is nothing to verify against — send them
  // back to enter their identifier rather than render a dead form.
  if (!id) return <Redirect href="/auth" />;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, gap: space.lg, paddingTop: space.xxl }}>
        <B k="auth_code_title" variant="h1" center />
        <B k="auth_code_sent" variant="body" tone="soft" center />
        <T variant="caption" tone="muted" style={{ textAlign: "center" }}>
          {id}
        </T>

        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v.replace(/[^0-9]/g, ""));
            setError(null);
          }}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          onSubmitEditing={() => void submit()}
          style={{
            minHeight: tapTarget + space.sm,
            borderWidth: 1,
            borderColor: error === "code" ? color.danger : color.line,
            borderRadius: radius.button,
            backgroundColor: color.surface,
            color: color.cream,
            fontSize: 30,
            letterSpacing: 10,
            textAlign: "center",
          }}
        />
        {error ? (
          <T variant="caption" tone="danger" style={{ textAlign: "center" }}>
            {t(
              error === "code"
                ? "auth_invalid_code"
                : error === "resend"
                  ? "auth_send_failed"
                  : "auth_flush_failed",
            )}
          </T>
        ) : null}
        {resent && !error ? (
          <T variant="caption" tone="ok" style={{ textAlign: "center" }}>
            {t("auth_resent")}
          </T>
        ) : null}
      </View>

      <FooterAction>
        <Button
          k={busy ? "onboarding_saving" : error === "flush" ? "retry" : "auth_verify"}
          disabled={busy || code.length < 6}
          onPress={() => void submit()}
        />
        {/* Rate limits are common here (Supabase's built-in mailer, and SMS
            providers more so) — a silent failure would leave the user waiting
            for a code that was never sent. */}
        <Button
          k="auth_resend"
          kind="ghost"
          disabled={busy || !id}
          onPress={() => {
            if (!id) return;
            setError(null);
            setResent(false);
            void sendOtp(id)
              .then(() => setResent(true))
              .catch(() => setError("resend"));
          }}
        />
      </FooterAction>
    </Screen>
  );
}
