# UI sound effects

Short chirps played by `src/lib/feedback.ts`. **Sound fires ONLY on meaningful,
low-frequency outcomes** — every button press, selection, jap count and set is
haptic-only, never a sound (docs/specs/ui-polish.md slice B). That is the fix
for the old "beep on every tap" irritation; there is deliberately no per-tap
sound file anymore.

| File | Fired by | Feel |
|------|----------|------|
| `success.wav` | `feedback.success()` — plan assigned / mala done (108) | two soft rising notes |
| `complete.wav` | `feedback.complete()` — workout done | warm rising triad (the reward) |
| `chime.wav` | `feedback.chime()` — meditation session ended | soft single bell, gentler than complete |
| `error.wav` | `feedback.error()` — destructive confirm | low, gentle descending two-tone (never harsh) |

## These are PLACEHOLDERS

Synthesised by `scratchpad/generate-sfx.mjs` (warm sine + a touch of 2nd
harmonic, soft attack/decay, peak amplitude ~0.22, 22.05kHz mono) so the
feedback service is functional and quiet today. **Replace them with the sound
designer's polished assets** — same filenames, so no code changes. The service
also plays them at reduced volume (`SFX_VOLUME` in feedback.ts). Target: mono,
short, under ~30 KB each. `.m4a` is preferred over `.wav` (smaller); if you
change the extension, update the `require()` paths in `src/lib/feedback.ts`.

Keep them warm and understated — this is a devotional app, not a game. No file
should be loud enough to feel out of place if it plays in a quiet room.
