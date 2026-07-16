DRAFT — Prepared with AI assistance. Not legal advice. Requires review by qualified counsel before publication.

# Changelog

All edits to any document in `legal/` must be logged here — date, what
changed, and why. This is the audit trail for how the privacy policy and
supporting documents evolved.

## 2026-07-15 — Initial draft

Initial AI-assisted draft of the full `legal/` package, pending legal review.
Produced by auditing the Fit Hindu codebase (app, admin panel, Supabase
schema) as it stood on this date. Files created: `README.md`,
`PRIVACY_POLICY.md`, `DATA_INVENTORY.md`, `THIRD_PARTY_PROCESSORS.md`,
`COMPLIANCE_CHECKLIST.md`, `GAPS_AND_RISKS.md`, `LAWYER_REVIEW_GUIDE.md`.
20 `[LAWYER REVIEW]` flags raised — see `LAWYER_REVIEW_GUIDE.md` for the full
index. Scoping confirmed with the founder: India-only distribution (v1),
Herbal Deck as the only entity in scope, push notifications and analytics
(PostHog) treated as roadmap items not yet implemented.

**Not yet reviewed by counsel. Do not publish or submit to Google Play until
the sign-off checklist in `LAWYER_REVIEW_GUIDE.md` is complete.**

## 2026-07-15 — Founder-confirmed facts incorporated

Updated the package with facts confirmed by the founder in the same-day
follow-up conversation:
- Supabase and Bunny.net both store data in Mumbai, India — no cross-border
  transfer. Resolved LR-02, LR-03. `THIRD_PARTY_PROCESSORS.md` and
  `PRIVACY_POLICY.md` §6 updated.
- Distribution is confirmed India-only by business intent — resolved the
  intent half of LR-13; the Play Console technical configuration is still to
  be verified at submission.
- Age gate (18+) may ship after this policy is published — not a publication
  blocker. Softened LR-11 accordingly.
- Founder raised lowering the minimum age to 13+; decided to keep 18+ as the
  v1 floor because DPDP's children's provisions would conflict with the
  data-advantage/ad-targeting strategy for a 13-17 cohort. New flag LR-21
  raised and cross-referenced in `PRIVACY_POLICY.md` §10,
  `GAPS_AND_RISKS.md`, and `COMPLIANCE_CHECKLIST.md`.
- Added context that Herbal Deck is a B2C/D2C herbal/Ayurvedic products
  company selling via website, e-commerce, and influencer partnerships in
  addition to its call center — noted in `PRIVACY_POLICY.md` §1 and
  `THIRD_PARTY_PROCESSORS.md`; confirmed no code integrates the app with
  those other channels today.

Flag count: 21 (LR-01 through LR-21); LR-02 and LR-03 now resolved.
