DRAFT — Prepared with AI assistance. Not legal advice. Requires review by qualified counsel before publication.

# Third-Party Processors

One entry per external service that receives (or is planned to receive) app
data, sourced from the Phase 1 code audit. Matches `DATA_INVENTORY.md` and
`PRIVACY_POLICY.md` §5 exactly — do not add a third party to the policy
without adding it here first.

---

## Currently integrated (confirmed in code)

### Supabase

- **What it is**: Backend-as-a-service — Postgres database, authentication, and row-level security. The system of record for all account, profile, questionnaire, and activity data.
- **What it receives**: All data in `DATA_INVENTORY.md` except media files (video/audio, which are explicitly never stored here — `supabase/migrations/0003_media_content_atoms.sql:1-7`).
- **Role**: Processor (Herbal Deck is the controller/data fiduciary; Supabase processes on our instructions).
- **Privacy policy / DPA**: https://supabase.com/privacy — https://supabase.com/legal/dpa
- **Data location**: Mumbai, India (confirmed by founder, 2026-07-15). No cross-border transfer — data stays within India. ~~LR-02~~ **Resolved.**
- **Signed DPA on file**: > **[LAWYER REVIEW LR-06]** Not confirmed. Supabase offers a standard DPA (link above) typically executed via their dashboard/terms acceptance — confirm it has been accepted for this project before launch.

### Bunny.net (Bunny Stream + Bunny Storage)

- **What it is**: Video/audio CDN and storage, used to host exercise videos, meditation/sleep/jap audio. Chosen per `docs/research/media-hosting.md`.
- **What it receives**: Media binary files uploaded by Herbal Deck staff through the admin panel (`admin/lib/bunny.ts`, `admin/app/api/upload/route.ts`). **Does not receive end-user personal data** — end users only fetch playback URLs; no user identifier is sent to Bunny by the app (`src/lib/content.ts` reads `playback_url`/`download_url` from Supabase, calls Bunny only as a passive CDN endpoint).
- **Role**: Processor, for the media library only (not for personal data).
- **Privacy policy / DPA**: https://bunny.net/privacy/ — https://bunny.net/tos/ (confirm current DPA offering directly with Bunny)
- **Data location**: Mumbai, India (origin storage, confirmed by founder 2026-07-15). CDN edge delivery (`docs/research/media-hosting.md:20`) may cache media at other Indian PoPs for performance, but this is content delivery of non-personal media files, not a personal-data transfer. ~~LR-03~~ **Resolved.**
- **Signed DPA on file**: > **[LAWYER REVIEW LR-07]** Not confirmed — same recommendation as Supabase. Lower urgency since Bunny does not process personal data in this app's current design, but still recommended standard practice for any vendor in the delivery chain.

---

## Internal (not a third party — confirm classification)

### Herbal Deck customer support / sales ("caller") operations

- **What it is**: Herbal Deck is a B2C/D2C company selling herbal/Ayurvedic products through multiple channels — its own website, e-commerce, and influencer partnerships (confirmed by founder, 2026-07-15) — alongside a ~600-person call center. Per `docs/idea.md:184-186`, the call center is intended to receive "per-user context — goal, adherence, likely-needed product" to inform sales calls to app users.
- **Scope note**: This entry covers only the call center use case that is explicitly documented as intended for this app. The website, e-commerce storefront, and influencer program are Herbal Deck's separate, pre-existing sales channels — no code in this repository integrates the app with any of them (no e-commerce SDK, no affiliate/influencer tracking code found). If any of those channels are later connected to receive app-user data (e.g., syncing app users into an e-commerce CRM, or using app data for influencer-campaign targeting), each needs its own entry here before that integration ships.
- **What it would receive**: Goal, diet type, adherence/streak data, possibly deity affinity — a subset of the data in `DATA_INVENTORY.md`.
- **Role**: > **[LAWYER REVIEW LR-08]** Founder direction (2026-07-15) is to treat this as **internal use within Herbal Deck** (same legal entity), not a third-party disclosure — on the basis that "we're talking Herbal Deck only for now." This needs legal confirmation: if the call center is operated by Herbal Deck itself (not a separate BPO/vendor company), it is correctly framed as an internal use case in `PRIVACY_POLICY.md` §4 rather than a third-party entry here. If the calling operation is run by a distinct legal entity or outsourced vendor, it must move to this document as a processor/recipient with its own DPA.
- **Status**: Not implemented in any code in this repository — no CRM integration, no export mechanism exists yet. This is a **disclosed future use**, itemized in the privacy policy ahead of being built, per DPDP's requirement that purposes be disclosed before data is used for them.

---

## Roadmap — not yet integrated, listed for completeness

These appear in `CLAUDE.md` (intended stack) or `docs/idea.md` (business strategy) but have **zero code presence** as of this draft. They must NOT be described as current in the privacy policy. Each needs its own entry here, a `DATA_INVENTORY.md` update, and a re-run of the Play Data Safety form **before** it ships.

| Service | Intended purpose | Source | Status |
|---|---|---|---|
| PostHog | Product analytics | `CLAUDE.md` "Stack" section | Not integrated — see LR-09 in `PRIVACY_POLICY.md` |
| Expo push notification service | Ritual/streak reminder push notifications | `CLAUDE.md`, confirmed by founder as "later" (2026-07-15) | Not integrated — `expo-notifications` absent from `package.json` |
| Meta / Google ad platforms (custom audiences, lookalikes) | Ad targeting using goal/affinity data, per `docs/idea.md:179-181` | `docs/idea.md` | Not integrated — no ad SDK or data-export code exists |

> **[LAWYER REVIEW LR-09]** When any roadmap service above is actually integrated, this entire `legal/` package must be revisited — particularly the Play Data Safety form (`COMPLIANCE_CHECKLIST.md`) and the consent notice, since DPDP requires purposes to be itemized before collection begins for that purpose.
