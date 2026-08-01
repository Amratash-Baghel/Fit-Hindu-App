DRAFT — Prepared with AI assistance. Not legal advice. Requires review by qualified counsel before publication.

# Legal Package — Fit Hindu

## What this app is

Fit Hindu (working name, provisional — see LR-14) is a free Android app made
by Herbal Deck, offering daily workouts, diet guidance, meditation with
timer/sounds, per-deity mantra chanting (jap), sleep sounds, and devotional
content for a Hindu audience in India. It has not yet launched — as of this
draft, only the app's language-selection screen is built; account creation
and the onboarding questionnaire are the next features on the build schedule.
This package was deliberately drafted ahead of that build so the privacy
notice is correct *before* data collection starts, per DPDP requirements.

## What's in this folder

| File | Contents |
|---|---|
| `PRIVACY_POLICY.md` | The public-facing privacy policy draft — the main deliverable for publishing on the website and linking from the Play Store listing. |
| `DATA_INVENTORY.md` | The factual data map — every data element, its source in code, purpose, storage, and retention status. The backbone every other document must stay consistent with. |
| `THIRD_PARTY_PROCESSORS.md` | Every external service that receives or is planned to receive app data (Supabase, Bunny.net), plus the internal-vs-third-party question about Herbal Deck's call center. |
| `COMPLIANCE_CHECKLIST.md` | Per-regulation obligation checklist with met/partial/not-met/needs-determination status, including pre-drafted Google Play Data Safety form answers. |
| `GAPS_AND_RISKS.md` | Prioritized list of compliance gaps with recommended fixes, split into engineering and legal/business work. |
| `LAWYER_REVIEW_GUIDE.md` | **Start here if you're the reviewing lawyer.** Full index of every flag, open questions grouped by theme, and a sign-off checklist. |
| `CHANGELOG.md` | Log of every edit made to this package — start logging here going forward. |

## Recommended review order

1. This README
2. `LAWYER_REVIEW_GUIDE.md` — get the full picture of what needs your judgment before reading the substantive documents
3. `DATA_INVENTORY.md` — the facts
4. `THIRD_PARTY_PROCESSORS.md` — who the facts get shared with
5. `PRIVACY_POLICY.md` — the document being published, built from 3 and 4
6. `COMPLIANCE_CHECKLIST.md` and `GAPS_AND_RISKS.md` — where the app currently falls short and what closes each gap

## Placeholders to fill (appear throughout the package)

| Placeholder | What's needed |
|---|---|
| `{{APP_DISPLAY_NAME}}` | Final public app name (see LR-14 — "Fit Hindu" is provisional) |
| `{{COMPANY_LEGAL_NAME}}` | Herbal Deck's full registered legal entity name |
| `{{COMPANY_REGISTERED_ADDRESS}}` | Registered office address |
| `{{COMPANY_REGISTRATION_NUMBER}}` | CIN / registration number |
| `{{CONTACT_EMAIL}}` | Privacy/support contact email |
| `{{GRIEVANCE_OFFICER_NAME}}` / `{{GRIEVANCE_OFFICER_EMAIL}}` / `{{GRIEVANCE_OFFICER_ADDRESS}}` | DPDP-required Grievance Officer appointee and contact |
| `{{EFFECTIVE_DATE}}` | Set only when actually published (LR-15) |
| `{{RETENTION_PERIOD_AFTER_DELETION}}` | Real retention period once decided (LR-04) |

## Master flag index

21 `[LAWYER REVIEW]` flags (LR-01 through LR-21) are raised across this
package; 3 are already resolved (LR-02, LR-03 — vendor hosting regions
confirmed as Mumbai, India — and the business-intent half of LR-13 — India-only
distribution confirmed). The full index — with location, status, and
one-line summary for each — is in `LAWYER_REVIEW_GUIDE.md` under "Full flag
index." Do not treat any document in this folder as final until every open
flag there is resolved.

## Status

**Initial AI-assisted draft, 2026-07-15. Not reviewed by counsel. Not
published. Do not submit to Google Play or link from any public page until
the sign-off checklist in `LAWYER_REVIEW_GUIDE.md` is complete.**
