# Office-Window Schedule (Jul 11 → ~Jul 27)

~17 days with full facilities. Phase 0 (research) is DONE. Each build day
follows the SOP daily protocol: morning feature cycle, midday human block,
afternoon cycle.

## Jul 11–13 — Phase 1: lock the product (docs, but timeboxed)

- [ ] Owner sit-down with docs/idea.md (v1 pivot) + research findings → scope +
      money model signed off; "Fit Hindu" name/trademark availability
      confirmed; standalone-vs-buyer-gated and devotional-scope questions locked
- [ ] **Owner starts D-U-N-S request (Apple fast track) + Play org account —
      the only bureaucracy-controlled clock; cannot slip**
- [ ] Draft privacy policy (DPDP-compliant, hi+en) — needed for store forms
- [ ] Freeze content formats: diet-template spreadsheet + workout shot-list →
      hand to team; **video team starts shooting NOW, not in week 3**
- [ ] Write specs: onboarding questionnaire + plan engine (the keystone)

## Jul 13–15 — Phase 2: data model, design, scaffold

- [ ] Data-model design session (programs → questionnaire mapping → plan
      templates → content). Plan mode, half a day, no shortcuts
- [ ] HTML mockups of 6 core screens → owner/team review on a phone-size
      window → iterate to "yes, that"
- [ ] Design system locked: tokens (brand + devotional palette, Hindi-capable
      font) + ~8 base components
- [ ] Expo + Supabase scaffold, i18n from day one, Bunny account created
- [ ] Specs for home screen + workout player written (one ahead, per SOP)

## Jul 16–23 — Phase 3: build (2 feature cycles/day)

Build order (each = one SOP feature cycle):
- [ ] Auth + profile (reuse portal patterns)
- [ ] Questionnaire → rule-based plan engine
- [ ] Daily home screen (habit surface + daily devotional ritual — the
      retention hook; most polished screen in the app)
- [ ] Workout player (Bunny HLS) + diet day view
- [ ] Meditation/sleep audio player (offline download)
- [ ] Streaks + push notifications (IST day boundaries)
- [ ] Reorder/shop v1 (link-out or Razorpay — physical goods, no store cut)
- [ ] Analytics events (PostHog) — non-negotiable before testing
- [ ] ~Jul 19: launch ONE background agent → admin panel scaffold from spec
      (review it like a PR; it runs while app build continues)

## Jul 24–27 — Phase 4: content, testing, handoff

- [ ] Team member imports real content via admin panel (them, not you)
- [ ] Internal builds: Play internal testing + (if Apple enrollment done)
      TestFlight to the 40-person office
- [ ] One structured feedback round (portal-trial style)
- [ ] EAS build + OTA pipeline proven end-to-end
- [ ] Handoff: train one team member on admin panel; docs current;
      WFH scope + pay agreed with owner IN WRITING

## After office (from home, part-time)

Closed-testing clock finishes → store submissions → launch mid-Aug–early Sep.
Feedback fixes ship via OTA. Funnel rollout: box QR (print lead time — order
during Phase 3!), caller script line, order SMS/WhatsApp, website banner.

## Slack rules

- Behind by a day: cut from the END of the build list (reorder v1, then
  audio offline), never from auth/plan-engine/home screen.
- Two cycles/day is the target; one GOOD cycle beats two sloppy ones.
- Fridays: no new features — fixes, docs, and the weekly learning quiz.
