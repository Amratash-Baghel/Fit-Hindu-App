# Google Play Console — Account Setup Runbook

> **Who this is for:** the person setting up our Google Play developer
> account. You do NOT need any technical/coding knowledge. Follow the steps
> in order. Where it says **STOP**, message Amratash before continuing.
>
> **Goal:** a verified **Google Play Console Organization account**, owned by
> Herbal Deck, with Amratash added as a user — ready to upload the app.
>
> **We are publishing on Google Play ONLY.** Apple / App Store is not in
> scope (decision 2026-07-12). Ignore anything about Apple.

---

## The one thing that matters most

**The D-U-N-S number is the bottleneck.** It can take up to **30 business
days** on the free track. Everything else takes days. **Start Step 1 today** —
before anything else. If we lose a week here, we lose a week on launch.

---

## Before you start — collect these (keep them in one folder)

| Item | Notes |
|---|---|
| **Certificate of Incorporation** | PDF/scan |
| **GST registration certificate** | PDF/scan — **the legal name here is the master copy** |
| **PAN card** (company) | PDF/scan |
| **Exact legal name** | Copy it **character-for-character from the GST certificate** (looks like "Herbal Deck Pvt. Ltd." — but confirm; do not type it from memory) |
| **Registered address** | Exactly as on the certificate (Palda, Indore, M.P. – 452001) |
| **Company website** | herbaldeck.com |
| **Company phone + email** | +91-8962421207 · support@herbaldeck.com |
| **A credit/debit card** | For the one-time **$25** (~₹2,100) Play fee |

> ⚠️ **The #1 reason these applications fail is a name mismatch.** The legal
> name must be **identical** everywhere — D-U-N-S, Play Console, payments
> profile. Not "Herbal Deck", not "HerbalDeck Private Limited" — exactly what
> the GST certificate says. Decide the exact spelling once, write it down,
> and copy-paste it every time.

---

## STEP 1 — Check if we ALREADY have a D-U-N-S number (do this first, 5 min)

Many companies already have one. If we do, **you just saved a month.**

1. Go to **https://www.dnb.com/en-us/smb/duns/duns-lookup.html**
2. Search our company name + India.
3. If a result matches our legal name and address → **note the 9-digit
   number** → **skip to Step 3.**
4. If nothing matches → continue to Step 2.

---

## STEP 2 — Apply for a D-U-N-S number (only if Step 1 found nothing)

1. Go to **https://www.dnb.co.in/duns/get-a-duns** (D&B India — the official
   source; do not use third-party agents).
2. Choose **"Get a D-U-N-S Number"** and fill the form with:
   legal business name (from GST cert), PAN, GST details, registered
   address, authorised contact person (name, company email, phone).
3. Submit. You'll get a reference/acknowledgement — **save it**.
4. **Timing:**
   - **Free / standard:** usually 10–15 business days, **can take up to 30**.
   - **Paid / expedited:** usually **5–7 business days**.
5. **STOP → message Amratash and the owner:** tell them the free vs paid
   timing and ask whether to pay for expedited. **Recommendation: pay for
   expedited** — the fee is small compared to losing 2–4 weeks of launch time.
6. D&B may **call or email to verify** details. **Answer quickly** — delays
   here are the main reason it stretches to 30 days. Check spam daily.
7. When the number arrives, **write it down and send it to Amratash.**

---

## STEP 3 — Create the company Google account

**Do NOT use your personal Gmail or the owner's personal Gmail.** This
account will own the app forever.

1. Create a **new Google account** using a **company email**
   (e.g. `app@herbaldeck.com` or similar — ask the owner which).
2. Turn on 2-step verification.
3. **Store the username + password in the company's password manager** (or
   hand them to the owner in writing). If this account is lost, we lose
   control of the app listing.

---

## STEP 4 — Register on Play Console as an **Organization** ($25)

1. Go to **https://play.google.com/console/signup** — sign in with the
   company Google account from Step 3.
2. When asked for account type, choose **Organization / Company** —
   **NOT "Personal / Individual".** This matters:
   - Personal accounts must run a closed test with **12 testers for 14
     straight days** before they can publish. Organization accounts don't.
   - Since **28 Jan 2026, individual accounts cannot publish Health &
     Fitness apps at all** — and ours is a Health & Fitness app. Organization
     is the only valid option for us.
3. Fill in:
   - **Organization legal name** — paste the exact GST name
   - **D-U-N-S number** — from Step 1/2
   - Address, phone, company website, company email
4. Pay the **$25 one-time registration fee**.

---

## STEP 5 — Complete verification

1. On the Play Console **Home** screen you'll see a verification prompt →
   click **Get started**.
2. You'll be asked to **link a payments profile** — this is how Google
   verifies our legal name, address, and D-U-N-S. Use the **same exact legal
   name and address** again.
   > This is only for identity verification. Our app is **free** and we sell
   > **physical products outside the app**, so we do **not** need a merchant
   > account and Google takes **no commission**.
3. Upload the documents Google asks for (incorporation / GST / PAN).
   The exact list for India is here:
   **https://support.google.com/googleplay/android-developer/answer/15633622?hl=en&co=GENIE.CountryCode%3DIN**
4. Verification usually completes in **~2–3 business days**.
5. If it's **rejected**, 9 times out of 10 it's a name/address mismatch. Fix
   it to match the GST certificate exactly and resubmit. **STOP → tell
   Amratash** if it's rejected twice.

---

## STEP 6 — Add Amratash as a user (do this as soon as the account exists)

Don't wait for verification to finish.

1. Play Console → left menu → **Users and permissions** → **Invite new user**
2. Email: **work.amratash@gmail.com**
3. Give **Admin** access (or at minimum: create/edit app, upload releases,
   manage testing, edit store listing).
4. Send the invite. He'll accept and handle the technical upload.

---

## STEP 7 — While you wait, collect the store listing material

Hand these to Amratash; they're needed the day we upload. Ask the design/
content team for the images.

| Asset | Requirement |
|---|---|
| **App name** | max 30 characters |
| **Short description** | max 80 characters |
| **Full description** | max 4,000 characters |
| **App icon** | 512 × 512 PNG |
| **Feature graphic** | 1024 × 500 PNG/JPG |
| **Phone screenshots** | **minimum 2**, up to 8 |
| **Category** | Health & Fitness |
| **Contact email / phone / website** | company details |
| **Privacy policy URL** | ⚠️ **must be a live page on herbaldeck.com** |

> ⚠️ **Privacy policy is a hard blocker** — Google will not let us publish
> without a working URL. Amratash/the owner are preparing the text; it must
> be published on the company website before submission.

---

## STEP 8 — Forms Amratash will complete (for your awareness, not your task)

Health & Fitness apps need extra declarations — Amratash handles these with
the app upload: **Data safety form**, **Health apps declaration**, **content
rating questionnaire**, **target audience**, **ads declaration**.

---

## Timeline (what blocks what)

| Step | Time | Blocks |
|---|---|---|
| 1. D-U-N-S lookup | 5 min | everything |
| 2. D-U-N-S application | **5–7 days (paid)** or **10–30 days (free)** | Play registration |
| 3. Google account | 15 min | can be done today, in parallel |
| 4. Play registration + $25 | 30 min | needs D-U-N-S |
| 5. Verification | 2–3 days | publishing |
| 6. Add Amratash | 5 min | do immediately after Step 4 |
| 7. Listing assets | ongoing | submission day |

**Net: the account can be ready ~1–2 weeks after the D-U-N-S arrives.**
Steps 1, 3, and 7 can all start **today**.

---

## Report back to Amratash at each of these points

- [ ] Result of the D-U-N-S lookup (found / not found)
- [ ] D-U-N-S applied — free or expedited? reference number?
- [ ] D-U-N-S number received (send the 9-digit number)
- [ ] Company Google account created (credentials stored where?)
- [ ] Play Console registered + $25 paid
- [ ] Amratash invited as user
- [ ] Verification approved (or rejected — with the exact error message)

---

## Sources

- Play Console required info: https://support.google.com/googleplay/android-developer/answer/13628312
- India verification documents: https://support.google.com/googleplay/android-developer/answer/15633622?hl=en&co=GENIE.CountryCode%3DIN
- D-U-N-S lookup: https://www.dnb.com/en-us/smb/duns/duns-lookup.html
- D-U-N-S India application: https://www.dnb.co.in/duns/get-a-duns
