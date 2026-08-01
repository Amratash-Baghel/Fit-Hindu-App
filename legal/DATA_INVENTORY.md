DRAFT — Prepared with AI assistance. Not legal advice. Requires review by qualified counsel before publication.

# Data Inventory

This is the factual backbone of the `legal/` package. `PRIVACY_POLICY.md` must not
claim anything not supported here. Every row is sourced from a code or schema
reference — nothing here is invented. Rows marked **PLANNED** describe fields
that exist in the database schema but have no UI writing to them yet (the
onboarding questionnaire and app-user auth are not built as of this draft —
see `docs/schedule.md`, Phase 3).

## Account & identity data

| Data element | Source (code ref) | Purpose | Storage | Shared with | Retention | Status |
|---|---|---|---|---|---|---|
| Auth credentials (method TBD — email/phone/OTP) | Supabase Auth (`src/lib/supabase.ts:6`) | Sign-in / account identity | Supabase (`auth.users`) | Supabase (processor) | > **[LAWYER REVIEW LR-04]** No retention period defined anywhere in code or docs. | PLANNED — no signup UI exists yet |
| `display_name` | `supabase/migrations/0002_identity_profiles.sql:28-40` | Personalization | Supabase Postgres (`profiles`) | None | Undefined — see LR-04 | PLANNED |
| `language_mode` (hindi/english/mixed) | `0002_identity_profiles.sql:31`, live in `app/onboarding/index.tsx` | Set UI language | Supabase Postgres | None | Undefined — see LR-04 | **LIVE** (only field currently collected) |
| `goal` (weight_gain/strength/weight_loss/healthy_routine) | `0002_identity_profiles.sql:32`, `0001_extensions_enums_helpers.sql:10` | Rule-based plan assignment | Supabase Postgres | Internal (Herbal Deck) — see Privacy Policy §4 | Undefined — see LR-04 | PLANNED |
| `age_band` (18-25/26-35/36-50/50+) | `0002_identity_profiles.sql:33`, `0001_...:11` | Plan assignment; 18+ gate | Supabase Postgres | Internal | Undefined — see LR-04 | PLANNED. Spec states 18+ gate (`docs/specs/onboarding-questionnaire.md:30`) but **no code enforces it yet** — see `GAPS_AND_RISKS.md` |
| `diet_type` (veg/sattvic/egg/nonveg) | `0002_identity_profiles.sql:34`, `0001_...:12` | Diet content personalization | Supabase Postgres | Internal | Undefined — see LR-04 | PLANNED |
| `workout_mode_pref` (home/gym) | `0002_identity_profiles.sql:35` | Content filtering | Supabase Postgres | Internal | Undefined — see LR-04 | PLANNED |
| `deity_id` (optional, skippable) | `0002_identity_profiles.sql:36` | Devotional personalization | Supabase Postgres | Internal | Undefined — see LR-04 | PLANNED |
| `consent_at` (DPDP consent timestamp) | `0002_identity_profiles.sql:37` | Proof of consent | Supabase Postgres | None | Undefined — see LR-04 | Column exists; **no consent UI writes to it yet** — see LR-05 |
| Full questionnaire answers (versioned jsonb) | `0002_identity_profiles.sql:69-75` | History of all onboarding answers, incl. body-focus and days/week per `docs/specs/onboarding-questionnaire.md:26-28` | Supabase Postgres (`questionnaire_responses`) | Internal | Undefined — see LR-04 | PLANNED |

## Behavioral / usage data

| Data element | Source (code ref) | Purpose | Storage | Shared with | Retention | Status |
|---|---|---|---|---|---|---|
| Activity log: every completed workout/meal/meditation/jap/sleep-sound/devotional action, with type + date + free-form `meta` jsonb | `0006_user_state_activity.sql:26-39`, `src/lib/activity.ts` | Streaks, progress tracking, personalization, internal analytics | Supabase Postgres (`activity_log`) — **append-only, no delete policy exists** | Internal | Undefined — see LR-04. Note: append-only design means no automatic expiry exists either. | PLANNED — logging calls exist in code but no-op until app-user auth ships (`src/lib/activity.ts:1-6`) |
| Gym exercise weight (`weight_kg`, entered per set) | `app/workout/session.tsx:33,65,101-102` | Workout journal (exercise load, not body weight) | Inside `activity_log.meta` | Internal | Undefined — see LR-04 | > **[LAWYER REVIEW LR-01]** This is the weight used/lifted for an exercise set (an "F&B-style journal" field per `docs/decisions.md:14-19`), not a body-weight or medical metric. Confirm this classification (ordinary fitness/behavioral data, not sensitive health data) is acceptable for the Play Health Apps Declaration. |
| Meditation session data (sound chosen, set/actual minutes) | `0006_user_state_activity.sql:34-37` (meta example) | Streaks, personalization | `activity_log.meta` | Internal | Undefined — see LR-04 | PLANNED |
| Jap (mantra chanting) session data (mantra_id, count) | `0006_user_state_activity.sql:35` | Streaks, personalization | `activity_log.meta` | Internal | Undefined — see LR-04 | PLANNED |
| User-composed workouts (`user_workouts`, `user_workout_items`) | `supabase/migrations/0009_user_workouts.sql`, `src/lib/content.ts:165-263` | Let users save custom routines | Supabase Postgres | None | Undefined — see LR-04 | **LIVE** once app-user auth ships |
| Computed streak values | `0006_user_state_activity.sql:48-116` (SQL functions, not stored — computed on read) | Show streaks on home/profile screens | Not stored; derived from `activity_log` at query time | None | N/A (derived) | PLANNED |

## Data NOT collected (confirmed by code audit)

| Data category | Finding |
|---|---|
| Payment/financial data | No payment processor integrated anywhere; `CLAUDE.md` explicitly excludes payments from v1. |
| Location data | No `expo-location` or equivalent in `app.json` plugins or `package.json`. |
| Camera/photos | No `expo-camera`/`expo-image-picker` in the app. (Admin panel staff *do* upload files — see Third-Party Processors doc — but that is staff-side content management, not end-user data collection.) |
| Contacts | No `expo-contacts` present. |
| Precise device identifiers / fingerprinting | None found in code. |
| Free-text or health-condition/diagnosis fields | Explicitly excluded by spec: "No free-text inputs. No health-condition diagnosis questions." (`docs/specs/onboarding-questionnaire.md:64-65`) |
| Analytics/crash SDK data (PostHog, Sentry, etc.) | **Not integrated in code.** `CLAUDE.md` lists PostHog as intended stack, but no SDK, API key, or event-tracking call exists anywhere in `src/`, `app/`, or `admin/`. Treat as roadmap, not current fact — see `THIRD_PARTY_PROCESSORS.md`. |
| Push notification tokens | **Not integrated.** `expo-notifications` is not in `package.json`. Confirmed by founder (2026-07-15 conversation) as a later addition. |
| Advertising identifiers / ad SDK data | None found. No ad network code anywhere. |

## Admin panel (internal, staff-only — not end-user data)

| Data element | Source | Purpose | Notes |
|---|---|---|---|
| Admin staff auth (Supabase Auth) | `admin/middleware.ts`, `admin/lib/supabase/server.ts` | Gate the content-management panel to Herbal Deck staff | Not a data-subject-facing surface; staff, not app users. Out of scope for the end-user privacy policy but should be covered by an internal/employee privacy notice (**not** produced in this package — see `LAWYER_REVIEW_GUIDE.md` "What we did not cover"). |
| Content files uploaded by staff (video/audio) | `admin/app/api/upload/route.ts`, `admin/lib/bunny.ts` | Populate exercise/meditation/sound library | Media only — filenames are sanitized (`route.ts:47`); no evidence any personal data is embedded in these uploads. |

## Cross-check note

Every purpose cited above as "Internal (Herbal Deck)" is expanded in
`PRIVACY_POLICY.md` §4 ("How and why we use your data") and is the subject of
> **[LAWYER REVIEW LR-10]**. This inventory intentionally does not editorialize
about whether those uses are compliant — see `COMPLIANCE_CHECKLIST.md` and
`GAPS_AND_RISKS.md` for that assessment.
