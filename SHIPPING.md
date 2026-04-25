# Shipping ClarMind to the App Store & Play Store

> **Step-by-step guide for first-time publishers.** Follow top to bottom.
> Total time: ~3-4 hours of active work + 1-3 days of waiting on Apple/Google review.
> Total cost: **$99 (Apple, yearly) + $25 (Google, one-time) = $124**.

---

## Table of Contents

1. [Before You Start: Accounts & Tools](#1-before-you-start-accounts--tools)
2. [Pre-Flight Checklist](#2-pre-flight-checklist)
3. [Set Up EAS (Expo's Build Service)](#3-set-up-eas-expos-build-service)
4. [Test Builds (Internal Preview)](#4-test-builds-internal-preview)
5. [Android: Submit to Play Store](#5-android-submit-to-play-store)
6. [iOS: Submit to App Store](#6-ios-submit-to-app-store)
7. [After Submission](#7-after-submission)
8. [Updates & New Versions](#8-updates--new-versions)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Before You Start: Accounts & Tools

### Required accounts

| Account | Cost | Time to get | Link |
|---|---|---|---|
| **Apple Developer Program** | $99/year | 24-48h to activate | [developer.apple.com/programs](https://developer.apple.com/programs/) |
| **Google Play Console** | $25 one-time | Instant (after ID verification) | [play.google.com/console](https://play.google.com/console) |
| **Expo account** | Free | 1 minute | [expo.dev](https://expo.dev) |
| **Google AI Studio** (for Gemini API) | Free | 1 minute | [aistudio.google.com](https://aistudio.google.com) |

> **Start the Apple enrollment NOW** — it takes the longest. Google and Expo can be done in 5 min.

### Required tools (install on your PC)

```bash
# Check what you already have
node --version    # Need v18+
git --version     # Need any recent version

# Install EAS CLI (Expo Application Services)
npm install -g eas-cli

# Verify
eas --version
```

---

## 2. Pre-Flight Checklist

### 2.1 App icon (1024×1024 PNG)

The default Expo icon won't pass Apple review. You need:

- A **1024×1024 PNG** with no transparency, no rounded corners (iOS rounds it automatically)
- Replace these 4 files in `assets/`:
  - `icon.png` (1024×1024)
  - `adaptive-icon.png` (1024×1024, foreground for Android)
  - `splash-icon.png` (any size, displayed on splash screen)
  - `favicon.png` (48×48 for web)

**Easy way:** Use [icon.kitchen](https://icon.kitchen) or [appicon.co](https://appicon.co) — upload one design, get all sizes.

**Design prompt for AI:** *"Minimalist app icon for ClarMind, a meditation app. Deep purple/violet gradient background (#0f0c29 to #7c3aed). White lotus flower or simple crescent moon symbol in center. Modern, calm, premium feel. Square 1024x1024. No text."*

### 2.2 Splash screen

Replace `assets/splash-icon.png` with your branded splash image (transparent PNG with logo, ~1284×2778).

### 2.3 Privacy Policy (REQUIRED)

Both stores reject apps without a hosted privacy policy URL. Easiest options:

**Option A — Free generators:**
- [termly.io](https://termly.io) — generates free policy
- [freeprivacypolicy.com](https://www.freeprivacypolicy.com)

**Option B — Host on GitHub Pages (free):**
1. Create a repo `clarmind-legal`
2. Add a `privacy.md` file
3. Enable GitHub Pages in repo settings
4. URL becomes `https://yourusername.github.io/clarmind-legal/privacy`

**Required content for ClarMind specifically:**
- We collect: name, zodiac sign (stored locally on device only)
- We use Google Gemini API to generate daily content (data sent: name + zodiac + date)
- We do NOT collect or sell personal data
- AsyncStorage data stays on the user's device
- Notification permissions are optional

### 2.4 App Store assets you'll need to prepare

For **both stores**, you'll need:
- **App name:** `ClarMind`
- **Short description:** "Daily mindfulness, breathing, and zodiac insights for a clear mind."
- **Long description** (4000 chars max — write a paragraph about features)
- **Keywords:** mindfulness, meditation, breathing, zodiac, calm, sleep, anxiety, stress
- **Category:** Health & Fitness
- **Screenshots** (Apple needs 6.7" iPhone, Google needs phone): 2-8 screenshots
  - Use your actual phone or [previewed.app](https://previewed.app) for mockups
- **Promotional graphic** (Google only, 1024×500)

### 2.5 Final code check

```bash
cd C:\Users\User\Desktop\clarmind
npx expo-doctor          # All 17 checks must pass
npx tsc --noEmit         # No TypeScript errors
```

If anything fails, fix it before proceeding.

---

## 3. Set Up EAS (Expo's Build Service)

EAS builds your app in the cloud — **no Mac required for iOS**.

### 3.1 Login

```bash
cd C:\Users\User\Desktop\clarmind
eas login
```

(Opens browser, log in with your Expo account.)

### 3.2 Initialize the project

```bash
eas init
```

This:
- Creates an EAS project linked to your account
- Adds an `extra.eas.projectId` field to your `app.json`
- Commit this change to git

### 3.3 Configure environment variables on EAS

Your Gemini API key needs to be available on the EAS servers (since builds happen in the cloud, not locally):

```bash
eas env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value "your_actual_gemini_key" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value "your_actual_gemini_key" --environment preview --visibility plaintext
```

(Or use the EAS dashboard at expo.dev → your project → Environment Variables.)

### 3.4 Free vs paid EAS

- **Free tier:** 30 builds/month, slower queue (15-30 min wait)
- **Production tier:** $19/month, priority queue, unlimited builds

Free is fine for the first launch. Upgrade only if you build daily.

---

## 4. Test Builds (Internal Preview)

**Always test before submitting to the stores.** A preview build is a real APK/IPA you install on your phone.

### 4.1 Android preview (APK)

```bash
eas build -p android --profile preview
```

Wait ~15-25 min. When done:
- EAS gives you a download URL
- Open it on your Android phone → install the APK
- Verify everything works (especially: Gemini content loads, breathing session, soundscapes, notifications)

### 4.2 iOS preview (TestFlight)

```bash
eas build -p ios --profile preview
```

First time, EAS will:
1. Ask for your Apple ID credentials
2. Create signing certificates automatically
3. Register your test device

After build (~25-40 min):
1. Open the **TestFlight** app on iPhone
2. EAS uploads the build automatically (or run `eas submit -p ios --latest --profile preview`)
3. Wait ~5 min for Apple to process
4. Install via TestFlight → test everything

> **First-time iOS gotcha:** Apple will email you to verify the new build. Check your inbox.

---

## 5. Android: Submit to Play Store

### 5.1 Build the production AAB

```bash
eas build -p android --profile production
```

Wait ~15-25 min. EAS creates an `.aab` file (Android App Bundle — what Play Store wants).

### 5.2 Set up Play Console (one-time)

1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay $25 fee + verify ID (1-2 days for verification)
3. Create app:
   - Click **Create app**
   - App name: `ClarMind`
   - Default language: English
   - App or game: App
   - Free or paid: Free
   - Accept declarations

### 5.3 Fill out the store listing

In Play Console → your app → **Main store listing**:
- Short description (80 chars)
- Full description (4000 chars)
- App icon (512×512 — Play Store size, different from in-app)
- Phone screenshots (at least 2)
- Feature graphic (1024×500)
- Privacy policy URL ← from step 2.3

In **App content**:
- Privacy policy URL again
- Ads: No (unless you added AdMob)
- App access: All functionality available
- Content rating: Complete the questionnaire (will give you a rating)
- Target audience: 13+ (or whatever you set)
- Data safety: Disclose that name+zodiac are stored locally and sent to Gemini

### 5.4 Upload the build

In Play Console → **Production** (or **Internal testing** for first time):
1. Click **Create new release**
2. Drop the `.aab` file from EAS
3. Add release notes (e.g., "Initial release")
4. **Save** → **Review release** → **Start rollout**

> **Tip for first release:** Use **Internal testing** track first. Add yourself as a tester. Once you confirm everything works, promote to Production.

### 5.5 Easier: Use `eas submit`

Instead of manually uploading the AAB:

```bash
eas submit -p android --latest
```

Follow prompts. EAS uploads to Play Console for you.

### 5.6 Wait for review

Google's review usually takes **1-7 days** for first submissions. After approval, your app is live.

---

## 6. iOS: Submit to App Store

### 6.1 Build production IPA

```bash
eas build -p ios --profile production
```

Wait ~25-40 min.

### 6.2 Set up App Store Connect (one-time)

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps** → **+** → **New App**
3. Fill in:
   - Platform: iOS
   - Name: `ClarMind`
   - Primary language: English
   - Bundle ID: `com.clarmind.app` (must match `app.json`)
   - SKU: `clarmind-ios-001` (any unique string)
   - Full access: yes

### 6.3 Fill out the App Store listing

In App Store Connect → your app → **App Information**:
- Subtitle (30 chars)
- Category: Primary = Health & Fitness
- Privacy Policy URL ← from step 2.3

In **Pricing and Availability**:
- Price: Free (or set tiers)
- Available in all countries (or restrict)

In **App Privacy**:
- Click **Get Started** → answer the questionnaire honestly:
  - Data collected: Name (linked to user, used for app functionality)
  - Data NOT linked to user: zodiac, date
  - Used by Apple ID: No

In the version listing (e.g., **1.0**):
- Promotional text (170 chars, optional)
- Description (4000 chars)
- Keywords (100 chars total, comma-separated)
- Support URL (your GitHub repo or website)
- Screenshots (6.7" iPhone required: 1284×2778 or 1290×2796)
- App Review Information: your contact email + phone

### 6.4 Upload the build

```bash
eas submit -p ios --latest
```

(Or manually: download IPA from EAS → upload via Transporter app on a Mac. The CLI way is much easier.)

After upload, wait ~10-30 min for Apple to process the build. Then:
1. Refresh App Store Connect → **TestFlight** tab → confirm build appears
2. In your version listing, click **Build** → select the uploaded build

### 6.5 Submit for review

In App Store Connect → your version:
- Verify all fields filled
- Add release notes (for v1.0: "Initial release")
- Click **Add for Review** → **Submit for Review**

### 6.6 Wait for review

Apple's review usually takes **24-48 hours**. They may reject and send you specific issues — fix them and resubmit.

**Common rejection reasons:**
- Missing privacy policy → fix step 2.3
- App crashes on review device → test thoroughly with `eas build --profile preview` first
- Misleading description / screenshots → match exactly what app does
- "Sign in with Apple" missing → only required if you have other social logins (you don't)

---

## 7. After Submission

### Both stores
- You'll get an email when approved (or rejected with reasons)
- Once live, you'll have a public URL:
  - Play Store: `https://play.google.com/store/apps/details?id=com.clarmind.app`
  - App Store: `https://apps.apple.com/app/idXXXXXXX`

### Track installs
- **Play Console** → Statistics
- **App Store Connect** → Analytics

### Respond to reviews
Both stores let you reply to user reviews. Be friendly and quick — it boosts ratings.

---

## 8. Updates & New Versions

When you want to release a new version:

### 8.1 Bump the version

In `app.json`:
```json
"version": "1.0.1"
```

For Android, also bump `android.versionCode` (integer):
```json
"android": { "versionCode": 2 }
```

For iOS, `ios.buildNumber`:
```json
"ios": { "buildNumber": "2" }
```

(Or set `appVersionSource: "remote"` in `eas.json` and EAS auto-increments — already done in your config.)

### 8.2 Build & submit

```bash
git commit -am "release: v1.0.1"
eas build -p android --profile production --auto-submit
eas build -p ios --profile production --auto-submit
```

`--auto-submit` builds and immediately submits in one command.

### 8.3 OTA updates (instant, no review)

For JS-only changes (no native module changes), use `expo-updates`:

```bash
npx expo install expo-updates
eas update --branch production --message "Fix typo"
```

Users get the update next time they open the app — no store review needed. Cannot change native code via OTA.

---

## 9. Troubleshooting

### "Build failed: Could not resolve dependency"
Run `npx expo install --fix` then commit and rebuild.

### "Apple rejected: Missing Privacy Policy"
You skipped step 2.3. Host one and paste the URL in App Store Connect → App Privacy.

### "Google rejected: Data Safety form incomplete"
Play Console → App content → Data safety. Disclose:
- Personal info: Name (collected, stored on device, used for app functionality, optional)
- App activity: zodiac, meditation history (stored on device only)

### "Build crashed on review device"
- Test the preview build on YOUR device first
- Check `EXPO_PUBLIC_GEMINI_API_KEY` is set on EAS environment
- Make sure your Gemini API key is valid and not rate-limited

### "Cannot install APK on phone"
On Android: Enable **Install from unknown sources** in Settings → Apps → Special access.

### "EAS build is stuck in queue"
Free tier has slower queue. Wait or upgrade.

### Need to delete a release
You **cannot delete** a published version — only release a new one over it. Be careful.

---

## Quick Reference Cheatsheet

```bash
# First time setup
npm i -g eas-cli
eas login
eas init
eas env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value "..." --environment production

# Test builds
eas build -p android --profile preview      # APK
eas build -p ios --profile preview          # TestFlight

# Production builds + submit in one go
eas build -p android --profile production --auto-submit
eas build -p ios --profile production --auto-submit

# OTA updates (no review)
eas update --branch production --message "..."

# Check status
eas build:list
eas submit:list
```

---

## Estimated Timeline (from zero to live)

| Day | Task |
|---|---|
| **Day 1** | Apply for Apple Developer ($99) — wait 24-48h. Sign up Play Console ($25). Make icons. Write privacy policy. |
| **Day 2** | Apple approved. Run `eas init`. Build & test preview on Android + iOS. |
| **Day 3** | Build production. Fill out store listings. Submit to both stores. |
| **Day 4-7** | Apple reviews (1-2 days). Google reviews (1-7 days). |
| **Day 7-10** | Both apps live. 🎉 |

---

**Questions?** Open an issue at github.com/Pechi23/clarmind or check `CLAUDE.md` and `TODO.md` for project-specific docs.

Good luck shipping! 🚀
