# Bajrangvati App — Idea Document (v0, rough)

> Status: DRAFT for owner discussion. Written 2026-07-10. Nothing here is final.

## One-line pitch

Every Bajrangvati buyer gets a free personal wellness companion — a daily diet,
workout, and meditation routine built around their goals — so the product
works better, they stay longer, and they buy again.

To the customer (what a caller can say on the phone):
**"Humara free app milega — aapke liye personal diet aur exercise plan
banayega, roz guide karega."**

## The user

- Existing Bajrangvati buyer (post-purchase is the entry moment, not ads).
- Hindi-first, mid-range Android phone, Jio/Airtel data. English secondary.
- Health-conscious, spiritually inclined; trusts the brand enough to have
  already paid money.
- Wide age range — UI must be simple, large-type friendly, minimal steps.

## Why an app (business goals, in priority order)

1. **Retention → reorder.** A customer following a 60–90 day plan inside our
   app finishes the course and reorders. Repeat purchase rate is the metric
   this app lives or dies on.
2. **Owned channel.** Push notifications reach buyers for free; today every
   re-touch costs ad money or a caller's time.
3. **First-party data.** The onboarding questionnaire (goals, diet, habits)
   sharpens ad targeting and caller pitches.
4. **Alternate revenue later** — premium tier, in-app shop, possibly ads.
   Not v1.

## The core loop (v1)

Onboarding questionnaire (goal, age band, diet type, routine, language)
→ rule-based plan assignment from team-authored templates
→ **daily home screen**: today's meals, today's workout (video), today's
meditation/sleep track, product-usage reminder
→ streaks + push reminders → plan completion → reorder nudge.

v1 modules:
- Questionnaire + plan engine (rule-based, templates authored by the team —
  no AI generation in v1; predictable and safe for health content)
- Daily home screen (the habit surface — most polished screen in the app)
- Workout player (in-house shot videos, 1–5 min)
- Diet day view (veg-first, Indian meals, regional-friendly)
- Meditation mode + sleep sounds (audio player, offline-capable)
- Devotional touch: daily shloka/quote on the home screen, devotional audio
  in the meditation section, festival-aware greetings. A flavour, not a module.
- Streaks, push notifications, Hindi/English toggle
- Admin panel (web) so the content team runs everything without engineering

## How the money works

1. **Reorder engine (immediate, biggest).** In-app "reorder / shop" for
   physical products — exempt from the 30% store commission (physical goods).
   Plan completion and streak milestones are natural reorder moments.
2. **Premium tier (later, v2+).** Advanced plans, live/recorded sessions,
   dietician consults. Digital → store fees apply (15% small-business rate).
   Build the audience first; don't gate v1.
3. **Data dividend (invisible but real).** Questionnaire + behaviour data
   feeds Meta/Google targeting and caller scripts.
4. **Third-party ads — parked.** Only at large scale, and carefully; ads in a
   brand app spend trust.

## The unfair advantage — our traffic and leads

We don't buy users; we already own them. Funnel every existing touchpoint:

- **QR code inside every product box** — "Scan karo, apna free personal plan
  pao." Highest-intent moment we have. (Print lead time: start early.)
- **Order confirmation SMS/WhatsApp** with the app link.
- **600 callers** add one closing line after every sale.
- **Website** post-purchase page + banner for past buyers.
- **Influencers** demo the app, not just the product.
- Each channel gets a tracked link so we know which funnel works.

## Beyond Bajrangvati — the platform play

The key architecture decision: **build a "programs" platform, not a
Bajrangvati app.** Bajrangvati is program #1. Nothing in the data model or
design hardcodes one product.

- **v1 ships as the Bajrangvati app** (focused brand promise, simple pitch) —
  but under the hood a "program" = questionnaire mapping + plan templates +
  content library. Adding the next product's program is content work in the
  admin panel, not a rebuild.
- **v2 — the Herbal Deck wellness ecosystem:** every product gets a program;
  the app becomes the companion to the whole catalogue. In-app shop and
  cross-sell ("your sleep answers suggest trying X"). Subscriptions — monthly
  product refill plans managed in-app.
- **v2/v3 — services layer:** paid dietician / AYUSH-doctor tele-consults
  (the call-center muscle already exists; this is an upsell they can book),
  community/challenges (group streaks, festival challenges), testimonial +
  UGC collection that feeds the ad-creative team, referral rewards.
- **Devotional vertical (optional v3):** daily devotional audio/aarti/bhajan
  as a standalone habit surface — Indian devotional apps show this drives
  extraordinary daily engagement; it would make the app a daily habit even on
  rest days.
- **Long-term option — white-label:** the same platform (programs + admin
  panel + funnel playbook) can be deployed for other D2C brands. Not a
  company commitment; an option the architecture keeps open.

## Not in v1 (protective list)

Payments/premium, AI plan generation, chat/community, consultations,
referral system, third-party ads, iOS-first polish (Android is the market;
iOS ships from the same codebase when accounts are ready).

## Open questions for the owner

1. Brand: does the app carry the Bajrangvati name or Herbal Deck name?
   (Affects the beyond-scope path — recommend: Bajrangvati front, Herbal Deck
   platform behind.)
2. Budget line for hosting (video CDN ~low thousands ₹/month at launch) and
   store accounts (Play $25 once, Apple $99/yr).
3. Who on the team owns content ops after I move to WFH?
4. How aggressive is the reorder nudge allowed to be in v1?
5. Timeline expectation: office days end ~27 July; realistic public launch is
   1–2 weeks after (closed testing + store review), driven remotely.
