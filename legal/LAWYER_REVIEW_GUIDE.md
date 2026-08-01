DRAFT — Prepared with AI assistance. Not legal advice. Requires review by qualified counsel before publication.

# Lawyer Review Guide

This is the working document for your review pass. It consolidates every
`[LAWYER REVIEW]` flag from the package with full context, groups the open
questions by theme, states what this package deliberately did not cover, and
gives a suggested sign-off checklist.

## How this package was built

An AI coding assistant audited the Fit Hindu app's actual codebase (React
Native/Expo app, Supabase database schema, Next.js admin panel) as of
2026-07-15, and drafted this package based strictly on what the code and
project documentation show — not on assumptions about what a typical wellness
app does. Every factual claim in `DATA_INVENTORY.md` and
`THIRD_PARTY_PROCESSORS.md` has a file/path citation. Where the app's intended
behavior (per specs/roadmap docs) differs from what's actually built today,
both are stated separately and labeled.

One useful framing fact: **the app has not launched, and most of the data
collection described here is not live yet** — only the language-preference
screen exists in the UI. This package was deliberately drafted ahead of the
build (per the founder's direction) so the consent notice can be correct
*before* collection starts, as DPDP requires. That means several sections
describe intended/planned behavior rather than current fact — each is labeled
"PLANNED" in `DATA_INVENTORY.md` or flagged inline elsewhere.

## Full flag index (LR-01 through LR-21)

| # | Topic | Location | Summary |
|---|---|---|---|
| LR-01 | `weight_kg` field classification | `DATA_INVENTORY.md`, `GAPS_AND_RISKS.md` #11 | Confirm gym exercise-load weight is ordinary fitness data, not sensitive health data. |
| LR-02 | ~~Supabase hosting region unknown~~ **RESOLVED** | `THIRD_PARTY_PROCESSORS.md`, `PRIVACY_POLICY.md` §6 | Confirmed by founder (2026-07-15): Mumbai, India. No cross-border transfer. |
| LR-03 | ~~Bunny.net hosting region unknown~~ **RESOLVED** | `THIRD_PARTY_PROCESSORS.md`, `PRIVACY_POLICY.md` §6 | Confirmed by founder (2026-07-15): Mumbai, India (origin storage). |
| LR-04 | No retention periods defined anywhere | `DATA_INVENTORY.md`, `PRIVACY_POLICY.md` §7, `GAPS_AND_RISKS.md` #4 | Genuine gap; placeholders proposed, need real determination. |
| LR-05 | `consent_at` field exists but unused | `DATA_INVENTORY.md` | No consent UI writes to it — consent mechanism must be built. |
| LR-06 | No confirmed DPA with Supabase | `THIRD_PARTY_PROCESSORS.md`, `GAPS_AND_RISKS.md` #5 | Standard-practice gap. |
| LR-07 | No confirmed DPA with Bunny.net | `THIRD_PARTY_PROCESSORS.md`, `GAPS_AND_RISKS.md` #5 | Lower urgency — Bunny doesn't process personal data in current design. |
| LR-08 | Herbal Deck call center: internal use or third party? | `THIRD_PARTY_PROCESSORS.md`, `PRIVACY_POLICY.md` §5 | Founder frames this as internal (same legal entity) — needs legal confirmation of that fact. |
| LR-09 | Roadmap services (PostHog, push, ad platforms) will invalidate this package once built | `THIRD_PARTY_PROCESSORS.md`, `GAPS_AND_RISKS.md` #12 | Process flag — re-run this audit before shipping any of them. |
| LR-10 | Itemized purposes / granular consent design for marketing & ad-targeting uses | `PRIVACY_POLICY.md` §4 | The core "how far can we itemize and still use data broadly" question — see "Business decisions needed" below. |
| LR-11 | Age gate specified but not enforced in code | `PRIVACY_POLICY.md` §10, `COMPLIANCE_CHECKLIST.md`, `GAPS_AND_RISKS.md` #3 | Founder confirmed (2026-07-15) it can ship after this policy is published — not a publication blocker, but should be prioritized once real users exist. |
| LR-12 | No account/data deletion flow | `COMPLIANCE_CHECKLIST.md`, `GAPS_AND_RISKS.md` #2, `PRIVACY_POLICY.md` §9 (as LR-18) | High-priority DPDP + Play gap. |
| LR-13 | Play Store geo-restriction to India — intent confirmed, technical setting pending | `PRIVACY_POLICY.md` §13, `COMPLIANCE_CHECKLIST.md`, `GAPS_AND_RISKS.md` #9 | Founder confirmed India-only by design (2026-07-15); only the Play Console configuration itself remains to be verified at submission. Underpins the decision to defer GDPR/CCPA. |
| LR-14 | "Fit Hindu" name still provisional | `PRIVACY_POLICY.md` §1, `GAPS_AND_RISKS.md` #10 | Lock the name before publishing. |
| LR-15 | Effective date is a placeholder | `PRIVACY_POLICY.md` header | Set only at actual publication, not draft date. |
| LR-16 | Play Data Safety form answers are pre-drafted, need re-verification at submission time | `COMPLIANCE_CHECKLIST.md` | Any feature shipped between this draft and submission changes the answers. |
| LR-17 | India Data Protection Board complaint path not included | `PRIVACY_POLICY.md` §9, `COMPLIANCE_CHECKLIST.md` | Deliberately not guessed/invented — needs an official source. |
| LR-18 | No in-app mechanism for rights requests | `PRIVACY_POLICY.md` §9 | Same underlying gap as LR-12, called out at the point it affects the rights section specifically. |
| LR-19 | Significant Data Fiduciary status unassessed | `GAPS_AND_RISKS.md` #8, `COMPLIANCE_CHECKLIST.md` | Worth an explicit determination given the founder's stated ambition for scale. |
| LR-20 | No breach-response plan | `GAPS_AND_RISKS.md` #7, `COMPLIANCE_CHECKLIST.md` | Out of scope for a privacy-policy drafting pass; flagged for separate work. |
| LR-21 | 13+ minimum age raised, then deferred | `PRIVACY_POLICY.md` §10, `GAPS_AND_RISKS.md` #3b, `COMPLIANCE_CHECKLIST.md` | Founder considered lowering the minimum age to 13+ but decided (2026-07-15) to keep 18+ as the v1 floor, since DPDP's children's provisions (parental consent, no targeted ads to minors) would conflict with the data-advantage strategy for that cohort. Revisit only alongside dedicated parental-consent infrastructure. |

## Open questions grouped by theme

### Jurisdiction / applicability
- India-only distribution and Mumbai-only hosting are now confirmed by the founder (2026-07-15) — resolving LR-02, LR-03 fully and LR-13's business-intent question. The one remaining step is operational, not legal: verify the Play Console listing is technically configured for India-only distribution before submission (LR-13).

### Business decisions needed (not legal calls, but they gate legal drafting)
- **How aggressively can the "how we use your data" section (§4) be worded?** The founder's direction (paraphrased from a 2026-07-15 conversation) was to use data "as much as possible to Herbal Deck's advantage," bounded by not being unethical — which we've interpreted as consistent with `docs/idea.md`'s own stated guardrail: *"collect the minimum, disclose every purpose, use it aggressively inside those disclosed purposes."* We drafted §4 to itemize marketing/CRM/ad-audience uses as specifically as we could while still covering that ambition. **Please confirm this interpretation is correct and that the itemized list is neither too narrow (blocking a use the business wants) nor too broad (failing DPDP's specificity requirement).** This is LR-10.
- Confirm the Herbal Deck call center is genuinely the same legal entity as the app operator (LR-08) — this is a fact question, but it changes a document (internal use vs. third-party processor entry), so please verify with the founder/company records rather than assuming. Context: founder confirmed (2026-07-15) Herbal Deck is a B2C/D2C company selling via its own website, e-commerce, and influencer partnerships, in addition to the call center — none of those other channels are integrated with the app in code today (see `THIRD_PARTY_PROCESSORS.md`), but keep them in mind if the business connects app data to any of them later.
- Retention periods (LR-04) are a business call as much as a legal one — how long is data actually useful to Herbal Deck, balanced against DPDP's storage-limitation principle?
- **Minimum age**: founder considered 13+ but decided to keep 18+ as the v1 floor specifically because of the conflict between DPDP's children's provisions and the data-advantage strategy (LR-21). This was a real trade-off consciously made, not an oversight — worth confirming counsel agrees 18+ is the right call before any future push to lower it.

### Facts to verify with the founders
- Company legal name, registered address, registration number (all `{{PLACEHOLDER}}` in every document)
- Grievance Officer appointee and contact details
- Whether any signed DPA already exists with Supabase or Bunny (may just need to be located, not negotiated)
- Confirmation that "Fit Hindu" is the final name

Resolved as of 2026-07-15: distribution is India-only; Supabase and Bunny.net both store data in Mumbai, India; Herbal Deck is a B2C/D2C herbal/Ayurvedic products company selling via website, e-commerce, and influencers in addition to its call center; minimum age stays 18+ for v1 (13+ deferred, LR-21); age gate may ship after this policy is published.

### Standard-practice choices we made that you may want to change
- We defaulted to a "layered" summary + full-policy structure (common practice, not legally required) — fine to simplify if your firm prefers a single flat document.
- We described roadmap features (PostHog, push notifications) *in the policy* as "not yet collected, may be added later, will be disclosed before activation" rather than omitting them entirely — this is a transparency choice; some firms prefer silence until a feature actually ships. Either is defensible; flagging the choice.
- Retention placeholders in §7 use a generic "we retain while your account is active + a grace period" structure as a starting template, not a recommendation of specific durations.

## What we did NOT cover

This package is scoped to **privacy/data-protection compliance only**. It does
**not** include:

- Terms of Service / End User License Agreement
- Employment or contractor agreements (including for the Herbal Deck call
  center staff or admin-panel content team)
- Intellectual property matters (the "Fit Hindu" name/trademark question
  noted in LR-14 is flagged here only because it affects this document, not
  resolved)
- The Ayurvedic/DMRA drug-advertising compliance work for the Bajrangvati
  product itself — already covered separately in `docs/research/compliance.md`
  and out of scope for a data-privacy package
- An internal/employee-facing privacy notice for Herbal Deck staff who use
  the admin panel (flagged as a gap in `DATA_INVENTORY.md` "Admin panel"
  section, not drafted here)
- A breach-response/incident-management plan (LR-20)
- Google Play Console configuration itself (only the Data Safety form
  *answers* are pre-drafted — someone still needs to enter them)

## Suggested sign-off checklist

- [ ] All `{{PLACEHOLDER}}` values filled in company-wide, consistently
- [ ] LR-10 (data-use itemization / consent granularity) resolved — this gates how the founder's data strategy gets implemented
- [ ] LR-08 (internal vs. third-party call center framing) confirmed as a fact
- [ ] LR-12 / LR-18 (deletion flow, in-app rights mechanism) — confirm whether these must ship *before* this policy is published, or whether the policy can describe them as forthcoming (LR-11, the age gate itself, is already resolved as forthcoming-is-acceptable)
- [ ] LR-13 (India-only distribution) confirmed in Play Console, not just intent
- [ ] LR-21 (18+ vs 13+ minimum age) — confirm counsel agrees with keeping 18+ as the v1 floor
- [ ] LR-04 (retention periods) set to real values
- [ ] LR-06 / LR-07 (DPAs) confirmed executed or scheduled
- [ ] LR-17 (Data Protection Board reference) added from an official source
- [ ] LR-14 (product name) locked
- [ ] LR-19 / LR-20 (SDF assessment, breach plan) — decide whether to address now or explicitly defer with a documented reason
- [ ] Final legal read of `PRIVACY_POLICY.md` end to end for tone, enforceability, and consistency with `DATA_INVENTORY.md`
- [ ] Confirm `legal/CHANGELOG.md` is the agreed process for logging all future edits
