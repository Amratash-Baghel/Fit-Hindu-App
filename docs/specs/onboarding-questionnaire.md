# Spec — Onboarding Questionnaire

> Status: CONFIRMED by owner direction 2026-07-12. Keystone feature — the plan
> engine and all personalisation hang off this.

## Purpose

Collect the minimum needed to (a) set the app's language mode, (b) assign a
rule-based plan, (c) seed personalisation/data. End on a "your plan is ready"
moment that feels like a gift, not a form.

## User flow (v2 — Leap/F&B-style question set, 2026-07-15)

One question per screen, big tap targets, progress dots, back allowed.
Modeled on the reference apps' onboarding (goal → focus → level → frequency)
while keeping our standing rules: language is ALWAYS first, deity is
optional, DPDP consent is explicit.

1. **Language (ALWAYS FIRST, before anything else renders):**
   - **हिंदी** — Hindi-only UI (no English captions)
   - **English** — English-only UI
   - **Mixed / मिक्स** — Hindi lead + small English caption
   Applies instantly; changeable later in Profile. (Built ✓)
2. **Goal** — weight gain / build strength / weight loss / healthy routine.
3. **Body focus (multi-select, skippable)** — full body / chest / back /
   shoulders / arms / core / legs. Feeds plan choice + custom-mode default.
4. **Level** — beginner / intermediate / advanced.
5. **Days per week** — 3 / 5 / 7 (drives program_days density; Leap 7×4
   pattern maps to 7).
6. **Age band** — 18–25 / 26–35 / 36–50 / 50+ (18+ gate; under-18 blocked).
7. **Diet type** — veg / sattvic / eggs ok / non-veg.
8. **Workout mode preference** — home (no equipment) / gym / decide later.
9. **Chosen deity (optional, skippable)** — from the deities table; frames
   the devotional layer; never required.
10. **Consent screen (DPDP)** — itemised plain-language notice (in chosen
    language), checkbox **unticked by default**, link to privacy policy.
    Health-related questions are optional and skippable by design.
11. **Plan-ready celebration** — brief animated moment ("आपका plan तैयार
    है"), then land on Daily Home.

Schema note: answers still land in `questionnaire_responses.answers` jsonb +
typed profile columns; body_focus (body_area[]) and days_per_week (smallint)
are added to profiles when the onboarding build cycle starts —
`assignment_rules.conditions` jsonb already accommodates the new keys with
zero schema change.

> Note (2026-07-16): the **diet custom-plan** feature has its own separate,
> AI-fed questionnaire (docs/specs/diet-custom-plan.md, owner override). THIS
> onboarding questionnaire remains rule-based and unchanged by that override.

## Rules

- Rule-based mapping only: answers → team-authored plan template (no AI).
- Mapping lives in admin panel (program → questionnaire mapping), not code.
- All strings through i18n with the 3 display modes; no hardcoded text.
- Wellness disclaimer shown and accepted before plan generation.

## States

- Loading: skeleton question card.
- Error (network on submit): retain answers locally, retry CTA.
- Abandon mid-way: resume at last answered question on next open.

## Not doing (v1)

- No account requirement before questionnaire (auth can come after the
  celebration; decide during build).
- No free-text inputs. No health-condition diagnosis questions.
- No AI-generated plans.

## Data

`profiles` (language_mode, goal, age_band, diet_type, workout_mode, deity,
consent_at) + `questionnaire_responses` (versioned, for re-take later).
Program mapping tables per content-model spec.
