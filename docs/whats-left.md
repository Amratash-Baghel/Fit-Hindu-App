# What's left before Fit Hindu can ship

> Written 2026-07-16, in plain language, for the owner. No jargon.
> If you read one thing: **the app is a working demo, not a shippable
> product.** The two things that actually block the Play Store are the
> D-U-N-S number and real video/audio content — neither is code.

---

## The one-minute version

| Thing | State | Who unblocks it |
|---|---|---|
| D-U-N-S number → Play org account | Waiting (~15 days) | Owner |
| Real videos + audio | Not started — everything is fake placeholder links | Fitness hire / content team |
| Sign-in (accounts) | Not built | Engineering |
| Streaks / progress ticks | Look real, do nothing | Engineering (needs sign-in first) |
| Diet section | Not built at all | Engineering + content |
| The rest of onboarding (10 of 12 questions) | Not built | Engineering |
| Privacy policy + store listing | Not written | Owner + engineering |

---

## 1. Things only YOU can unblock

### D-U-N-S number (the long pole)
Nothing ships without it. It's the critical path and it's already in motion —
see `docs/play-store-setup.md`. Everything below can happen while you wait.

### Real content
The **thumbnail images** you upload now show up in the app — the workout grid
and the exercise screen display the real picture you uploaded through the
admin panel (verified 2026-07-16). Exercises without a thumbnail keep the
"Our Avatar" placeholder.

Two things still need work here:
- **Exercise videos don't play yet.** You can upload a video and its
  thumbnail appears, but tapping the play button doesn't play the video. See
  "Video playback" below — it's a real piece of engineering, not an upload
  problem.
- **Audio is still fake.** Every sound (sleep, meditation, jap) is a
  placeholder `example.com` link. Real audio files need uploading, and unlike
  video they *will* just work once uploaded — the audio player is wired.

You also need more content overall: more mantras, more exercises (4 deities
and ~7 exercises today — enough to demo, not enough to keep someone for a
month).

### Video playback
This is why "the video isn't updating" — the app was never wired to *play*
exercise videos, only recently to show their thumbnails. Playing them needs
two things:
1. A native video library (`expo-video`) added and the app rebuilt — it isn't
   installed today.
2. The Bunny **Stream** videos currently reject direct requests (they return
   a "403 forbidden"). That usually means the Stream library has token
   security or an allowed-domains list turned on. Either that has to be
   relaxed for the app, or the app has to request **signed URLs** (a small
   backend piece). Your uploaded *image* thumbnails don't have this problem —
   they're on a normal pull zone and load fine.

Until both are done, the play button is a visual affordance, not a working
player. This should be an early item when engineering resumes.

### Privacy policy
Legally required for the Play Store, and required by India's DPDP law before
you collect anything about a user. Doesn't exist yet. Needs to be written and
hosted at a public URL.

---

## 2. Big features that don't exist yet

### Sign-in / accounts
**This is the biggest gap.** Right now the app has no accounts. That means:
- Nothing the user does is saved anywhere. Finish a workout, close the app —
  gone.
- Streaks can't work.
- "My Workouts" is a placeholder.
- You collect **zero first-party data** — which was one of the main business
  reasons for building this.

The code is already written to expect it (every "save" call is in place and
silently does nothing until sign-in exists), so this is a contained piece of
work, but it is real work.

### Streaks and the daily ticks
The Home screen shows "start your sankalp" and diya icons. **They are
decoration right now.** They don't count anything. This is the retention hook
from the strategy doc, and it needs sign-in first.

### Diet
A whole tab in the plan, not built. The database is ready (meals, diet
templates), the screen isn't. Home says "coming soon" honestly.

### The rest of onboarding
The plan is 12 questions (goal, level, age, diet, deity, consent...). **Two
are built** — language and name. The other ten are what would let the app
actually give someone a personalised plan. Right now everyone effectively
gets the same content.

### Notifications
Not started. A devotional-habit app with no daily reminder will lose most of
its users in week one. This is probably the highest-value thing after
sign-in.

---

## 3. Smaller gaps

- **Analytics (PostHog).** Planned, not installed. You currently have no way
  to know what people actually use.
- **App icon and splash.** Real image files exist but they're placeholders
  from the template — they are not the brand.
- **Offline.** If the phone has no signal, most screens show an error. There
  is no caching.
- **Error reporting.** If the app crashes on a user's phone, you will never
  find out.
- **Language switch after onboarding.** You pick a language once; there's no
  Profile screen to change it later.
- **Nobody has run this on a real Android phone yet.** Everything so far is
  verified in a desktop browser. This matters — see below.

---

## 4. Before you press "build APK"

Two things must happen first:

**a) Run the new content in Supabase.** Open the Supabase SQL editor, paste
in `supabase/seed_add_greetings_mantras.sql`, run it. Without this, the
greeting won't rotate (it will just say "Ram Ram" every day) and the Jap
screen will only show 2 deities instead of 4. It's safe to run twice.

**b) Build and test on a real phone.** The APK is the first time this code
runs on Android. Expect surprises the browser can't show: fonts, the tap
button's glow, audio behaviour when the screen locks.

### The commands

```bash
npm install -g eas-cli     # once
eas login                  # your Expo account
eas build -p android --profile preview
```

`preview` is already configured to produce an installable **APK** and to
include the Supabase keys. When it finishes, EAS gives you a download link —
send that link to anyone you want to try it. No Play Store needed.

---

## 5. Honest summary

What you can show someone today: a polished, Hindi-first devotional fitness
app with a real workout player, a working mala counter, meditation, and sleep
sounds — all reading live content from the database, all authored through the
admin panel.

What it can't do today: remember who you are, save anything, remind you to
come back, or play a single real video.

The gap between those two lists is roughly: **sign-in + streaks +
notifications + real content.** That's the difference between a convincing
demo and something a person uses every morning.
