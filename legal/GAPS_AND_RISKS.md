DRAFT — Prepared with AI assistance. Not legal advice. Requires review by qualified counsel before publication.

# Gaps and Risks

Prioritized findings from the Phase 1–2 audit. "Fix" recommendations are
split into product/engineering work and legal/business decisions.

## High priority

### 1. No consent mechanism exists (DPDP notice + opt-in)
- **Risk**: Publishing without this is the single biggest compliance gap — DPDP requires itemized notice and affirmative consent *before* collection.
- **Requirement**: DPDP Act 2023 notice/consent provisions.
- **Fix (engineering)**: Build the consent screen specified in `docs/specs/onboarding-questionnaire.md:35-37` (itemized notice, unticked checkbox, link to this privacy policy) as part of the onboarding questionnaire build (next on `docs/schedule.md`).
- **Fix (legal)**: Finalize the itemized purpose list this policy should present — see > **[LAWYER REVIEW LR-10]**.

### 2. No account/data deletion flow
- **Risk**: Violates the DPDP erasure right and the Google Play Data Safety form's deletion-availability requirement; `activity_log` is architecturally append-only with zero delete policy.
- **Requirement**: DPDP Act 2023 erasure right; Play Data Safety form.
- **Fix (engineering)**: Add an account-deletion path (in-app and/or via support email as an interim measure) and decide whether `activity_log` rows get hard-deleted or anonymized on account deletion — this needs a product decision since the append-only design was intentional for streak integrity (`0006_user_state_activity.sql:1-3`).
- **Fix (legal)**: See > **[LAWYER REVIEW LR-12]** — confirm whether email-only deletion requests are acceptable at launch or an in-app flow is required first.

### 3. Age gate not enforced
- **Risk**: App is designed and marketed as 18+, but nothing currently blocks a minor from using it, which is relevant to both DPDP's children's provisions and COPPA if the app is ever accessible outside India. Founder has confirmed (2026-07-15) this can ship *after* the privacy policy is published, so it is not a publication blocker — but it remains a real gap the moment the app has real users, and should be built early.
- **Requirement**: DPDP Act 2023 children's data provisions; Play Store content rating accuracy.
- **Fix (engineering)**: Build the age-band question with an actual 18+ gate (even a self-declaration screen), not just a data field.
- **Fix (legal)**: See > **[LAWYER REVIEW LR-11]**.

### 3b. 13+ minimum age raised as a future consideration
- **Risk**: Founder raised lowering the minimum age to 13+ (2026-07-15). Under DPDP, this would make 13-17 users legally "children," requiring verifiable parental consent and prohibiting behavioral tracking/targeted advertising directed at them — a direct conflict with the ad-targeting/CRM strategy in `PRIVACY_POLICY.md` §4. Decision made: **keep 18+ as the v1 floor**; 13+ is deferred until parental-consent infrastructure exists.
- **Requirement**: DPDP Act 2023 children's data provisions.
- **Fix (product/legal)**: If 13+ is pursued later, this entire package needs a dedicated pass — a parental-consent flow, a separate (narrower) data-use disclosure for minors, and likely a schema change (the `age_band` enum currently has no 13-17 band). See > **[LAWYER REVIEW LR-21]**.

### 4. Undefined data retention periods
- **Risk**: DPDP requires data not be kept longer than necessary for the stated purpose; no retention schedule exists anywhere.
- **Requirement**: DPDP Act 2023 storage-limitation principle.
- **Fix (product/legal)**: Set concrete retention periods per data category (see `DATA_INVENTORY.md`) — this is a business decision as much as a legal one. See > **[LAWYER REVIEW LR-04]**.

## Medium priority

### 5. No signed Data Processing Agreements with vendors
- **Risk**: Standard practice gap — Supabase and Bunny.net both process data on Herbal Deck's behalf without a confirmed executed DPA.
- **Requirement**: DPDP data-fiduciary obligations regarding processors.
- **Fix (legal/ops)**: Confirm and formally accept each vendor's standard DPA. See > **[LAWYER REVIEW LR-06]** and **[LR-07]**.

### 6. Vendor hosting regions — RESOLVED
- **Status**: Confirmed by founder (2026-07-15): both Supabase and Bunny.net store data in Mumbai, India. No cross-border transfer. `THIRD_PARTY_PROCESSORS.md` and `PRIVACY_POLICY.md` §6 updated accordingly. LR-02 and LR-03 closed.

### 7. No breach-response plan
- **Risk**: DPDP requires breach notification to the Data Protection Board and affected users within a prescribed timeframe once enforcement begins; no process exists to detect or respond to a breach today.
- **Requirement**: DPDP Act 2023 breach notification.
- **Fix (legal/ops)**: > **[LAWYER REVIEW LR-20]** Draft a basic incident-response process — who is notified internally, how affected users are identified, notification templates and timelines. Not attempted in this package (outside a privacy-policy drafting task) — flagged for separate work.

### 8. Significant Data Fiduciary status unassessed
- **Risk**: DPDP imposes extra obligations (e.g., mandatory DPIAs, mandatory DPO) on entities the government designates as "Significant Data Fiduciaries," typically based on volume/sensitivity of data processed. Herbal Deck's stated ambition (`docs/idea.md` — a "large Hindu audience," first-party data as a strategic asset) means this could become relevant at scale.
- **Requirement**: DPDP Act 2023 §10 (Significant Data Fiduciary obligations).
- **Fix (legal)**: > **[LAWYER REVIEW LR-19]** Not urgent pre-launch at expected initial scale, but worth a documented determination now so it isn't missed later as the user base grows.

## Low priority

### 9. Geographic distribution — intent confirmed, technical setting still to verify
- **Risk**: Low. Founder confirmed (2026-07-15) the app is India-only by design, which is what the GDPR/CCPA scoping decision in this package relies on. The remaining step is purely operational: making sure the Play Console listing is actually configured with India-only country targeting to match that intent.
- **Fix (ops)**: Confirm Play Console country targeting at submission time. See > **[LAWYER REVIEW LR-13]**.

### 10. Product name still provisional
- **Risk**: Low legal risk, but this entire policy references "Fit Hindu" by name; a rename after publication means republishing.
- **Fix (product)**: Lock the name before this policy is finalized. See > **[LAWYER REVIEW LR-14]**.

### 11. "weight_kg" field classification
- **Risk**: Low — very likely ordinary fitness/behavioral data, not sensitive health data, but worth one line of legal sign-off given health-adjacent framing throughout the app.
- **Fix (legal)**: See > **[LAWYER REVIEW LR-01]**.

### 12. Roadmap features (analytics, push notifications, ad audiences) will invalidate this package once shipped
- **Risk**: Low today (none are implemented), but each will require updating `DATA_INVENTORY.md`, `PRIVACY_POLICY.md`, `THIRD_PARTY_PROCESSORS.md`, and the Play Data Safety form before shipping — easy to forget in the moment of shipping a feature.
- **Fix (process)**: Treat "update `legal/`" as a checklist item whenever PostHog, push notifications, or any ad-audience integration is built. See > **[LAWYER REVIEW LR-09]**.
