# Stillnova — Store Listing Copy

Copy-paste ready text for the App Store and Google Play submissions. See `SHIPPING.md` for the step-by-step submission flow.

---

## App name
**Stillnova**

## Subtitle (App Store, 30 chars max)
`Calm, breathe & zodiac insight`

## Short description (Google Play, 80 chars max)
`Daily mindfulness, breathing timers, zodiac insights & calm — clear your mind.`

## Promotional text (App Store, 170 chars, updatable without review)
`Your daily moment of calm — AI-personalized reflections, breathing meditations, and a night sky that grows with every session. Breathe. Reflect. Bloom.`

---

## Full description (both stores, ~4000 chars max)

**Stillnova helps you clear your mind — one breath at a time.**

Stillnova blends AI-personalized daily guidance, calming breathing meditations, and a touch of the cosmic into one beautifully simple app. No noise, no clutter — just your daily moment of calm.

**🌙 Your personal daily guide**
Every day, Stillnova creates content made just for you: an inspiring quote, a personal affirmation, a zodiac insight, a practical stress-relief tip, and a small mindful task. Tell us your goal — better sleep, less stress, sharper focus, or simple curiosity — and your guidance adapts to it.

**🌬️ Breathe with intention**
Guided breathing meditations with a beautiful animated breathing circle, gentle haptics, and ambient soundscapes. Choose your rhythm:
• Box Breathing (4-4-4-4) for focus and calm
• 4-7-8 for falling asleep faster
• Deep Calm (5-2-5) for steady relaxation
Meditate for 2, 5, 10, or 20 minutes. After 9 PM, Stillnova gently shifts into a darker wind-down mode to help you rest.

**🌌 Watch your sky grow**
Every meditation lights a star in your personal night sky. Keep a 7-day streak and your stars connect into your own zodiac constellation. A quiet, gentle way to see your progress build over weeks and months.

**🔥 Stay consistent, gently**
Build streaks, earn XP, climb through calming Mind Ranks, and unlock achievements. Miss a day? A Stardust Shield can save your streak — because consistency should feel kind, not stressful. Daily challenges and a weekly reflection keep things fresh.

**✨ Simple, calming, yours**
• A clean "luxury spa meets space" design
• Works offline first; an optional free account backs up and syncs your progress
• Available in 7 languages: English, Romanian, Italian, French, Spanish, German, Portuguese
• Gentle daily reminders you control

Clear your mind. Every day. Download Stillnova and begin.

---

## Keywords (App Store, 100 chars total, comma-separated, no spaces)
`mindfulness,meditation,breathing,calm,sleep,anxiety,stress,zodiac,relax,focus,breathe,mood,wellness`

## Category
- Primary: **Health & Fitness**
- Secondary (App Store): **Lifestyle**

## Content rating
- Target audience: 13+
- No objectionable content. Zodiac content marked as entertainment.

---

## Data Safety (Google Play) / App Privacy (App Store) answers

The app is local-first, but it DOES use several services, so the form must reflect
them accurately (a false Data Safety declaration is a policy violation):

- **Google Gemini** (via a Cloudflare Worker proxy): daily content, Clara chat, guided meditations.
- **Supabase** (optional account): email + password sign-in and cloud backup/sync of your data.
- **PostHog** (optional analytics): anonymous product analytics, opt-out in Settings.
- **RevenueCat**: subscription purchases (Premium).
- **Cloudflare leaderboard**: your chosen display name + stats, tied to a random device id.
- **Photon (komoot)**: geocoding your birth place for the natal chart.

**Does the app collect or share user data?** Yes (see below).

| Data type | Collected | Shared with | Purpose | Linked to identity |
|---|---|---|---|---|
| Email address | Only if you create an account | Supabase (processor) | Account, backup/sync | Yes (account) |
| Name / display name | Yes | Gemini (content), Cloudflare leaderboard | Personalization, leaderboard | Leaderboard: to a random device id, not your identity |
| Birth details (date, time, place) | Only if you use numerology/chart | Gemini, Photon (geocoding) | App functionality | Account (if synced) |
| Messages to Clara | Yes | Gemini (processor) | App functionality | Account (if synced) |
| App activity (sessions, mood, streaks, XP) | Yes | Supabase (if signed in) | App functionality, backup | Account (if synced) |
| Device identifiers (random UUID) | Yes | PostHog, Cloudflare leaderboard | Analytics, leaderboard identity | No (random, not advertising id) |
| Purchase history | Yes | RevenueCat (processor) | Subscriptions | Yes |

- **No** data used for third-party advertising. **No** advertising IDs.
- Analytics are **opt-out** in Settings; events carry only the random device UUID.
- Data is **not** sold.
- **Deletion:** "Reset onboarding" erases all local data. Account deletion (Supabase) is
  handled in-app once shipped; until then, users can request account + cloud data deletion
  by emailing support. (Apple 5.1.1(v) / Google require in-app account deletion when accounts
  can be created — see TODO P0 #9.)

---

## Support & marketing URLs
- **Privacy Policy URL:** `https://pechi23.github.io/clarmind/privacy.html`
- **Terms URL:** `https://pechi23.github.io/clarmind/terms.html`
- **Support email:** `stillnova.support@gmail.com`
- **Marketing URL (optional):** the GitHub Pages landing page

---

## Screenshots to capture (on the emulator or a device)
Capture these 5–6 screens in order — they tell the story:
1. Home — daily guide with quote + affirmation + challenges
2. Breathe — the animated breathing circle mid-session
3. Sky — Constellation Sky with a few stars/constellations
4. Profile — rank, XP bar, achievements grid, heatmap
5. Leaderboard — streak rankings
6. (Optional) Weekly recap modal

**Sizes:**
- App Store: 6.7" iPhone → 1290 × 2796 px (required)
- Google Play: phone → min 1080 px on the short side; feature graphic 1024 × 500 px

Tip: use `adb exec-out screencap -p > shot.png` on the emulator, or the device screenshot, then frame with a tool like previewed.app if desired.
