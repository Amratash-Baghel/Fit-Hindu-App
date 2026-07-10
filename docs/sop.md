# Standard Operating Procedure — Bajrangvati App

The protocol for how this project runs. When in doubt, follow this file.

## 1. The prime rule

**All state lives in files, never in chat.** Specs in `docs/specs/`, decisions
in `docs/decisions.md`, progress in `docs/progress.md`. A session can die at
any moment (limits, crashes) — if the files are current, nothing is lost and
the next session resumes in one minute. If it's only in chat, it's gone.

## 2. Daily protocol

**Session 1 (morning, biggest limit window — build time):**
1. Open Claude in this repo. Say: "Read docs/progress.md and today's target.
   Continue." (CLAUDE.md loads automatically.)
2. Run ONE feature cycle (see §3). Target: the hardest feature of the day
   while the limit window is fresh.
3. `/ship` before the session gets long. Long sessions waste limit on
   re-reading old context — one feature per session, then `/clear` or a new
   session.

**Midday (no-Claude block — human work):**
- Owner alignment, team content handoffs, testing on a real phone,
  reviewing the morning's screenshots/diff (see §5 learning).
- This block exists so the limit window recovers while you do work only
  you can do.

**Session 2 (afternoon/evening):**
- Second feature cycle, or fixes from phone testing, or spec-writing for
  tomorrow's feature (spec-writing is cheap — good low-limit activity).

**End of day (5 min):** confirm `docs/progress.md` reflects reality; forward
it to the owner as the standup.

## 3. Feature protocol (the cycle, ~1–2 hours each)

1. **Spec exists?** If not, write it first (user flow, all states, hi+en
   copy) and confirm. Specs are written ONE feature ahead, never more.
2. **Plan mode** for anything touching the data model or more than one
   screen. Approve the plan before code exists.
3. **Build** — via `/screen` for UI, `/migration` for schema.
4. **Verify** — Claude clicks through the flow in the web preview and shows
   a screenshot. Never accept "done" without evidence.
5. **You test** the flow yourself in the preview or on the phone.
6. **`/ship`** — review gauntlet, docs updated, commit, push.

## 4. Session & limit management

- **One feature per session.** Start fresh sessions instead of continuing a
  huge one — context re-reading burns limit for nothing.
- **Batch your asks.** One message with the full request beats five
  follow-ups. Before sending, ask: did I give it everything it needs?
- **Agents are expensive — use them on schedule, not on impulse.** Parallel
  research agents ate a whole session limit once already. Budget: at most
  one background agent running at a time during build (the admin-panel
  agent), launched at the START of a limit window.
- **Save low-limit time for cheap work:** spec writing, doc review, mockup
  tweaks, planning tomorrow.
- **If the limit dies mid-feature:** it's fine — files are current (§1).
  Note where things stopped in progress.md via a quick manual edit if needed.

## 5. Learning protocol (non-negotiable — this is your future employment)

- **Read every diff before /ship.** You don't have to understand every line;
  you must be able to say what each FILE is for. Ask until you can.
- **One concept per feature.** Every ship ends with Claude explaining ONE
  concept from that feature (what is RLS, what is a component prop, how does
  a migration work) in `docs/learning-log.md`. Next morning, re-read
  yesterday's entry — say "quiz me on yesterday's concept" once a week.
- **You type the manual steps yourself** — running migrations in Supabase,
  store console setup, EAS builds. Never delegate the ops muscle.
- **Weekly themes** (30 min/day of the midday block): Week 1 = git (status,
  diff, log, revert — on this repo's real history). Week 2 = SQL (read every
  migration before running it; write one SELECT per day against real data).
  Week 3 = React basics (read the home-screen component top to bottom with
  Claude annotating).

## 6. Documentation protocol

- Spec before build; one feature ahead only (see prime rule of timing:
  "never build unspecced, never spec more than one feature ahead").
- Every notable choice → one dated line in `docs/decisions.md` with the why.
- Every ship → one line in `docs/progress.md`. This file IS the owner
  standup and the WFH-transition memory.

## 7. Team & owner protocol

- **Owner:** progress.md forwarded daily; decisions needing him are asked as
  yes/no questions with a recommendation, not open questions.
- **Content team:** they work in the spreadsheet formats frozen in Phase 2;
  imports happen through the admin panel, done BY a team member (if they
  can't, the admin panel isn't done). You never become the content pipeline.
- **Any "USER MUST RUN" step** (migrations, dashboard config) is done the
  same day it's flagged, then marked done in progress.md.

## 8. Emergency protocol (post-launch, from home)

- App broken for users → `git revert` the bad commit → `/ship` → EAS OTA
  update pushes the fix without store review.
- Data/DB issue → never fix live data by hand first; write the fix as a
  migration so it's recorded and repeatable.
- Store rejection → read the exact citation, fix only what's cited, resubmit
  with a reviewer note. It's routine, not a crisis.
