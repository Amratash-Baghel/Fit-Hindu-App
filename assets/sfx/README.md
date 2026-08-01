# UI sound effects

Four short chirps played by `src/lib/feedback.ts` alongside haptics:

| File | Fired by | Feel |
|------|----------|------|
| `tap.wav` | `feedback.tap()` — per set / per jap count | soft, high, very short tick |
| `success.wav` | `feedback.success()` — plan assigned / mala done (108) | two rising notes |
| `complete.wav` | `feedback.complete()` — workout done | warm rising triad (the reward) |
| `chime.wav` | `feedback.chime()` — meditation session ended | soft single bell, gentler than complete |
| `error.wav` | `feedback.error()` — destructive confirm | low, gentle two-tone (never harsh) |

## These are PLACEHOLDERS

They were synthesised (pure sine tones, `scratchpad/generate-sfx.mjs`) so the
feedback service is functional today. **Replace them with the sound designer's
polished assets** — same filenames, so no code changes. Target: mono, short,
under ~30 KB each. `.m4a` is preferred over `.wav` (smaller); if you change the
extension, update the `require()` paths in `src/lib/feedback.ts`.

Keep them warm and understated — this is a devotional app, not a game. No file
should be loud enough to feel out of place if it plays in a quiet room.
