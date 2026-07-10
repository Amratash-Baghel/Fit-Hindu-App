---
name: screen
description: Build or modify an app screen from its spec and the design system, then verify it in the preview browser. Use whenever the user asks to build, create, or rework a screen or page of the app.
---

Build the requested screen end-to-end. Follow these steps in order; do not
skip verification.

1. **Read the spec** in `docs/specs/` for this screen. If none exists, stop
   and write one first (user flow, states: loading/empty/error/success,
   Hindi + English copy), confirm it with the user, then continue.
2. **Assemble from the design system** (`app/ui/` tokens + base components).
   If the screen needs a component that doesn't exist, add it to `app/ui/`
   as a reusable component first — never inline one-off styles.
3. All user-facing strings go through the i18n layer (hi + en). No hardcoded
   display text.
4. Handle every state in the spec: loading, empty, error, success. Mid-range
   Android + slow network is the baseline, not the edge case.
5. **Verify:** run typecheck and lint; launch the Expo web preview; click
   through the full flow as a user (including error/empty states where
   reachable); screenshot the result for the user.
6. Append one line to `docs/progress.md`: date, screen, what shipped.

Do not commit in this skill — committing is /ship's job, after review.
