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
- (Remaining P4 needs a dev build or backend: home-screen widgets, Supabase leaderboard/friends, watch companions.)
- Home-screen widgets (streak + quote) — needs dev-build, `expo-apple-targets` / Glance.
- Supabase backend → real leaderboard, friends. Migration: mirror AsyncStorage to Supabase keyed by anonymous device ID; merge on account creation.
- Watch companions (breathe haptics on wrist).

---

## 4. Idea bank (unprioritized, for inspiration)
- **Haptic-only mode** — phone face down, breathing guided purely by vibration pattern. Accessibility + "screen-free meditation" marketing angle.
- **Breath calibration** — user taps along their natural breath for 30s; app scales pattern durations to their comfortable pace.
- **"The world is breathing" counter** — ambient seeded count ("2,847 minds breathing right now") on Breathe screen. Social presence without a backend.
- **Zodiac energy meter** — daily 1-10 "cosmic energy" gauge per sign (seeded), feeds the AI message. Co-Star-style hook.
- **Sleep timer auto-fade** — soundscape continues after session, fades out over N minutes for falling asleep.
- **App shortcuts / quick actions** — long-press icon → "2-min breather" straight into a session.
- **Mood → music** — soundscape suggestion based on last mood entry.

---

## 5. Known issues / tech debt
- **Do NOT add `@babel/plugin-transform-*` private-field plugins with `loose:true`** — they were tried to work around the local Windows hermesc export failure, but `loose` mode caused a real runtime crash in Expo Go: `TypeError: Cannot assign to read-only property 'NONE'` on startup. Reverted; `babel.config.js` is just `babel-preset-expo` + the reanimated plugin. (Caught only by a live Expo Go smoke test — tsc/jest/`expo export` all passed.)
- **Local `expo export` Hermes step fails on Windows** — the bundled `sdks/hermesc/win64-bin/hermesc.exe` is an old DEBUG build (LLVM 8.0.0svn) that rejects modern syntax (private fields). The **JS bundle itself is valid** (a `jsEngine: jsc` export produces a complete ~2.7MB bundle) and the app **runs fine in Expo Go** (its own Hermes runs the JS directly, no bytecode precompile). **EAS Build compiles Hermes server-side with the correct toolchain**, so this does not affect real builds. To sanity-check the JS bundle locally, temporarily set `"jsEngine": "jsc"` in app.json and run `npx expo export --platform android`.
- **Runtime smoke test** (highest-signal local check): boot the emulator, `npx expo start` (plain, no `--android`), `adb reverse tcp:8081 tcp:8081`, then `adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent`; screenshot with `adb exec-out screencap -p > shot.png`. Bypasses the interactive Expo Go upgrade prompt that `--android`/`CI=1` choke on.
- Expo Go SDK-54 dropped remote push notifications — reminder toggle is a no-op in Expo Go; works in dev/production builds. Non-blocking.
- `expo start --android` can hit interactive prompts (port busy, Expo Go version upgrade) in non-interactive shells — run in a real terminal, or pre-install matching Expo Go.
- TypeScript strict mode on for app code; tests excluded from tsc. `npm test` = 84 tests / 9 suites (pure logic + AsyncStorage-mocked integration).
- Soundscapes are procedurally-generated WAVs (`scripts/generate-sounds.js`). Fine for launch; could be swapped for higher-fidelity recordings later.

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

---

**Last updated:** 2026-09-04 (Clara voice + web app; nearly all of P1.6 done — only f deferred & j pending store URL)
