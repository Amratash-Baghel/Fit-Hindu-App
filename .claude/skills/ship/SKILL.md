---
name: ship
description: Pre-commit gauntlet — verify, review, document, then commit and push the current work. Use when the user says to ship, finalize, or commit a feature.
---

Run the full acceptance pipeline on the current working tree. Abort at the
first failure and report it — never commit red.

1. Typecheck, lint, and build. All must pass.
2. If the change touches UI: launch the Expo web preview and click through
   the affected flow once; screenshot it.
3. Run `/code-review` on the diff. Fix CONFIRMED findings; list anything
   skipped and why.
4. Update `docs/progress.md` (date, feature, one-line outcome, anything the
   user must do — e.g. pending migrations).
5. If a decision worth remembering was made, add a dated line to
   `docs/decisions.md`.
6. **Learning entry (SOP §5):** add one entry to `docs/learning-log.md` —
   pick ONE concept from this feature (a pattern, a mechanism, a term) and
   explain it plainly, pointing at the real file in this repo where it lives.
   Then ask the user one quick check-question about it in the final message.
7. Commit with a clear message and push.
7. Final message to the user: what shipped, evidence it works (screenshot /
   green checks), and any USER MUST RUN steps — repeated even if already
   mentioned mid-session.
