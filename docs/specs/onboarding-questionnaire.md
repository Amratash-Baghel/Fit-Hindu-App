# Spec — Onboarding Questionnaire

> Status: CONFIRMED by owner direction 2026-07-12. Keystone feature — the plan
> engine and all personalisation hang off this.

## Purpose

Collect the minimum needed to (a) set the app's language mode, (b) assign a
rule-based plan, (c) seed personalisation/data. End on a "your plan is ready"
moment that feels like a gift, not a form.

## User flow

One question per screen, big tap targets, progress dots, back allowed.

1. **Language (ALWAYS FIRST, before anything else renders):**
   - **हिंदी** — Hindi-only UI (no English captions)
   - **English** — English-only UI
   - **Mixed / मिक्स** — Hindi lead + small English caption (default visual)
   The choice applies instantly to the rest of onboarding, and everywhere
   after. Changeable later in Profile.
2. **Goal** — weight gain / build strength / weight loss / healthy routine.
3. **Age band** — 18–25 / 26–35 / 36–50 / 50+ (18+ gate; under-18 blocked).
4. **Diet type** — veg / sattvic / eggs ok / non-veg.
5. **Workout mode preference** — home (no equipment) / gym / decide later.
6. **Chosen deity (optional, skippable)** — Hanuman / Ram / Shiv / Krishna /
   skip. Frames the devotional layer; never required.
7. **Consent screen (DPDP)** — itemised plain-language notice (in chosen
   language), checkbox **unticked by default**, link to privacy policy.
   Health-related questions are optional and skippable by design.
8. **Plan-ready celebration** — brief animated moment ("आपका plan तैयार है"),
   then land on Daily Home.

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
