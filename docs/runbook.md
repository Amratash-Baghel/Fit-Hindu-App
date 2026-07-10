# Daily Runbook — literal, no interpretation needed

This is the file to open every morning. It tells you exactly what to open,
type, click, and when. SOP.md is the "why", schedule.md is the "what week",
this is the "what do I physically do right now."

## RIGHT NOW (before Jul 11 build days start)

Do these today, in order:

1. **Message the owner.** One WhatsApp: "Free for 30 min tomorrow to lock the
   app scope? Also need [Company Legal Name] exactly as on the GST cert — I'm
   starting the Apple D-U-N-S request today, it takes up to a week."
2. **Open Claude in the `bajrangvati-app` folder.** Type exactly:
   > Read docs/idea.md and docs/schedule.md. I'm about to sit with the owner
   > tomorrow. Turn the open questions in idea.md into 5 short yes/no or
   > pick-one questions I can literally ask him out loud.
   Save what it gives you — that's your meeting agenda tomorrow.
3. **Start the D-U-N-S request yourself** (don't wait for the meeting):
   open https://developer.apple.com/support/D-U-N-S/ , follow the "request a
   free D-U-N-S" flow, use the company's registered legal name + address.
   This is the only step on the whole project with an external clock —
   nothing else this week matters more than clicking this today.
4. Nothing else today. Nothing to build yet — there's no locked spec.

## THE DAY TEMPLATE (every build day, Jul 11 onward)

### Block 1 — Morning (fresh session limit) — ~2 hrs

1. Open the `bajrangvati-app` folder in Claude.
2. Open **`docs/schedule.md`** — find today's date, read the checkbox list
   for that day.
3. Open **`docs/progress.md`** — read the last 3 entries (30 seconds — just
   orients you to where things stand).
4. Type into Claude, filling the bracket:
   > Read docs/progress.md and docs/schedule.md. Today's target is
   > [paste the exact checkbox line you're doing]. Do we have a spec for
   > this in docs/specs/? If not, write one and show me before building.
5. **If Claude says no spec exists:** it writes one. You read it — just the
   "User flow" and "Not doing" sections, 2 minutes — and reply "yes, build
   it" or correct it. Don't skip this even though it feels slow; this step
   is what prevents rebuilds.
6. **If the feature touches the data model, more than one screen, or you're
   not sure how it should work:** say "use plan mode" (or just "plan this
   first, don't build yet"). Claude proposes an approach as text/todo list,
   NO code yet. Read the plan. Reply "approved" or ask it to change one
   part. Only after you approve does it write code.
   - **Use plan mode for:** anything in the data model, auth/permissions,
     the plan engine, payment/reorder flow, anything you'd feel bad
     redoing.
   - **Skip plan mode for:** copy tweaks, a button color, a one-line fix,
     content-format spreadsheet edits — just ask directly.
7. Claude builds (or runs `/screen` / `/migration` if you name the skill
   directly — same effect, just faster to type).
8. **Claude MUST show you evidence** — a preview screenshot or a
   click-through description. If it just says "done, should work," reply:
   "show me it running in the preview first."
9. You look at the screenshot. Good → say "ship it." Not right → describe
   what's wrong in plain words ("the button is too small on phone width" /
   "it let me submit with an empty name"). Claude fixes and re-shows you.
10. Say **"/ship"**. Wait for it to finish (typecheck/lint/review/commit).
    Read the final message — it will list any "USER MUST RUN" step
    (migration, Supabase dashboard change). If there is one, **do it right
    now**, don't postpone it.
11. Read the one learning-log entry it added (30 seconds). If the
    check-question at the end makes no sense, ask it to re-explain simpler.

### Block 2 — Midday (no Claude — session limit recovers, you do human work)

Pick whichever applies today:
- Reply to owner on scope questions from the morning
- Ping the content/video team on what they owe you this week
- Test the shipped feature on your actual phone, not just the preview
- If nothing pressing: read yesterday's `docs/learning-log.md` entry again

### Block 3 — Afternoon/evening session

Repeat Block 1 steps 1–11 for the SECOND item on today's schedule checklist.
If you're low on energy, do a **cheap task instead**: write tomorrow's spec
only (step 4–5 above, stop before building) — specs cost little and save the
whole next morning.

### End of day (2 min, no new Claude session needed if you're already in one)

- Check `docs/progress.md` has today's real entries (Claude should have
  added them via /ship — just glance, don't rewrite it yourself).
- Tick the completed boxes in `docs/schedule.md` yourself (Claude won't edit
  your schedule checkboxes — that's your one manual file-edit habit).
- Forward `docs/progress.md`'s new lines to the owner as your standup.

## Quick reference — what to open, when

| You want to... | Open | Say |
|---|---|---|
| Know today's task | `docs/schedule.md` | — |
| See what shipped so far | `docs/progress.md` | — |
| Check/write a feature spec | `docs/specs/<feature>.md` | "write a spec for X" |
| Record a real decision | (Claude does it) | happens automatically in `/ship` |
| Build a screen | — | "/screen" or describe the screen |
| Change the database | — | "/migration" or describe the change |
| Finish a feature | — | "/ship" |
| Something risky/structural | — | "plan this first" |
| Confused what to do next | `docs/runbook.md` (this file) | "what's next per the runbook" |

## The one-line rule if you forget everything else

**Spec it, plan the risky parts, build, make Claude prove it works on screen,
ship it, read the one thing you learned. Repeat.**
