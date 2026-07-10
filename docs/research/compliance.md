# Bajrangvati App — Compliance Fence-Lines (researched July 2026)

Scope: wellness app (diet plans, workouts, meditation, sleep sounds) with light branding of the Bajrangvati herbal product. India launch, Google Play + App Store, Aug–Sep 2026.

## A. Claims table — never say / safe to say

| Never say (in app copy, store listing, notifications) | Safe to say |
|---|---|
| "Treats / cures / prevents" any disease or condition | "Supports your wellness routine" |
| Claims touching DMRA-scheduled conditions: diabetes, obesity, sexual weakness, cancer, mental illness, hair loss, skin disorders — even "helps with weight loss" for the *product* is risky (obesity is a scheduled condition) | "A fitness plan designed around your goals" (the *plan*, not the product, drives outcomes) |
| "100% safe", "no side effects", "guaranteed results", "permanent" — explicitly flagged by AYUSH/CCPA | "Traditional Ayurvedic formulation" (factual, licence-backed) |
| "Doctor recommended", "clinically proven" without evidence on file | "Consult your physician before starting" |
| Diagnosing or measuring anything (BP, sugar, etc.) via phone sensors — Apple hard-rejects | Manual logging of user-entered data |
| Anything contradicting medical consensus (Google's health-misinformation rule) | Generic, consensus-aligned diet/exercise guidance |
| Framing the app as needed to "manage a condition" | "Build healthy habits: diet, movement, sleep, meditation" |

Rule of thumb: the app is **Health & Fitness**, never **Medical**. Medical classification triggers Apple's 1.4.1 heightened scrutiny, Google's Jan-2026 medical-device verification/labeling regime, and (if product claims cross into therapy) India's drug-advertising laws. Keep the Bajrangvati branding as *sponsorship/availability* ("From the makers of Bajrangvati", buy link) rather than benefit claims inside the app.

## B. Disclaimers — exact text and placement

1. **General wellness disclaimer** — onboarding (must be accepted) + Settings/About + store listing description:
   > "Bajrangvati App provides general wellness, diet and fitness information for educational purposes only. It is not a medical device and does not diagnose, treat, cure or prevent any disease. Always consult a qualified healthcare professional before starting any diet, exercise programme, or supplement, especially if you are pregnant, nursing, or have a medical condition." (Google's Jan-2026 guidance expects the "not a medical device" sentence verbatim-equivalent for unverified health apps.)
2. **Before first workout / plan generation**: "Stop exercising if you feel pain, dizziness or discomfort. These plans are general guidance, not a substitute for professional medical advice." (HealthifyMe/Cult.fit pattern: consult-a-doctor before starting + discontinue-on-pain.)
3. **On any product mention/purchase screen**: "Bajrangvati is a traditional Ayurvedic product. Results vary. Read the label. Consult an Ayurvedic practitioner or physician before use."
4. **Questionnaire screen**: link to privacy notice + why each data point is collected (see C).
5. Hindi versions of all of the above — disclaimers must be in the language of the UI.

## C. Privacy/consent checklist for the questionnaire (DPDP Act 2023 + DPDP Rules 2025)

- [ ] Itemised, plain-language notice (Hindi + English) listing each data item (age, goals, diet type, health conditions) and its specific purpose — shown *before* collection.
- [ ] Affirmative opt-in consent (checkbox unticked by default; no "by continuing you agree"). Substantive DPDP obligations bite from ~May 2027, but Play/Apple require this now anyway.
- [ ] In-app path to withdraw consent, correct data, and delete account/data; grievance contact published.
- [ ] Make health-condition questions **optional and skippable** — collect the minimum needed (data-minimisation, and it keeps the Play health-data justification easy).
- [ ] Verifiable parental consent if under-18 users are allowed — simpler to gate the app 18+.
- [ ] **Play Data Safety form**: declare Health info + Fitness info collected, purpose, encrypted in transit, deletion available; complete the **Health Apps Declaration form** (Policy > App content). Publish from an **Organization** developer account (individual accounts barred from Health category since Jan 28, 2026).
- [ ] **Apple privacy nutrition label**: declare Health & Fitness data type, linked-to-user; provide account-deletion in app (required since apps allow account creation).
- [ ] Hosted privacy policy URL reachable from both store listings and inside the app.

## D. Top 3 risks

1. **Product benefit claims crossing into drug advertising.** With Rule 170 omitted (SC vacated its stay, Aug 2025) enforcement now runs through the DMRA 1954, ASCI monitoring (233 health ads escalated to AYUSH Ministry) and the Ayush Suraksha portal — a "helps weight loss/diabetes" claim for Bajrangvati risks fines and prosecution, and store takedown.
2. **Store rejection as an unverified medical app** — any diagnose/treat language, condition-management framing, or missing disclaimers/health-declaration forms trips Google's Jan-2026 health rules and Apple 1.4.1.
3. **Consent/privacy failures on health questionnaire data** — missing itemised notice, pre-ticked consent, no deletion path, or an inaccurate Data Safety form / nutrition label → Play removal now, DPDP penalties (up to ₹250 crore per breach class) once enforcement begins.

## Sources
- Google Play Health Content & Services: https://support.google.com/googleplay/android-developer/answer/16679511
- Google Play health app categories: https://support.google.com/googleplay/android-developer/answer/13996367
- Health apps declaration form: https://support.google.com/googleplay/android-developer/answer/14738291
- Play Jan-2026 health requirements overview: https://myappmonitor.com/blog/google-play-health-apps-update-2026-requirements
- Apple App Review Guidelines (1.4.1): https://developer.apple.com/app-store/review/guidelines/
- ASCI→AYUSH escalations (DMRA): https://medicaldialogues.in/news/industry/pharma/asci-flags-233-health-ads-for-dmr-act-violation-reports-to-ayush-ministry-149226
- AYUSH consumer-protection measures / prohibited phrases: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2148433
- Rule 170 omission, SC order Aug 2025: https://medicaldialogues.in/news/health/misleading-medical-ads-case-sc-disposes-ima-plea-lifts-stay-on-ayush-ad-pre-approval-rule-153283
- DPDP Rules 2025 (notice/consent/timeline): https://www.ey.com/en_in/insights/cybersecurity/transforming-data-privacy-digital-personal-data-protection-rules-2025 ; https://www.cyrilshroff.com/wp-content/uploads/2025/12/FAQs-DPDPA.pdf
- Play Data Safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Data Safety vs Apple nutrition label: https://www.onetrust.com/blog/google-data-safety-vs-apple-nutrition-label/
- HealthifyMe Terms of Use (disclaimer wording): https://www.healthifyme.com/terms-of-use/
- Cult.fit Terms of Use: https://static.cult.fit/terms__cult.html
