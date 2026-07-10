# App Store Registration & Launch Requirements — Bajrangvati (July 2026)

## A. This-week checklist for the owner

### Day 1 — D-U-N-S number (blocks BOTH stores' org accounts)
1. Check if Herbal Deck's legal entity already has a D-U-N-S number via [Apple's D-U-N-S lookup](https://developer.apple.com/help/account/membership/D-U-N-S/). If not, request one there (free for Apple developers, ~5 business days) or via [D&B India](https://www.dnb.co.in/duns/get-a-duns) (free standard track can take up to 30 business days — use the Apple route).
2. Documents needed: Certificate of Incorporation / GST registration, PAN, registered legal entity name and address (must match exactly everywhere), company website, company domain email for the owner.

### Day 1–2 — Google Play Console (Organization account)
1. Create a fresh Google account on the company domain; register at Play Console as **Organization** — one-time **$25** ([fee details](https://afkarsoftware.com/en/blog-detail/google-play-console-account-2026-one-time-25-fee/)).
2. Provide D-U-N-S number, org documents (incorporation/GST/business license), website, org phone/email; identity verification typically ~2 business days ([verification guide](https://www.testerscommunity.com/blog/google-play-developer-verification-2026)).
3. Why Organization: personal accounts created after Nov 2023 must run a **closed test with ≥12 testers opted in for 14 consecutive days** before production. Organization accounts are exempt — though Google states this only by omission, not explicitly ([Google community thread](https://support.google.com/googleplay/android-developer/thread/398243168), [PrimeTestLab analysis](https://primetestlab.com/blog/personal-vs-organization-google-play-account-12-testers)).

### Day 2–3 — Apple Developer Program (Organization)
1. In India, enroll **via the Apple Developer app** only ([Apple enrollment help](https://developer.apple.com/help/account/membership/program-enrollment)). Fee: **US$99/year**.
2. Needs: D-U-N-S number, legal entity status, website, enroller with authority to bind the company (owner ideally), company domain email. After D-U-N-S issues, allow ~2 business days for Apple to sync from D&B.
3. Avoid the individual-account shortcut: seller shows as a personal name, no team members, cannot convert to org later — apps must be transferred with re-review ([comparison](https://www.w3tutorials.net/blog/difference-between-apple-developer-account-as-individual-and-company-organization/)). Only use it if org enrollment stalls past 3–4 weeks and launch date is at risk.

### Day 3–5 — Compliance groundwork (parallel)
- Publish a privacy policy URL on the company site (required by both stores). Cover: what the health questionnaire collects, purpose, retention, deletion/grievance contact — DPDP Act notice requirements: plain language, itemized purposes, no bundled/pre-ticked consent, rights + complaint route to the Data Protection Board ([DPDP guide](https://www.recordinglaw.com/world-laws/world-data-privacy-laws/india-data-privacy-laws/), [IAPP](https://iapp.org/news/a/with-rules-finalized-india-s-dpdpa-takes-force)). DPDP Rules were notified Nov 2025 with phased enforcement; first enforcement actions against apps began Q1 2026 — build consent screens now.
- Draft Play **Data safety** form and Apple **Privacy Nutrition Label** answers (health & fitness data category, collected, linked to identity, not shared).
- Product sales: physical goods are **exempt from Play Billing** ([Play payments policy](https://support.google.com/googleplay/android-developer/answer/10281818)) and from Apple IAP (App Store Guideline 3.1.5(a) — physical goods/services consumed outside the app must NOT use IAP). Use Razorpay/etc. No 15–30% commission.

## B. Realistic end-to-end timeline

| Step | Duration |
|---|---|
| D-U-N-S (Apple fast track) | 5–8 business days |
| Play org registration + verification | 2–5 days (after D-U-N-S) |
| Apple org enrollment | 2 days–2 weeks typical; **2–7 weeks reported in 2026** ([forums](https://developer.apple.com/forums/thread/822540)) |
| Internal/closed testing (recommended even if exempt) | 1–2 weeks |
| Play first review | 3–7 days (first app, new account) |
| Apple first review | 24–72 hrs typical; health apps 2–7 days ([review times](https://www.lowcode.agency/blog/app-store-review-time)) |

**Net: registrations done by late July; realistic public launch mid-August to early September 2026** — matches the target, but only if D-U-N-S starts this week and Apple enrollment doesn't stall.

## C. Top 5 gotchas for first-time publishers

1. **Legal-name mismatch** between D-U-N-S, GST/incorporation docs, and store forms — the #1 cause of verification loops. Fix D&B record first.
2. **Apple enrollment black hole** — 2026 waits of 2–7+ weeks with no updates; call Apple Developer Support after 2 weeks rather than waiting.
3. **Health claims without evidence/disclaimers** — top rejection for wellness apps on both stores; avoid "cures/treats" language, add "not medical advice" disclaimers, explain in App Review notes why health data is collected ([rejection guide](https://www.openspaceservices.com/blog/mobile-app-development/apple-app-store-rejection-guide-2026-the-15-most-common-reasons-and-how-to-fix-each)).
4. **Minimal-functionality / crash rejections (Guideline 4.3 / 2.1)** — test on real devices; provide a demo login for reviewers.
5. **Data safety / privacy label mismatch** with what the app actually sends (analytics SDKs count) — audit SDK data flows before filling the forms; DPDP consent screens must be granular, not bundled.
