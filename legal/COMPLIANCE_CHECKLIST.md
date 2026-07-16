DRAFT — Prepared with AI assistance. Not legal advice. Requires review by qualified counsel before publication.

# Compliance Checklist

Status key: ✅ Met (with evidence) · ⚠️ Partially met · ❌ Not met / not implemented · ❓ Needs lawyer determination

## India DPDP Act, 2023

| Obligation | Status | Evidence / gap |
|---|---|---|
| Itemized, plain-language notice before collection | ❌ Not met | No consent screen exists in code; `docs/specs/onboarding-questionnaire.md:35-37` specs one but it isn't built. `PRIVACY_POLICY.md` (this package) is the draft notice text. |
| Affirmative, unbundled opt-in consent (unticked checkbox) | ❌ Not met | Spec calls for this (`onboarding-questionnaire.md:36`) but not built. `consent_at` column exists (`0002_identity_profiles.sql:37`) and is unused. |
| Granular consent for distinct purposes (core service vs. marketing/ads) | ❓ Needs determination | See > **[LAWYER REVIEW LR-10]** in `PRIVACY_POLICY.md` §4 — design not yet finalized. |
| Data minimization | ✅ Met, by design | Schema explicitly excludes free-text and health-diagnosis fields (`onboarding-questionnaire.md:64-65`); optional/skippable fields for deity and body-focus. |
| Right to access, correct, and erase data | ❌ Not met | No in-app mechanism exists (`activity_log` is explicitly append-only with no delete policy — `0006_user_state_activity.sql`). See > **[LAWYER REVIEW LR-12]**. |
| Right to withdraw consent | ❌ Not met | No mechanism built. |
| Grievance Officer published and reachable | ❌ Not met | Placeholder only — see `PRIVACY_POLICY.md` §9. |
| Data Protection Board complaint path disclosed | ❓ Needs determination | See > **[LAWYER REVIEW LR-17]** — do not publish an unverified government URL. |
| Children's data / age verification | ⚠️ Partially met | App is designed 18+ only but the gate is not technically enforced yet — see > **[LAWYER REVIEW LR-11]**. |
| Breach notification process | ❌ Not met | No incident-response or breach-notification process found in code or docs. See > **[LAWYER REVIEW LR-20]** in `GAPS_AND_RISKS.md`. |
| Significant Data Fiduciary assessment | ❓ Needs determination | See > **[LAWYER REVIEW LR-19]** in `GAPS_AND_RISKS.md`. |
| Data Processing Agreements with processors | ❌ Not met | No confirmed DPAs with Supabase or Bunny — see `THIRD_PARTY_PROCESSORS.md` LR-06/LR-07. |

## GDPR / UK GDPR

| Obligation | Status | Evidence / gap |
|---|---|---|
| Applicability determination | ⚠️ Low priority — intent confirmed | Founder confirmed (2026-07-15) India-only distribution by design; Play Store technical geo-restriction still to be verified at submission — see > **[LAWYER REVIEW LR-13]**. |
| Lawful basis documented per purpose | ❓ Deferred | Not drafted in detail; would only be needed if applicability is confirmed. |
| DPO appointment | ❓ Deferred | Same as above. |

## CCPA/CPRA and other US state laws

| Obligation | Status | Evidence / gap |
|---|---|---|
| Applicability / threshold determination | ❓ Needs determination | Same geo-distribution caveat as GDPR (LR-13). No evidence of California-specific targeting or revenue/user thresholds being met. |

## COPPA

| Obligation | Status | Evidence / gap |
|---|---|---|
| Not directed at children under 13 | ⚠️ Partially met | App targets 18+ (founder confirmed this remains the v1 floor, 2026-07-15 — a 13+ option was considered and deferred, see LR-21), but see LR-11 — the gate is not yet enforced, and COPPA's "actual knowledge" standard could still apply if minors access the app before the gate ships. |

## ePrivacy / cookies

| Obligation | Status | Evidence / gap |
|---|---|---|
| Cookie consent banner (web) | N/A currently | Mobile app uses no cookies. Admin panel is staff-only, not public-facing — see `LAWYER_REVIEW_GUIDE.md` "What we did not cover." |

## Google Play Data Safety form — pre-drafted answers

> **[LAWYER REVIEW LR-16]** These are drafted from the Phase 1 code audit as a starting point. **Must be re-verified against the actual app at the time of submission** — any feature shipped between this draft and submission (e.g., push notifications, analytics) changes these answers.

| Question | Draft answer |
|---|---|
| Does your app collect or share any of the required user data types? | Yes |
| Data types collected | Personal info (name — optional), Health & fitness (fitness activity, i.e. workouts/meditation/jap logged) |
| Is data encrypted in transit? | Yes (Supabase enforces HTTPS/TLS) |
| Do you provide a way for users to request data deletion? | **No — not yet built. Must be built before this can honestly be answered "yes."** See LR-12. |
| Is data shared with third parties? | Yes — service providers only (Supabase, Bunny.net), disclosed as processors, not sold |
| Is the app's target audience children? | No — 18+ intended (see LR-11 for enforcement gap) |

## Google Play Health Apps Declaration

> Required because the app collects fitness/goal data and is positioned as Health & Fitness (`docs/research/compliance.md`). Individual developer accounts are barred from this category since Jan 28, 2026 — an **Organization** account is required (`docs/play-store-setup.md`, already tracked as the project's critical path).

| Item | Status |
|---|---|
| App classified as Health & Fitness, not Medical | ✅ Consistent with `docs/research/compliance.md` — no diagnostic/treatment claims in code or copy found |
| "Not a medical device" disclaimer present in-app | ❓ Not yet built — onboarding UI beyond the language screen doesn't exist yet |
| Health data declared, purpose stated, deletion available | ⚠️ Partially — declarable once questionnaire ships; deletion is not available (LR-12) |

## Apple App Store

N/A — v1 is Play-only by owner decision (`docs/decisions.md`, 2026-07-12).

## PCI DSS

N/A — no payment processing anywhere in v1 (`CLAUDE.md` "Not in v1").

## Sector-specific (health)

Not directly applicable as a clinical/medical regulatory matter (app avoids diagnostic/treatment claims by design). Advertising-claims compliance for the parent company's physical product (Bajrangvati) is a separate, already-tracked concern in `docs/research/compliance.md` and is out of scope for this privacy package — see `LAWYER_REVIEW_GUIDE.md`.
