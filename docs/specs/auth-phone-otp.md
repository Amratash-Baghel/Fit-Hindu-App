# Spec — Phone + OTP Auth

> Status: CONFIRMED — written + owner-confirmed 2026-08-03 (Sprint 2, Slice 3).
> Source: `docs/sprint2.md` Slice 3. Decisions settled: (1) keep guest-first /
> no hard gate; (2) flip `AUTH_CHANNEL` constant to `"phone"`; (3) no
> `profiles.phone` — use `auth.users.phone`; (4) defer the MSG91 Send-SMS Edge
> Function until DLT is approved.
>
> **This slice is mostly wiring, not greenfield.** A complete, channel-agnostic
> OTP flow already exists on this branch (built during the onboarding work):
> `sendOtp`/`verifyOtp`, the entry + verify screens, the guest→user bridge
> (`flushOnboarding`), session state (`AuthProvider`), and push-token
> registration on sign-in. Slice 3 flips that flow from **email** (the dev
> crutch) to **phone**, closes the small gaps, and scaffolds the prod SMS path.

## Purpose

Give a returning user a real account so their streaks, sessions, points, and
plan persist across devices — using **phone + OTP**, the right primitive for a
Hindi-first Indian audience. Auth stays in **Supabase**, so RLS/JWT are
unchanged; Supabase generates and verifies the code.

## Non-negotiable: stays guest-first (owner decision 2026-07-15)

The app is **guest-first**. Onboarding runs with no account; sign-in is
**offered but skippable** ("अभी नहीं / Not now"). We do **not** hard-gate the app
behind a session — that would break the owner's guest-first decision and brush
against the *never gate core worship* standing rule. The sprint pack's phrase
"gate the app on a session" is read here as **"slot auth into the flow and let a
session light up logging,"** not "block the app." A guest keeps full access;
their answers live in AsyncStorage and flush to a real account the moment they
sign in (the machinery already exists).

> **DECISION 1 (confirm):** keep guest-first / skippable — do **not** hard-gate.
> Recommended: yes, keep it.

## User flow

Unchanged in shape — only the channel changes to phone:

1. **Onboarding** completes → `router.replace("/auth")`.
2. **`/auth` (identifier entry)** — mobile number, `+91` default, E.164. Primary
   CTA "कोड भेजें / Send code" → `supabase.auth.signInWithOtp({ phone })`.
   Ghost CTA "अभी नहीं / Not now" → straight to `/(tabs)` as a guest.
3. **`/auth/verify` (6-digit code)** — `verifyOtp({ phone, token, type: 'sms' })`.
   Resend with a **≥60s cooldown timer**. On success → `router.replace("/plan/ready")`.
4. **`/plan/ready`** — owns the guest→user bridge (`flushOnboarding`) and its
   three outcomes (assigned / no-plan / failure). Unchanged by this slice.
5. Signed in, every existing `logActivity()` / session write starts persisting
   (they already call `supabase.auth.getUser()` — no per-call change needed).

## What this slice actually changes

Small, surgical:

1. **`AUTH_CHANNEL: "email" → "phone"`** (`src/lib/auth.tsx:33`). Everything
   downstream (screens, verify type `'sms'`, labels, keyboard) already branches
   on it. Email was only ever the "until SMS is live" crutch; test OTPs now make
   phone verifiable in dev.
   > **DECISION 2 (confirm):** flip the constant to `"phone"` (simple), vs. make
   > it an `EXPO_PUBLIC_AUTH_CHANNEL` env switch. Recommended: **flip the
   > constant** — one channel in v1, less config surface; revisit if we ever need
   > email fallback.
2. **E.164 / `+91` normalization** on entry (`app/auth/index.tsx`). A user types
   a 10-digit mobile; we submit `+91XXXXXXXXXX`. Keep the loose typo-check
   (provider is the real validator), but tighten it for Indian mobiles (10
   digits after the country code) and show a fixed, non-editable `+91` affordance
   so the number in the field is unambiguous.
3. **Resend cooldown ≥60s** (`app/auth/verify.tsx`). Today "Resend" is always
   enabled; add a countdown (disabled + "पुनः भेजें (60s)"-style label) that
   starts when the screen mounts and after each resend. Matches Supabase's SMS
   OTP expiry (60s, per your dashboard) and stops rate-limit hammering.
4. **Session pickup verified** — confirm a completed activity writes a real
   `activity_log` row after sign-in and the home tick/streak reflects it (the
   acceptance test). No code change expected; `activity.ts` already reads the
   session.

## Profiles + phone

`profiles` has **no phone column**; `auth.users.phone` already holds the verified
number and is reachable via the session (`user.phone`). So the profile screen
(Slice 8) reads phone from the session — **no migration in this slice.**

> **DECISION 3 (confirm):** do **not** add `profiles.phone` (avoid a migration;
> rely on `auth.users.phone`). Recommended: yes, no migration.

## Prod SMS delivery — MSG91 via Send SMS Hook (scaffold, deferred deploy)

Supabase's provider dropdown has **no custom/MSG91 option** by design. MSG91
plugs in through **Authentication → Hooks → Send SMS Hook**, an HTTPS Edge
Function that Supabase calls instead of the built-in provider. The function
calls MSG91's OTP API with the **DLT-approved template**; the MSG91 auth key +
template ID live as **Edge Function secrets**, never in the client.

**MSG91 + DLT registration is not started (owner, 2026-08-03), and DLT approval
takes days.** The template ID and auth-key shape aren't known yet, so building
the function fully now is speculative.

> **DECISION 4 (confirm):** **defer** the `send-sms` Edge Function to a follow-up
> once DLT is approved (dev + demo run entirely on Supabase **test numbers**,
> which bypass the hook). Recommended: **defer** — build the client flow now,
> scaffold the function with a clear TODO seam + README when the DLT template
> lands. Alternative: scaffold a non-functional `supabase/functions/send-sms/`
> now so the wiring is reviewed early.

## States (both screens)

- **Entry — idle / invalid (typo) / sending / send-failed** (rate limit or
  network). All copy via i18n; skip is always available.
- **Verify — idle / verifying / wrong-code / resend-cooldown / resent-ok /
  resend-failed**. Landing without a pending identifier (web reload, deep link)
  redirects to `/auth` (already handled).
- No "empty" state — this is a two-field flow, not a content surface.

## Dev verification (this slice's acceptance)

Using the Supabase **test pair** `919109386355 = 123456` (saved 2026-08-03; note
its "Test OTPs Valid Until" date):

1. Complete onboarding → land on `/auth` (now phone).
2. Enter `9109386355` → submit → advances to `/auth/verify` (submitted as
   `+919109386355`).
3. Enter `123456` → verifies → `/plan/ready` → tabs, **signed in**.
4. Resend shows a 60s countdown, disabled until it elapses.
5. Complete an activity (e.g. meditation) → a real `activity_log` row exists and
   the home streak/tick reflects it.

Web preview covers the flow and states (the test OTP works there too). Real SMS,
the MSG91 hook, and device autofill of the code are **not** verifiable here.

## Rules honored

- Supabase-only auth → RLS/JWT unchanged. No secrets in the client (MSG91 key is
  an Edge Function secret). All strings via i18n (`auth_*` keys already exist;
  add only the resend-cooldown label). UI from `src/ui`. No health claims. No new
  program hardcoding — auth is program-agnostic.

## Not doing (v1)

- No hard session gate (guest-first stays). No social/Google/Apple sign-in. No
  account settings beyond sign-out (exists). No phone-change / re-verify flow. No
  profiles.phone column. No real SMS until DLT clears.
