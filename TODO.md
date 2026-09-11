# ClarMind — Roadmap, Architecture & Idea Bank

> **Handoff document.** Written so a fresh agent (or developer) can pick any item
> and implement it without prior context. Read `CLAUDE.md` first for conventions,
> then this file for *what to build next and how*.
> Update the Session Log at the bottom after every working session.

---

## 1. Architecture snapshot (current state)

**Local-first, zero-backend.** Everything persists in AsyncStorage under `clarmind_*` keys. The only network calls are to Gemini (daily content, Clara chat, weekly reflection — all language-aware). Soundscapes are procedurally-generated WAVs bundled in `assets/sounds/` (offline). Full EN/RO i18n via `src/i18n/`. See `CLAUDE.md` for the current file-by-file layout.

```
┌─────────────────────────────────────────────────────────────┐
│ App.tsx — fonts, splash, profile gate                       │
│   ├── OnboardingScreen (no profile yet)                     │
│   └── AppNavigator — bottom tabs, custom glass tab bar      │
│         ├── HomeScreen      daily AI content + challenges   │
│         ├── BreatheScreen   patterns, timer, soundscapes    │
│         ├── LeaderboardScreen  seeded fake users + you      │
│         └── ProfileScreen   rank, badges, heatmap, settings │
├─────────────────────────────────────────────────────────────┤
│ services/                                                   │
│   claude.ts        Gemini REST (gemini-2.0-flash), daily    │
│                    JSON content, cached 1/day               │
│   storage.ts       AsyncStorage CRUD: profile, content,     │
│                    streak, sessions, moods, prefs           │
│   gamification.ts  XP, levels, achievements, challenges     │
│   leaderboard.ts   date-seeded fake users                   │
│   soundscape.ts    expo-av loop player                      │
│   notifications.ts daily reminder scheduling                │
├─────────────────────────────────────────────────────────────┤
│ constants/  theme.ts (ALL design tokens) · zodiac.ts ·      │
│             breathing.ts · achievements.ts (XP, ranks)      │
│ components/ GradientCard · BreathingCircle · StreakBadge ·  │
│             ActivityHeatmap                                 │
└─────────────────────────────────────────────────────────────┘
```

**Key patterns an implementing agent must follow:**
- **Date-seeded determinism** — daily variation without a backend: seed `Math.sin`-style PRNG with `YYYYMMDD` (see `leaderboard.ts`, `gamification.ts getTodayChallenges`). Reuse this for any "changes daily" feature.
- **Screens refresh on tab focus** via `useFocusEffect` (navigation keeps tabs mounted).
- **Native APIs guarded** with `Platform.OS !== 'web'` (haptics, notifications, audio).
- **All colors/spacing from `theme.ts`** — never hardcode. Gradient arrays must be `as const` (tuple types).
- **XP flows through `gamification.ts` only** — never write `clarmind_xp_total` directly.
- After native module installs: `npx expo install --fix`, restart Metro with `--clear`.

**Data model (types/index.ts):** `UserProfile { name, zodiacSign, onboardingComplete }` · `DailyContent` (6 AI fields + generatedAt) · `MeditationSession { date, durationMinutes, pattern, completedAt }` · `MoodEntry { date, mood 1-5, context }`.

---

## 2. Shipped

### v1.0 — Core (2026-04-25)
Onboarding (name + zodiac, RO names) · Home with 5 AI daily cards (Gemini, cached 1/day, 429 handling) · Breathe (3 patterns, animated circle, haptics, 5 soundscapes, wind-down mode after 21:00, mood check-in) · Leaderboard (streak/time tabs, seeded fakes, gold highlight) · Profile (stats, 30-day heatmap, reminder toggle, reset) · custom tab bar · EAS config · docs (CLAUDE.md, README.md, SHIPPING.md).

### v1.1 — Gamification (2026-06-13)
Persisted XP economy (+10/min session, +10 daily open, +15 guide read, +25/challenge, +50 perfect day, +5 mood) · 13 named Mind Ranks with XP curve · 16 achievements with auto-unlock + celebration cards · 3 date-seeded daily challenges with session auto-completion · level chip + XP toast on Home · rank card with progress bar + badge grid on Profile · full reset wipes all keys. Design rationale in `IMPROVEMENTS.md`.

### v1.2 — Retention sprint (2026-06-26)
**🌌 Constellation Sky** (new tab): one star per session, 7 consecutive days form the user's zodiac constellation (12 hand-tuned SVG shapes), active-streak stars glow brighter, empty-state + "days to next constellation" hint. Pure `react-native-svg`, derived entirely from `MeditationSession[]` — no new storage. · **Stardust Shield streak freeze**: earn 1 shield per 7-day streak (max 2), auto-consume on a single missed day so streak survives, shield chip on Home + toast messaging. · **Onboarding goal quiz** (step 3): Sleep/Stress/Focus/Curiosity, stored on profile, injected into the Gemini daily-content prompt. · **Personalized notifications**: copy references streak count + rank name. · **Reminder time picker**: 5 preset chips in Profile, persisted, reschedules live. · soundscape now stored per session (sound-bather achievement honest).

---

## 3. Implementation queue (priority order)

### P0 — Ship blockers (do before store submission)
| # | Task | Implementation notes |
|---|---|---|
| 0.1 | **App icon + splash** | Replace `assets/icon.png` (1024², no transparency), `adaptive-icon.png`, `splash-icon.png`. Design prompt in SHIPPING.md §2.1 |
| 0.2 | **Bundle soundscapes locally** | Download 5 CC0 loops → `assets/sounds/`, switch `soundscape.ts` URLs to `require(...)`. Kills CDN dependency + enables offline |
| 0.3 | **Privacy policy URL** | SHIPPING.md §2.3. Host on GitHub Pages |
| 0.4 | **EAS init + preview builds** | `eas init`, set `EXPO_PUBLIC_GEMINI_API_KEY` via `eas env:create`, build preview APK + TestFlight |
| 0.5 | ✅ **Reminder time picker** | DONE v1.2 — 5 preset chips in Profile, persisted to `clarmind_reminder_time`, reschedules live |

### P1 — Retention loop (the "make it the best" sprint)

| # | Feature | Why + how |
|---|---|---|
| 1.1 | ✅ **🌌 Constellation Sky** | DONE v1.2 — new tab, one star/session, 7-day runs form zodiac constellations, active stars glow. `ConstellationSky.tsx` + `constants/constellations.ts`. Premium skins still open for v2 |
| 1.2 | ✅ **Streak freeze ("Stardust Shield")** | DONE v1.2 — 1 shield/7-day streak (max 2), auto-consumed on single missed day, chip on Home |
| 1.3 | ✅ **Weekly recap card** | DONE v1.3 — once-per-ISO-week modal with this-vs-last-week minutes/sessions/active-days/mood deltas + Gemini reflection (offline fallback). `weeklyRecapLogic.ts` + `WeeklyRecapModal.tsx`. Share-image still open for P4 |
| 1.4 | ✅ **Smarter notification copy** | DONE v1.2 — `buildPersonalizedMessage()` references streak + rank, mixed with generic pool |
| 1.5 | ✅ **Onboarding goal quiz** | DONE v1.2 — step 3 Sleep/Stress/Focus/Curiosity, injected into Gemini prompt via `GOAL_CONTEXT` |

### P1.6 — UX & wording backlog (George feedback, 2026-09-01)
Small-to-medium polish + a few features. Faithful to how George wrote them, with impl pointers.

| # | Item (as requested) | Notes / where |
|---|---|---|
| a | ✅ **App name international** | DECIDED — keep **ClarMind**. Verified AstroMind/ClearMind are heavily taken; the distinctive spelling reads as a coined brand internationally. |
| b | **Home: "Citatul zilei" (Quote of the day) = the FIRST card** | Reorder `HomeScreen.tsx` so the daily quote is card #1. |
| c | **Rename "Afirmația de azi" → "Obiectivul de azi" / "Targetul de azi"** | i18n `home.*` (+ maybe reframe the affirmation as a daily objective). |
| d | **Challenges info pop-up** | Add an (i) button on "Provocările de azi" opening a modal explaining challenges/XP. `HomeScreen.tsx`. |
| e | **"Zodia ta azi" → "Horoscopul zilnic"; MOVE to the top of Home** | Make birth **date/time/place optional** with a note that it personalizes the horoscope, editable later. Reuses numerology/birth data. |
| f | ⏸️ **Scroll past the bottom → jump to the next navbar tab** | DEFERRED (UX risk) — hijacking over-scroll to switch tabs fights the natural "I've hit the end" gesture and misfires on momentum scroll. Safer alternative if wanted: horizontal swipe between tabs (react-navigation material-top / gesture). Left as-is for now. |
| g | **Breathe tab: show the meditation title** | Replace the fixed "Găsește-ți calmul" header with the selected pattern's title. `BreatheScreen.tsx`. |
| h | **Leaderboard ranked by XP** | Add/switch an XP ranking (currently streak/minutes). `LeaderboardScreen.tsx` + `leaderboard.ts`. |
| i | ✅ **Separate Profile from Settings** | DONE — Settings live in a gear-opened modal (language, reminder, premium-testing toggle, reset); Profile shows identity/rank/stats. |
| j | **Share progress → include App Store / Play Store link** | Append the store link to the shared card/text. `ShareCardModal.tsx` (link TBD until published). |
| k | **More languages** (English, Italian, French, Spanish, …) | Add dictionaries in `src/i18n/` beyond EN/RO; the i18n parity test enforces full key coverage. |
| l | **Custom hour field** ("la moment" — pick your own hour) | Let the user type/pick an exact hour instead of only presets (reminder time → native time picker). `ProfileScreen.tsx`. |
| m | **Session: fix the "Termină" (End) button layout** | `BreatheScreen.tsx` session mode. |
| n | **Session: add a Pause / Resume button** | Pause the timers + soundscape and resume. `BreatheScreen.tsx`. |
| o | ✅ **Resume an abandoned session** | DONE — in-progress session state persists (`InProgressSession`); Breathe offers to resume a session left mid-way. |
| p | **Session End button — fix specifically on Android** | The "Termină" button placement/layout on Android session mode. `BreatheScreen.tsx`. |
| q | ✅ **Rename the Clara "AI" badge** | DONE — the floating button's pill now reads "Clara" instead of "AI". `FloatingClara.tsx`. |
| r | ✅ **Microphone / voice input for Clara** | DONE — mic button in Clara's input bar. Native: `expo-speech-recognition@3.1.3`. Web: browser Web Speech API (`services/speechRecognition.web.ts`); button hides where unsupported. |
| s | **Notification permission on first entry** | On first launch ask for notification permission (or let the user enable it from settings). Ties into `notifications.ts` + onboarding. |
| t | ✅ **Landing / presentation site + web app** | DONE — `landing/index.html` marketing page; **web app** via React Native Web (`npm run build:web` → `dist/`), verified end-to-end in-browser. Deploy: `WEB.md` + `.github/workflows/deploy-web.yml` (GitHub Pages). Native-only modules degrade gracefully (see `WEB.md` matrix). |

### P2 — Content depth
| # | Feature | Notes |
|---|---|---|
| 2.1 | ✅ **"Clara" — AI companion chat** | DONE v1.4 — floating 🌙 button on Home → full chat screen (Gemini w/ systemInstruction, warm-coach persona + crisis safety guardrail, 20 msgs/day). Rolling transcript in AsyncStorage, offline fallback lines. `services/clara.ts` + `ClaraScreen.tsx` |
| 2.2 | ✅ **7-day micro-courses** | DONE v1.6 — 3 programs, calendar-gated day unlock, AI day content (cached, offline fallback), CoursesScreen + Home entry. `courseLogic.ts` (13 tests) + `services/courses.ts` |
| 2.3 | ✅ **Mood-aware sessions** | DONE v1.5 — `suggestSession()` recommends pattern+duration from recent mood + time; tappable localized banner on Breathe; 6 tests. (Post-vs-pre mood delta on completion still open.) |
| 2.4 | ✅ **Evening reflection journal** | DONE v1.6 — after 20:00 Home shows a seeded localized question + text input, saved locally (`reflectionLogic.ts` + `ReflectionCard.tsx`, 6 tests) |
| 2.5 | ✅ **Sound mixer** | DONE v1.6 — multi-select soundscape layers with per-layer volume sliders; `soundscapeMixer.ts` (pure, 11 tests) + layered expo-av player (syncMix/stopMix/fadeOutMix) |
| 2.6 | ✅ **Romanian localization** | DONE v1.5 — full en/ro i18n (`src/i18n/`), EN/RO switcher in onboarding + Profile, expo-localization default, every screen localized incl. content (patterns/soundscapes/challenges/achievements/ranks/elements), AI (daily content, Clara, weekly reflection) responds in the chosen language |
| 2.7 | ✅ **Seasonal events** | DONE v1.6 — full moon (accurate lunar calc) + solstices/equinoxes + New Year themed banner on Home (`seasonalEvents.ts`, 10 tests) |
| 2.8 | ✅ **Daily numerology + Destiny Matrix + Ascendant** | DONE 2026-09-01 — birth details (name, gender, date/time via native pickers, birth locality+country), Life Path/Expression/Soul Urge/Personality, interactive Destiny Matrix (octagram, 22 arcana, age timeline), 7-chakra energy map, approximate Ascendant from birth time, daily AI reading. `services/numerology.ts` + `destinyMatrix.ts` + `ascendant.ts` + `numerologyReading.ts`, `NumerologyScreen.tsx`. **→ becomes premium (see P3).** |
| 2.9 | 🔭 **Birth chart (natal chart)** — NEW, premium | Full natal chart from birth date + **exact time + birth place**. Reference for scope/output: https://astro.cafeastrology.com/natal.php. Needs geocoding the birth city → lat/long (offline city dataset, or a one-time API result cached on the profile), then compute an **exact Ascendant** (replacing the current time-only approximation in `ascendant.ts`) + Sun/Moon/planet placements + houses. Render a wheel chart (react-native-svg, like `DestinyMatrixChart`). Pair with numerology under a combined "Cosmic"/astrology section. This is the "exact result" the ascendant hint now promises. |
| 2.10 | ✅ 🎙️ **AI-guided voice meditation — PREMIUM** (DONE 2026-09-08) | Shipped: `guidedMeditation.ts` (AI script via `ai.ts` + offline fallback, 8 tests), `GuidedMeditationScreen` (4 voice avatars Luna/Sol/Aria/Terra, focus + length, generate → expo-speech reads line-by-line with pauses over a pulsing orb, pause/resume/end), premium-gated (paywall for free users), entry card on Breathe. Verified live on web. Audio quality to confirm on-device. Original spec: A guided meditation the app **writes with AI and reads aloud in a calm voice**, with **multiple voice avatars** to choose from. Locked behind premium (`isPremium()` / `isFeatureLocked`; free users get a preview or the paywall). **Script:** generate via the `services/ai.ts` gateway — prompt for a spoken guided meditation of the chosen length (e.g. 3/5/10 min), personalised to the user's goal + mood + optionally the day's Cosmic Energy / moon; return timed segments/lines (with pause hints) rather than one blob. Cache per (goal,duration,day) like other AI content; offline fallback script. **Voice:** read it with **`expo-speech`** (already used in Clara) at a slow, calm rate + gentle pitch, pausing between lines (chain utterances / use `onDone`); on web use the Web Speech API (works). **Avatars:** a small set of named voice personas (e.g. "Luna", "Sol", "Aria") — each maps to a voice (via `Speech.getAvailableVoicesAsync()` per language, or persona-tuned rate/pitch) + an avatar image; store the chosen avatar in prefs. **UX:** a new "Guided" entry (in Breathe, or its own screen) → pick avatar + focus + duration → generate → play over the breathing visuals, with pause/resume (reuse the session controls) and the soundscape mixer underneath. Counts toward the AI usage quota. Ties into P3 monetization as a headline paid feature. |

### P3 — Monetization (FREEMIUM model — decided 2026-09-01)

**The app is freemium.** Free forever: meditations, XP, streaks, daily content, basic horoscope. Paid unlocks the AI-heavy + astrology-depth features and a higher usage quota.

**Subscription: $5/month** (single tier for now; annual TBD).

**Free-tier daily limits:**
- **Clara chat: 3 messages/day** (currently `CLARA_DAILY_LIMIT` in `services/clara.ts` = 20 — lower to 3, gate the rest behind the paywall).
- **Numerology + Birth chart: premium** (behind the paywall).

**Paid tier:**
- Clara + AI features: **daily request quota, Claude-style (~50 requests/day)**, surfaced as a **usage meter** (like Claude's usage screen) so the user sees requests used / remaining + reset time.
- Full numerology + birth chart unlocked.

**⚠️ Testing bypass — build this FIRST (needed now):** a single flag that unlocks everything and skips the paywall so we can keep testing without payments while the model is still being finalized. Suggest `clarmind_premium_override` in AsyncStorage (toggle in Profile dev section) **or** a build-time `EXPO_PUBLIC_PREMIUM_BYPASS=1`. `entitlements.ts` must treat this as "premium, unlimited".

**Implementation sketch:**
- RevenueCat (`react-native-purchases`) for the $5/mo subscription (needs a dev build — not in Expo Go).
- `services/entitlements.ts` resolves the current tier (`free` / `premium` / `testing-override`) and exposes `canUseClara()`, `remainingRequests()`, `isPremiumFeature('numerology'|'birthchart')`.
- Generalize the Clara daily counter into an AI-usage store `clarmind_ai_usage_{date}` covering ALL AI calls (daily content, Clara, numerology reading, courses, birth chart).
- Paywall moments: tap a locked numerology/birth-chart card, Clara's 4th message of the day, usage-limit reached.
- **Usage screen (like Claude):** a "Usage" card in Profile showing today's AI requests used / remaining + reset time.

### P4 — Social & platform
- ✅ **Share cards** — DONE v1.6: `ShareCardModal` captures a branded rank/streak/minutes/stars card via `react-native-view-shot` and shares it through `expo-sharing`'s OS sheet. "Share my progress" button in Profile.
- ✅ **Real leaderboard** — DONE 2026-09-09 via a free **Cloudflare Worker + D1** (`leaderboard-worker/`), anonymous per-device id. (A backend for **friends / cross-device accounts** is still open — could extend the same Worker/D1, or Supabase.)
- Home-screen widgets (streak + quote) — needs dev-build, `expo-apple-targets` / Glance.
- Watch companions (breathe haptics on wrist).

### P5 — Product analytics & release strategy (NOT YET — George, 2026-09-09; noted only, do not implement)
- 📊 **Product analytics / usage monitoring** — ✅ **DONE 2026-09-10.** `services/analytics.ts` — a dependency-free fetch wrapper over PostHog's capture API (no-op until `EXPO_PUBLIC_POSTHOG_KEY` set; EU host default), anonymous device id only, in-app opt-out (Settings), Privacy Policy updated. Events tagged with app **variant** for the A/B. Instrumented: app_open, screen_view, onboarding_complete, session_complete, guided_meditation_start, clara_message, paywall_view, purchase_start, mood_checkin, share. **To activate:** George creates a PostHog project → put the `phc_...` key in `.env` + a GitHub Actions variable. (3 tests.)
- 🆎 **Two-app A/B release** (George's plan) — ship **two identical apps from one codebase**: a **free** one and a **one-time-paid** one, and compare which performs better and why (installs → retention → revenue → reviews). ✅ **Variant flag DONE 2026-09-10:** `EXPO_PUBLIC_APP_VARIANT=paid` → `constants/appVariant.ts`; `isPremium()` unlocks everything in the paid build, `app.config.js` gives it a distinct name + `.pro` bundle id, and the testing toggle hides (5 tests). **Still to do:** (a) tag analytics events with the variant (needs analytics above), (b) actually build/submit the two listings, (c) for the paid app decide paid-app vs one-time IAP. ⚠️ Reminder: **Apple often rejects two near-duplicate apps (guideline 4.3)** — a safer A/B is one app + store-level pricing/listing experiments or a remote feature-flag; discuss before building two.
- 🌍 **International languages for the release** — the two apps target **EN / FR / DE / ES / IT (+ maybe PT)**; currently we have EN/RO/IT/FR/ES. **TODO: add German (`de`) + Portuguese (`pt`)** dictionaries (deep-partial, English fallback, like it/fr/es). Romanian stays for the RO market / drops from the international listings.
- ⚖️ **Legal: Terms & Conditions + Privacy Policy** — ✅ **MOSTLY DONE 2026-09-10.** Written, styled, hosted & linked in-app. Live: https://pechi23.github.io/clarmind/privacy.html + `/terms.html` (`public/*.html`, copied into the deploy by `web-postbuild.js`); "Legal" section in Profile→Settings links both. **Still to do before store submission:** (1) fill the **contact-email** placeholder in both pages, (2) confirm the **governing-law** choice in Terms, (3) a **qualified/lawyer review** (GDPR + EU release). Original scope for reference:
  - **Terms & Conditions / EULA — does NOT exist yet.** Write one (custom is recommended over Apple's standard EULA because we have purchases + AI + astrology): usage terms, one-time-purchase/subscription + refund terms, **"astrology & readings are for entertainment," "not medical / mental-health / professional advice"** (crisis line note), AI-generated-content notice, limitation of liability, governing law.
  - **Privacy Policy — exists (`legal/privacy-policy.md` + `legal/index.html`) but must be updated** for the current data flows: Gemini via the **Cloudflare proxy**, the **Cloudflare D1 leaderboard** (anonymous device id, name/sign/stats shared), **RevenueCat**, geocoding (Nominatim), and **analytics if added** (P5). Note it's local-first (data stays on device except the above).
  - **Host both** as public URLs — easiest on the existing GitHub Pages site (e.g. `/clarmind/privacy` + `/clarmind/terms`, add to `scripts/web-postbuild.js` or a static route).
  - **Surface in-app** — a "Legal" section in Profile → Settings linking Privacy + Terms (app currently links neither), and show/accept at onboarding + at purchase. Consolidate the existing inline disclaimers (Clara "not a substitute for professional care," numerology "for reflection/entertainment") to point here.
  - ⚠️ **Have the final Terms + Privacy reviewed by a qualified person / lawyer before public launch** — what we generate are solid templates, not legal advice; a quick professional check (esp. GDPR + purchase/refund terms for the EU release) before submitting to the stores.

---

## 4. Idea bank (unprioritized, for inspiration)
- **Haptic-only mode** — phone face down, breathing guided purely by vibration pattern. (Largely covered now: the per-phase haptic cues already vibrate distinctly for inhale/hold/exhale, so a session can be followed eyes-closed. A dedicated "screen-off" mode is still open.)
- ✅ **Breath calibration** — DONE 2026-09-10 — "🫁 Calibrate to my breath" on Breathe opens a modal where you tap along your natural inhale/exhale for a few breaths; the app scales every pattern to your pace while preserving its proportions (4-7-8 stays 4-7-8-shaped). Persisted as a single multiplier (`getBreathCalibration`). `services/breathCalibration.ts` (10 tests) + `BreathCalibrationModal`, 7 languages.
- ✅ **"The world is breathing" counter** — DONE 2026-09-05 — live "🌍 {n} minds breathing right now" on Breathe (smooth time-of-day rhythm + seeded jitter, refreshes every 4s). `services/breathingNow.ts` (6 tests).
- ✅ **Zodiac energy meter** ("Cosmic Energy") — DONE 2026-09-05 — daily seeded 1–10 gauge for the user's sign with 3 facets (Vitality/Clarity/Harmony) on Home. `services/cosmicEnergy.ts` (10 tests) + `CosmicEnergyCard`. (Feeding it into the AI message still open.)
- ✅ **Sleep timer auto-fade** — DONE 2026-09-10 — "Fade sounds to sleep" toggle in Settings; after a session the soundscape fades over ~90s (`getSleepFade`).
- **App shortcuts / quick actions** — long-press icon → "2-min breather" straight into a session. (Needs a native config plugin — still open.)
- ✅ **Mood → music** — DONE 2026-09-10 — the mood/time session suggestion pre-selects a fitting soundscape (night→rain, low→ocean, high→forest) when you tap "Use this".

### From George's "MindSpace" brainstorm (Aug 2025) — DONE 2026-09-09
Most of that brainstorm ClarMind already had; these were the genuinely-new ones, now shipped:
- ✅ 🎙️ **Voice mood scan** — `moodScan.ts` (5 tests) + `VoiceMoodScan` modal on Breathe: speak/type how you feel → Gemini infers a 1–5 mood (logged → feeds the trend), replies warmly, suggests a breathing pattern. Mic reuses the speechRecognition wrapper (Web Speech on web).
- ✅ 🧠 **AI pattern insights** — `insights.ts` (6 tests) + `InsightsCard` on Profile: weekly-cached Gemini observation from sessions + moods ("you're calmest after evening sessions"); gentle fallback offline.
- ✅ 📈 **Mood trends** — `moodTrend.ts` (7 tests) + `MoodTrendCard` on Profile: daily-average mood over 14 days (SVG line + trend label).
- ✅ 🎲 **Intuition mini-game** — `intuition.ts` (5 tests) + `IntuitionGame` modal on Sky: "sense the hidden star," playful hit streak.
- ✅ 🔔 **Per-phase breathing cues** — the per-phase haptic is now distinct per phase (inhale/hold/exhale) and toggleable in Settings (`getPhaseCues`).
- ✅ 💾 **Export / import progress (.json)** — `backup.ts` (5 tests): dump/restore all `clarmind_*` data via clipboard, in Profile → Settings.
- ⏸️ *(off-theme, note only)* **Zen planner / to-do with mindful breaks** — productivity planner is a scope shift away from mindfulness+astrology; a lighter fit would be daytime "mindful break" reminders, not a full task manager.

---

## 5. Known issues / tech debt
- **Do NOT add `@babel/plugin-transform-*` private-field plugins with `loose:true`** — they were tried to work around the local Windows hermesc export failure, but `loose` mode caused a real runtime crash in Expo Go: `TypeError: Cannot assign to read-only property 'NONE'` on startup. Reverted; `babel.config.js` is just `babel-preset-expo` + the reanimated plugin. (Caught only by a live Expo Go smoke test — tsc/jest/`expo export` all passed.)
- **Local `expo export` Hermes step fails on Windows** — the bundled `sdks/hermesc/win64-bin/hermesc.exe` is an old DEBUG build (LLVM 8.0.0svn) that rejects modern syntax (private fields). The **JS bundle itself is valid** (a `jsEngine: jsc` export produces a complete ~2.7MB bundle) and the app **runs fine in Expo Go** (its own Hermes runs the JS directly, no bytecode precompile). **EAS Build compiles Hermes server-side with the correct toolchain**, so this does not affect real builds. To sanity-check the JS bundle locally, temporarily set `"jsEngine": "jsc"` in app.json and run `npx expo export --platform android`.
- **Runtime smoke test** (highest-signal local check): boot the emulator, `npx expo start` (plain, no `--android`), `adb reverse tcp:8081 tcp:8081`, then `adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent`; screenshot with `adb exec-out screencap -p > shot.png`. Bypasses the interactive Expo Go upgrade prompt that `--android`/`CI=1` choke on.
- Expo Go SDK-54 dropped remote push notifications — reminder toggle is a no-op in Expo Go; works in dev/production builds. Non-blocking.
- `expo start --android` can hit interactive prompts (port busy, Expo Go version upgrade) in non-interactive shells — run in a real terminal, or pre-install matching Expo Go.
- TypeScript strict mode on for app code; tests excluded from tsc. `npm test` = 84 tests / 9 suites (pure logic + AsyncStorage-mocked integration).
- Soundscapes are procedurally-generated WAVs (`scripts/generate-sounds.js`). Fine for launch; could be swapped for higher-fidelity recordings later.

### On-device testing feedback — George, 2026-09-10/11 (from the arm64 APK, real phone)
1. ✅ **Onboarding "Choose your language" doesn't scroll** — DONE 2026-09-11 — step 0 wrapped in a `ScrollView` (`stepScroll` contentContainer) so all 7 languages are reachable on any screen size.
2. ✅ **Name input box not visible / keyboard covers it** — DONE 2026-09-11 — step 1 restructured into a `ScrollView` (`keyboardShouldPersistTaps="handled"`) with the name field moved directly under the header (top of screen) instead of anchored to the bottom, so the Android keyboard can't cover it. (Same root cause as the general "keyboard covers text" report.)
3. ✅ **How to unlock premium for testing** — ANSWERED: **Profile → Settings → "Premium (testing)"** toggle. Hidden in the paid variant.
4. ✅ **Robotic AI voice → natural female voice** — DONE 2026-09-11 — `services/voiceSelect.ts` (pure, 7 tests) scores available voices (female-name hints, enhanced/neural/network quality, exact-locale match); `services/voice.ts` resolves+caches the best female voice per locale and `speakCalm()` speaks with pitch 1.0 (a raised pitch is what sounded robotic). Wired into Clara + guided meditation. NOTE: on-device TTS quality varies; true Gemini/ElevenLabs-grade neural voice would need cloud TTS (future — a bigger infra add).

### On-device requests — George, 2026-09-11
5. ✅ **Regenerate AI text when language changes** — DONE — daily content now stamps its `language`; HomeScreen regenerates when it differs from the current app language (numerology reading already cached per-language). Captions were already reactive.
6. ✅ **Limit language switches** — DONE — `services/languageLimit.ts` (pure, 6 tests): max 3/day + 15-min cooldown; Settings shows an explaining alert when blocked. (Onboarding's first pick is exempt.)
7. ✅ **City & country as selects (worldwide)** — DONE — **Country**: offline searchable picker (`constants/countries.ts`, ~195 ISO countries, derived flag emoji) → `CountryPicker`. **City**: `CityAutocomplete` typeahead backed by OpenStreetMap **Nominatim** (the geocoder already in use), biased to the chosen country. A true "dropdown of every city on Earth" isn't feasible (millions), so this is the standard autocomplete other apps use. Wired into the Numerology birth-details form.
8. ⏳ **Android keyboard covering text (general)** — the onboarding + birth-details cases are fixed via #2/#7 (inputs no longer bottom-anchored; birth city/country are now selects/typeahead). `app.json` stays `softwareKeyboardLayoutMode: "pan"`. If other screens still show the keyboard covering an input, consider `react-native-keyboard-controller` — left as follow-up only if reported.
9. ✅ **AI voice + female/male choice** — DONE 2026-09-11 — Settings has an "AI voice" female/male picker (`getVoiceGender`); voiceSelect now scores by chosen gender and prefers enhanced/neural/siri/network quality (what stops it sounding robotic). NOTE STILL OPEN: on-device TTS is not truly neural. George wants Siri/English-accent quality, which needs cloud TTS (proxy the request, stream returned audio). Follow-up.
10. ✅ **Confirm before changing language** — DONE 2026-09-11 — Settings shows an "Change language?" confirm dialog (with remaining-changes-today count) before switching.
11. ✅ **City-select bug** — DONE 2026-09-11 — `placeSearch.ts` built the query with `URLSearchParams`, which is unreliable in React Native/Hermes; switched to manual `encodeURIComponent` like `geocode.ts`.
12. ✅ **Rate-limit rule tweak** — DONE 2026-09-11 — first 2 language changes are back to back (no cooldown); the 15-min cooldown now only gates the 3rd (last) change of the day.
13. ✅ **No dashes / do not look AI** — DONE 2026-09-11 — hard rule added to `CLAUDE.md`; swept em/en dashes from `i18n/en.ts` + `ro.ts`. STILL OPEN: sweep the other 5 locale files (it/fr/es/de/pt) on their next edit.

---

## 6. Session log

| Date | Focus | Outcome |
|---|---|---|
| 2026-04-25 | Scaffold | Onboarding, Home, Gemini (switched from Claude to free tier) |
| 2026-04-25 | Feature build | Breathe, Leaderboard, Profile, navigation, soundscapes, notifications, heatmap |
| 2026-04-25 | Ship prep | EAS config, CLAUDE.md, README.md, SHIPPING.md; 17/17 expo-doctor |
| 2026-06-13 | Gamification v1.1 | XP/ranks/achievements/challenges live; IMPROVEMENTS.md; emulator smoke test |
| 2026-06-13 | Handoff doc | This file rewritten as architecture + prioritized implementation queue for next agent |
| 2026-06-26 | Retention v1.2 | Constellation Sky tab, Stardust Shield streak freeze, onboarding goal quiz, personalized notifications, reminder time picker, per-session soundscape tracking; tsc clean |
| 2026-06-27 | Test harness | Extracted pure logic (streakLogic, skyLogic, challengeLogic); Jest + ts-jest; 43 unit tests across 5 suites, all green; `npm test` / `npm run typecheck` scripts |
| 2026-06-27 | Weekly Recap (v1.3) | Once-per-week recap modal with this-vs-last-week deltas + Gemini reflection (offline fallback); weeklyRecapLogic + 11 tests (caught a real getMondayKey timezone bug); 54 tests total |
| 2026-06-27 | Deploy assets + Clara + audio fix (v1.4) | Branded icon/splash (sharp); privacy/terms/store copy; loading skeleton; Clara AI chat; bundled real ambient audio (URLs were 403); bells + fade; build-integrity fixes (babel-preset-expo, private-field lowering); 84-test data-layer suite |
| 2026-06-27 | Romanian i18n + mood suggestion (v1.5) | Full EN/RO localization across every screen + content + AI; language switcher; mood-aware session suggestion; 90 tests / 10 suites; production bundle verified |
| 2026-06-27 | Live emulator smoke test + 2 critical fixes | Ran the app end-to-end in Expo Go — caught two bugs that tsc/jest/bundle all passed: (1) `loose:true` babel plugins crashed startup (`Cannot assign to read-only property 'NONE'`) — reverted; (2) Gemini `2.0-flash` model 404'd (dead) so daily content never loaded — updated to `3.6-flash` + raised token limits for the thinking model. Also fixed babel-preset-expo pinned to wrong v57. Verified working: onboarding→Home, AI quote+affirmation+challenges, gamification, 5 tabs. 102 tests / 11 suites. |
| 2026-08-24 | P2 content-depth complete (v1.6) | Seasonal events banner, evening reflection journal, sound mixer (layers + volume sliders), 7-day micro-courses. All P2 items now done. 138 tests / 16 suites. |
| 2026-08-24 | Share card + runtime verify (v1.6) | Shareable progress card (view-shot + expo-sharing). Runtime-verified on emulator: daily content (Gemini 3.6), sound mixer + native slider, mood suggestion banner, Profile rank card, share card modal all render correctly. Entire implementable roadmap (P0–P2 + P4 share) complete; remaining P3/P4 need external accounts/backend/dev-build. |
| 2026-06-27 | Deploy prep + Clara (v1.4) | Real branded icon/splash/favicon (sharp generator); privacy policy + terms + store listing copy; Home loading skeleton; "Clara" AI companion chat with safety guardrail + daily cap |
| 2026-06-27 | Build integrity + full test suite | Headless `expo export` caught & fixed: missing babel-preset-expo, private-field lowering for Hermes, removed unused AI SDKs; bundled real ambient audio (soundscape URLs were 403). Added AsyncStorage-mocked integration tests for storage + gamification + Clara. 84 tests / 9 suites green |
| 2026-09-01 | Numerology + Ascendant + Destiny Matrix | Daily numerology feature: birth details form, Life Path/Expression/Soul Urge/Personality, interactive Destiny Matrix octagram (22 arcana, age timeline, chakra map), approximate Ascendant from birth time, daily AI reading (Gemini). `numerology.ts`/`destinyMatrix.ts`/`ascendant.ts`/`numerologyReading.ts` + `NumerologyScreen`. |
| 2026-09-01 | UX polish + native builds | Draggable global Clara button (snaps to nearest edge, on every tab); first-run guide with **spotlight ring on the real nav item**; language-first onboarding step; native date/time pickers for birth details; birthplace split into Localitate + Țară fields. Fixed: floating tab bar overlapping content (safe-area clearance + immersive breathe session), tappable achievement detail modal, clearer meditation cancel, and the **edge-to-edge keyboard bug** (RN KeyboardAvoidingView is broken under Expo SDK 54 edge-to-edge → switched Android to `softwareKeyboardLayoutMode: "pan"`). Built + installed the **standalone APK** locally (arm64 for phones, arm64+x86_64 for emulator testing) — verified it boots and all fixes work; the earlier "keeps stopping" was purely arm64-APK-on-x86_64-emulator ABI mismatch, not a bug. Local Gradle build works on Windows (JAVA_HOME = Android Studio JBR, bump `org.gradle.jvmargs` to `-Xmx4096m -XX:MaxMetaspaceSize=2048m` to avoid Kotlin OOM; `reactNativeArchitectures` controls APK size). Freemium model decided → see P3. |

---

| 2026-09-02 | P1.6 + P2.9 + P3 + languages + AI security | Implemented most of P1.6 (quote/objective/horoscope rewording + reorder, challenges info popup, breathe meditation title, XP leaderboard, session pause/resume, safe-area End button, custom reminder time, first-run notification permission, Clara badge rename); P2.9 birth-chart "big three" (Sun/Moon/Rising, computed Moon via Schlyter, `birthChart.ts` + 4 tests); P3 freemium (`entitlements.ts`: testing bypass, 3 free/50 premium AI-per-day quota, Clara + numerology gated, usage card in Profile); IT/FR/ES languages (deep-partial dicts, English fallback; `i18n/languages.ts` extracted so services import it without JSX; AI prompts localized via `languageName`). **AI key security:** all Gemini calls go through `services/ai.ts` gateway → uses `EXPO_PUBLIC_AI_PROXY_URL` (server holds key) when set, direct key only for dev; deployable Cloudflare Worker in `proxy/`. 170 tests. Remaining P1.6: a (name — leaning keep ClarMind), f, i, o, j, r, t. |
| 2026-09-04 | Clara voice + web app | **Clara voice:** text-to-speech (expo-speech, per-message 🔊 + auto-speak toggle) and mic speech-to-text (`expo-speech-recognition@3.1.3` native; `@react-native-voice/voice` rejected — legacy support-lib build conflict). **Web app (P1.6 t):** ClarMind now runs in the browser via React Native Web. Platform-safe wrappers so native-only modules degrade gracefully: `DateTimePicker.web.tsx` (browser `<input type=date/time>`), `speechRecognition.web.ts` (Clara mic on the Web Speech API). `npm run build:web` → static `dist/`; `WEB.md` + GitHub Pages workflow (`app.config.js` bakes `experiments.baseUrl` for subpath hosting). **Verified live in-browser (every screen):** onboarding → all 5 tabs → Gemini daily content (no CORS) → Clara chat round-trip + freemium quota + Web-Speech mic → premium-testing unlock → numerology date picker → **full natal wheel** (SVG + Nominatim geocoding + tap-to-interpret) → Breathe immersive session (pause/resume) → courses. **Bugs found & fixed via web testing:** (1) birth chart opened to "Add your birth details first" even after calculating — HomeScreen's `onUpdated` was a no-op so `profile.birth` never refreshed; now the natal modal uses local birth state and `onUpdated` refreshes the app profile (this also finally live-verified the natal wheel, previously blocked by the broken emulator screencap). (2) "Share my progress" silently did nothing on web (Alert.alert is a no-op there) — now uses the Web Share API with clipboard fallback. **CI:** GitHub Pages workflow's build job verified passing on Ubuntu; deploy waits on the one-time Settings→Pages→Source=GitHub Actions toggle. 172 tests. Remaining P1.6: **f** (deferred, UX risk), **j** (store link — needs published store URL). |
| 2026-09-05 | New features (idea bank) + web polish | **Cosmic Energy** (Home): date-seeded daily 1–10 gauge for the user's sign, 3 facets (Vitality/Clarity/Harmony), Co-Star-style hook. `cosmicEnergy.ts` (10 tests) + `CosmicEnergyCard`. **"Minds breathing now"** (Breathe): live seeded presence counter, smooth daily rhythm + jitter, refreshes every 4s. `breathingNow.ts` (6 tests). **Moon phase** (Sky): live phase card (emoji, name, % illuminated), lunar math anchored to the same reference full moon as `seasonalEvents.ts`. `moonPhase.ts` (7 tests). **PWA** (web): `build:web` now runs `scripts/web-postbuild.js` → adds web manifest (installable / Add-to-Home-Screen), Apple touch icon, theme-color + OG/Twitter tags; no service worker (avoids stale-content). All verified live in-browser; CI build stays green. 195 tests. |
| 2026-09-08 | Live launch + proxy + RevenueCat + guided meditation | **Web app LIVE** at https://pechi23.github.io/clarmind/ (Pages Source→GitHub Actions; auto-deploys on push). **AI key secured:** Cloudflare Worker proxy deployed (`clarmind-ai-proxy.george-pecherle.workers.dev`), old Gemini key deleted; live bundle verified key-free, calls go through the proxy; `EXPO_PUBLIC_AI_PROXY_URL` set as a GitHub Actions variable + in `.env`. **AI horoscope** now weaves in the day's Cosmic Energy + moon phase (verified live). **RevenueCat (P3):** `react-native-purchases@10` behind a platform seam (`purchases.ts`/`purchases.web.ts`), `isPremium()` honors the `premium` entitlement, `PaywallModal` from Profile→Settings→Upgrade; Test Store key wired (`EXPO_PUBLIC_REVENUECAT_KEY`), real purchase still needs store products (Apple/Google deferred). **P2.10 guided voice meditation** shipped (see above). **Gotcha found:** Metro caches inlined `EXPO_PUBLIC_*` env — rebuild with `--clear` after `.env` changes (CI immune). 206 tests. |
| 2026-09-09 | Real leaderboard + MindSpace-brainstorm features | **Real leaderboard** via a free **Cloudflare Worker + D1** (`leaderboard-worker/`; deployed at `clarmind-leaderboard.george-pecherle.workers.dev`) — anonymous per-device id, `submitScore`/`fetchTop`, device_ids never leaked (isYou via `X-Device-Id`), seeded fallback when unset/offline; `EXPO_PUBLIC_LEADERBOARD_URL` in `.env` + GitHub Actions var (workflow updated to pass it). Verified live. **6 new features** from George's old ChatGPT "MindSpace" brainstorm (only the genuinely-new ones): export/import backup, mood trend chart, intuition mini-game, AI pattern insights, voice/text mood check-in, richer toggleable per-phase breathing cues. 238 tests. |
| 2026-09-10 | Legal, languages, variant, analytics & polish | **Legal:** hosted Privacy Policy + Terms (`public/*.html` → `/clarmind/privacy.html` & `/terms.html`) + in-app "Legal" links (still: contact email, governing law, lawyer review). **Languages:** added **German + Portuguese** (7 total). **Variant flag:** `EXPO_PUBLIC_APP_VARIANT=paid` unlocks premium + distinct name/bundle id for the free-vs-paid A/B. **Analytics:** dependency-free PostHog capture wrapper (no-op without a key, opt-out, variant-tagged, 10 events). **Optional features:** mood→soundscape, sleep-timer auto-fade. 246 tests. Remaining before launch: George's decisions (name, email, free/paid), on-device testing, store accounts + submission, activate analytics (PostHog key). |

| 2026-09-10 | Breath calibration | Last self-contained idea-bank feature: **"🫁 Calibrate to my breath"** on Breathe → tap along your natural inhale/exhale for a few breaths; the app scales every pattern to your pace, preserving proportions (a 4-7-8 stays 4-7-8-shaped), clamped 0.6–1.7×. Persisted as one multiplier (`getBreathCalibration`), applied on top of the base pattern so it never compounds. `services/breathCalibration.ts` (10 tests) + `BreathCalibrationModal`, all 7 languages. 256 tests. |

---

**Last updated:** 2026-09-10 (Breath calibration — last self-contained idea-bank feature; 256 tests)
