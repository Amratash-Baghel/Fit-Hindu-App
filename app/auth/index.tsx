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

/** India dials +91; the field holds only the 10-digit local number. */
const DIAL_CODE = "+91";

/**
 * For phone, the field carries only the 10 local digits. A paste/autofill of the
 * full E.164 form (`+919109386355` → 12 digits beginning `91`) has its country
 * code dropped; anything else is capped to the first 10. This runs on every
 * `onChangeText`, so the field NEVER holds more than 10 — which is why the input
 * carries no `maxLength` (a native `maxLength` truncates a paste to its first 10
 * RAW chars *before* this runs, turning `919109386355` into the wrong-but-valid
 * `9191093863`). For email we pass the raw text through.
 */
function normalizeLocal(v: string): string {
  const digits = v.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return local.slice(0, 10);
}

/**
 * Deliberately loose: the provider is the real validator, this only catches
 * typos. Indian mobiles are 10 digits starting 6–9.
 */
function looksValid(v: string): boolean {
  const s = v.trim();
  return isPhone ? /^[6-9][0-9]{9}$/.test(normalizeLocal(s)) : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

/** What we hand Supabase: E.164 (`+91…`) for phone, the trimmed email otherwise. */
function toIdentifier(v: string): string {
  return isPhone ? `${DIAL_CODE}${normalizeLocal(v)}` : v.trim();
}

export default function AuthStart() {
  const router = useRouter();
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState<"invalid" | "send" | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!looksValid(value)) return setError("invalid");
    setError(null);
    setSending(true);
    try {
      // sendOtp holds the identifier in module state, so it never reaches the URL.
      await sendOtp(toIdentifier(value));
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
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {isPhone ? (
              // Fixed, non-editable country code so the number in the field is
              // unambiguous — the user types only their 10 local digits.
              <View
                style={{
                  minHeight: tapTarget,
                  justifyContent: "center",
                  paddingHorizontal: space.lg,
                  borderWidth: 1,
                  borderColor: color.line,
                  borderRadius: radius.button,
                  backgroundColor: color.surface2,
                }}
              >
                <T variant="body" tone="cream" style={{ fontSize: 18 }}>
                  {DIAL_CODE}
                </T>
              </View>
            ) : null}
            <TextInput
              value={value}
              onChangeText={(v) => {
                // For phone, hold only the normalized local digits so the field
                // and validation never disagree; email passes through.
                setValue(isPhone ? normalizeLocal(v) : v);
                setError(null);
              }}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={isPhone ? "phone-pad" : "email-address"}
              textContentType={isPhone ? "telephoneNumber" : "emailAddress"}
              placeholder={isPhone ? "9109386355" : "you@example.com"}
              placeholderTextColor={color.muted}
              onSubmitEditing={() => void submit()}
              style={{
                flex: 1,
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
          </View>
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
