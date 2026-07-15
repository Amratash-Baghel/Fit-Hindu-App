# Deploy — testing pipeline (APK + Vercel admin)

Copy-paste runbook. Two targets: (A) an installable Android APK of the app,
(B) the admin panel on Vercel. Play-Store production submission is a later
phase (someone else owns the listing).

## A. Android APK with EAS (install on any phone)

One-time setup:

```
npm install -g eas-cli        # or use npx eas-cli everywhere below
eas login                     # create a free Expo account if you don't have one
eas init                      # links the project; writes extra.eas.projectId into app.json — COMMIT that change
```

Build the shareable testing APK:

```
eas build --platform android --profile preview
```

- First run asks to generate an **Android keystore** — answer **yes**
  (EAS creates and stores it; never lose access to this — it signs every
  future build).
- The build runs in Expo's cloud, ~10–20 min. It prints (and the
  expo.dev dashboard shows) a **build page URL with a QR code and an
  "Install" link**.
- Share that link/QR with testers. On the phone: open link → download APK →
  allow "install from unknown sources" when prompted → install.

### How versions & updates work

- **`version`** in app.json ("0.1.0") = the human-readable version;
  **`versionCode`** (managed remotely by EAS, `appVersionSource: remote` +
  `autoIncrement` on production) = Android's internal build number that must
  increase every release.
- **Native changes** (new native module, app.json plugin/icon/splash change,
  Expo SDK upgrade) ⇒ need a **new APK build** — testers install the new
  file over the old one (same package id + same keystore = clean upgrade,
  data preserved).
- **JS-only changes** (screens, logic, content, styling) can later ship
  **over-the-air with EAS Update** — testers just reopen the app, no
  reinstall. Not configured yet; it's the post-office-window fix pipeline
  (schedule Phase 4: "EAS build + OTA pipeline proven end-to-end").
- Rule of thumb for us: **rebuild APK when package.json gains a native
  dependency; everything else becomes OTA once EAS Update is set up.**

## B. Admin panel on Vercel

1. vercel.com → sign in with GitHub → **Add New… → Project** → import
   `Amratash-Baghel/BajrangVati-App`.
2. **Root Directory: `admin`** ← the one setting people miss. Framework
   auto-detects Next.js.
3. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — from admin/.env.local
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from admin/.env.local
   - `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`,
     `BUNNY_STREAM_CDN_HOST`, `BUNNY_STORAGE_ZONE`,
     `BUNNY_STORAGE_API_KEY`, `BUNNY_STORAGE_CDN_HOST` — leave unset until
     the Bunny account exists (paste-URL mode works meanwhile).
4. Deploy. The URL is public but the panel is gated by login +
   `admin_users` RLS. Every push to `main` auto-redeploys.

## C. What NOT to do

- Don't test the mobile app as a Vercel web deploy — audio, video,
  keep-awake, and gestures don't behave like real Android. The APK is the
  test surface.

## Reminders (pending one-time steps)

- Migrations **0008 and 0009** must be run in the Supabase SQL editor.
- Admin bootstrap: create an auth user + insert into `admin_users`
  (see docs/progress.md 2026-07-14 entry).
