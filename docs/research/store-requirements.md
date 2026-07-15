# App Store Registration & Launch Requirements — (July 2026)

> ⚠️ **STATUS 2026-07-15 — SUPERSEDED IN PART.** This is the original Phase-0
> research (dated 2026-07-10, when both stores were in scope). Since then:
> **v1 ships on Google Play ONLY** (owner decision 2026-07-12) — **ignore all
> Apple / App Store / D-U-N-S-via-Apple content below.**
>
> 👉 **The live, actionable runbook is [docs/play-store-setup.md](../play-store-setup.md)**
> — hand that to whoever is setting up the account.
>
> Corrections since this was written: the Apple fast-track for D-U-N-S is not
> available to us (we're not enrolling with Apple), so D-U-N-S must come from
> **D&B India** — free track 10–30 business days, **paid expedited 5–7 days**.
> D-U-N-S is **mandatory** for a Play organization account; PAN/GST/CIN cannot
> substitute. Sections B–C below remain broadly useful for the Play half.

## A. This-week checklist for the owner

### Day 1 — D-U-N-S number (blocks the Play org account)
1. Check if Herbal Deck's legal entity already has a D-U-N-S number via the [D&B lookup](https://www.dnb.com/en-us/smb/duns/duns-lookup.html). If not, request one via [D&B India](https://www.dnb.co.in/duns/get-a-duns) — free track 10–30 business days; **paid expedited 5–7 business days (recommended)**.
2. Documents needed: Certificate of Incorporation / GST registration, PAN, registered legal entity name and address (must match exactly everywhere), company website, company domain email for the owner.

### Day 1–2 — Google Play Console (Organization account)
1. Create a fresh Google account on the company domain; register at Play Console as **Organization** — one-time **$25** ([fee details](https://afkarsoftware.com/en/blog-detail/google-play-console-account-2026-one-time-25-fee/)).
2. Provide D-U-N-S number, org documents (incorporation/GST/business license), website, org phone/email; identity verification typically ~2 business days ([verification guide](https://www.testerscommunity.com/blog/google-play-developer-verification-2026)).
3. Why Organization: personal accounts created after Nov 2023 must run a **closed test with ≥12 testers opted in for 14 consecutive days** before production. Organization accounts are exempt — though Google states this only by omission, not explicitly ([Google community thread](https://support.google.com/googleplay/android-developer/thread/398243168), [PrimeTestLab analysis](https://primetestlab.com/blog/personal-vs-organization-google-play-account-12-testers)).

### ~~Day 2–3 — Apple Developer Program~~ — **OUT OF SCOPE (Play-only v1)**
Removed 2026-07-15. iOS ships from the same codebase in a later phase; when
it does, re-read this section in git history. Upside of the decision: the
Apple enrollment black hole (2–7 weeks in 2026) is off our critical path.

### Day 3–5 — Compliance groundwork (parallel)
- Publish a privacy policy URL on the company site (**required by Play — a hard publishing blocker**). Cover: what the health questionnaire collects, purpose, retention, deletion/grievance contact — DPDP Act notice requirements: plain language, itemized purposes, no bundled/pre-ticked consent, rights + complaint route to the Data Protection Board ([DPDP guide](https://www.recordinglaw.com/world-laws/world-data-privacy-laws/india-data-privacy-laws/), [IAPP](https://iapp.org/news/a/with-rules-finalized-india-s-dpdpa-takes-force)). DPDP Rules were notified Nov 2025 with phased enforcement; first enforcement actions against apps began Q1 2026 — build consent screens now.
- Draft Play **Data safety** form answers + the **Health apps declaration** (health & fitness data category, collected, linked to identity, not shared).
- Product sales: physical goods are **exempt from Play Billing** ([Play payments policy](https://support.google.com/googleplay/android-developer/answer/10281818)) — sell via Razorpay/etc, **no 15–30% commission**. (Not in v1 anyway; monetization is deferred.)

## B. Realistic end-to-end timeline (Play-only, revised 2026-07-15)

| Step | Duration |
|---|---|
| D-U-N-S via D&B India — **paid expedited** | **5–7 business days** |
| D-U-N-S via D&B India — free track | 10–30 business days |
| Play org registration + verification | 2–5 days (after D-U-N-S) |
| Internal testing (recommended; org accounts are exempt from the 12×14 closed-test rule) | 1–2 weeks |
| Play first review | 3–7 days (first app, new account) |

**Net: public launch mid-August to early September 2026 stays achievable —
but only if the D-U-N-S application starts immediately and we pay for
expedited processing.** D-U-N-S is now the single critical path; nothing else
comes close. Runbook: [docs/play-store-setup.md](../play-store-setup.md).

## C. Top 5 gotchas for first-time publishers (Play)

1. **Legal-name mismatch** between D-U-N-S, GST/incorporation docs, and store forms — the #1 cause of verification loops. Decide the exact GST spelling once and copy-paste it everywhere.
2. **D-U-N-S is mandatory and slow** — PAN/GST/CIN do NOT substitute for a Play organization account. Free track can run 30 business days; pay for expedited (5–7 days). This is the whole critical path.
3. **Health claims without evidence/disclaimers** — top rejection cause for wellness apps; avoid "cures/treats" language, keep the "not medical advice" disclaimers on onboarding/workout/diet screens, and explain in the review notes why health data is collected.
4. **Missing privacy policy URL** — a hard blocker; must be live on herbaldeck.com before submission.
5. **Data safety form mismatch** with what the app actually sends (analytics SDKs count) — audit SDK data flows before filling the form; complete the **Health apps declaration**; DPDP consent screens must be granular, not bundled. Note: **individual accounts cannot publish Health & Fitness apps since 28 Jan 2026** — Organization is mandatory for us.
