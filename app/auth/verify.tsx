/**
 * Sign-in step 2 — the 6-digit code.
 *
 * On success it hands straight off to the plan-ready ceremony
 * (`app/plan/ready.tsx`), which owns the guest→user bridge and every outcome
 * that write can have. This screen used to run the bridge itself, invisibly,
 * behind a disabled button; slice 5 moved it somewhere the user can see it.
 */
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Screen, Button, FooterAction, B, T, space, color, radius, tapTarget } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";
import { getPendingIdentifier, sendOtp, verifyOtp } from "../../src/lib/auth";

export default function AuthVerify() {
  const router = useRouter();
  const { t } = useI18n();
  // Held in module state, not a route param — it must not reach the URL.
  const id = getPendingIdentifier();
  const [code, setCode] = useState("");
  const [error, setError] = useState<"code" | "resend" | null>(null);
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
    // Signed in. The guest→user write, and every outcome it can have, now
    // belongs to the plan-ready ceremony (slice 5) — this screen's job ended at
    // the code. `replace` so back can never return to a spent OTP form.
    router.replace("/plan/ready");
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
            {t(error === "code" ? "auth_invalid_code" : "auth_send_failed")}
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
          k={busy ? "loading" : "auth_verify"}
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
