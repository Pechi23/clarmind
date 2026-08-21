# ClarMind — Developer Reference

> **For future Claude sessions and developers.** Read this before making changes.

## What ClarMind is

A cross-platform mindfulness mobile app (Android + iOS + Web) built with **React Native + Expo (TypeScript)**.
Targeted at users who want daily quotes, zodiac insights, breathing meditation, and stress relief.
Romanian language is partially supported (zodiac sign names) — primary UI is English.

**Repo:** https://github.com/Pechi23/clarmind
**Local path:** `C:\Users\User\Desktop\clarmind`

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo SDK 54 (React Native, TypeScript) | One codebase → Android, iOS, Web |
| Navigation | `@react-navigation/bottom-tabs` | Native tabs |
| Animations | `react-native-reanimated` v3 | Smooth breathing circle |
| Storage | `@react-native-async-storage/async-storage` | Local-only, no backend |
| AI provider | Google Gemini (`gemini-2.0-flash`) via REST | Free tier 1500 req/day |
| Audio | `expo-av` (loops via Pixabay CDN) | Ambient soundscapes |
| Haptics | `expo-haptics` | Phase transitions, tab taps |
| Notifications | `expo-notifications` | Daily reminders |
| Fonts | `@expo-google-fonts/inter` | Inter — clean, calm |

## Project layout

```
clarmind/
├── App.tsx                      Root: fonts, profile gate, navigation
├── babel.config.js              Reanimated + private-field transforms
├── jest.config.js / jest.setup.js  ts-jest + AsyncStorage mock
├── app.json                     Expo config (bundle IDs, splash, icons)
├── eas.json                     EAS Build profiles (dev/preview/prod)
├── .env                         EXPO_PUBLIC_GEMINI_API_KEY (gitignored)
├── scripts/
│   ├── generate-assets.js       Icon/splash generator (sharp)
│   └── generate-sounds.js       Procedural ambient WAV + bell generator
├── assets/sounds/               Bundled loops: rain/ocean/forest/space + 2 bells
├── legal/                       privacy-policy.md, index.html, STORE_LISTING.md
├── src/
│   ├── components/
│   │   ├── ActivityHeatmap.tsx  30-day meditation heatmap
│   │   ├── BreathingCircle.tsx  Animated reanimated circle
│   │   ├── ConstellationSky.tsx SVG night sky (stars + constellations)
│   │   ├── GradientCard.tsx     Glassmorphism card wrapper
│   │   ├── Skeleton.tsx         Shimmer loading placeholders
│   │   ├── StreakBadge.tsx      Fire streak pill
│   │   └── WeeklyRecapModal.tsx Weekly recap card
│   ├── constants/
│   │   ├── achievements.ts      16 badges, 13 ranks, XP rules, getLevelForXp
│   │   ├── breathing.ts         3 patterns, durations
│   │   ├── constellations.ts    12 zodiac SVG shapes
│   │   ├── localize.ts          id → localized text helpers (sign/element/pattern/…)
│   │   ├── theme.ts             Colors, fonts, spacing, radius
│   │   └── zodiac.ts            12 signs (English + Romanian names)
│   ├── i18n/
│   │   ├── en.ts / ro.ts        Full translation dictionaries (shape = en)
│   │   └── index.tsx            I18nProvider, useI18n(), t(), module translate()
│   ├── navigation/
│   │   └── AppNavigator.tsx     5 bottom tabs + custom glass tab bar
│   ├── screens/
│   │   ├── OnboardingScreen.tsx 3-step: name+lang → zodiac → goal
│   │   ├── HomeScreen.tsx       Daily AI content, challenges, Clara FAB, recap
│   │   ├── BreatheScreen.tsx    Pattern/duration/soundscape/session + mood
│   │   ├── SkyScreen.tsx        Constellation Sky
│   │   ├── LeaderboardScreen.tsx Streak / total time tabs (seeded fakes)
│   │   ├── ProfileScreen.tsx    Rank, XP, badges, heatmap, settings, language
│   │   └── ClaraScreen.tsx      AI companion chat
│   ├── services/
│   │   ├── claude.ts            Gemini REST: daily content + weekly reflection (lang-aware)
│   │   ├── clara.ts             Gemini chat (systemInstruction, safety, lang-aware)
│   │   ├── gamification.ts      XP, achievements, daily challenges
│   │   ├── streakLogic.ts       Pure streak + Stardust Shield math (tested)
│   │   ├── skyLogic.ts          Pure constellation run detection (tested)
│   │   ├── challengeLogic.ts    Pure seeded daily-challenge picker (tested)
│   │   ├── weeklyRecapLogic.ts  Pure weekly stats + week key (tested)
│   │   ├── sessionSuggestion.ts Pure mood/time → suggestion (tested)
│   │   ├── leaderboard.ts       Seeded fake users
│   │   ├── notifications.ts     Schedule/cancel daily reminders (personalized)
│   │   ├── soundscape.ts        expo-av player: loops, bells, fade-out
│   │   └── storage.ts           AsyncStorage CRUD (wraps streakLogic)
│   └── types/
│       └── index.ts             UserProfile, DailyContent, MeditationSession, MoodEntry, ChatMessage, …
```

## Data model

```typescript
UserProfile         { name, zodiacSign, goal?, onboardingComplete }
DailyContent        { quote, quoteAuthor, zodiacMessage, stressTip, mindfulnessTask, affirmation, generatedAt }
MeditationSession   { date, durationMinutes, pattern, completedAt, soundscape? }
MoodEntry           { date, mood (1-5), context }
ChatMessage         { role, text, at }
StreakResult        { streak, shields, shieldUsed, shieldEarned }
```

All persisted to AsyncStorage under `clarmind_*` keys (see `services/storage.ts`). Language in `clarmind_language`.

## Internationalization (EN/RO)

- All user-facing strings live in `src/i18n/{en,ro}.ts` (nested; `en` is the source-of-truth shape).
- In components: `const { t, language, setLanguage } = useI18n();` then `t('home.affirmationLabel')`, `t('sky.hintProgress', { days, sign })`.
- Content constants (patterns, soundscapes, challenges, achievements, ranks, zodiac, elements) localize via `constants/localize.ts` helpers keyed by their stable id.
- Services (no React) use the module-level `translate()` / receive a `language` arg; the provider keeps it in sync. AI prompts (daily content, Clara, weekly reflection) take `language` and reply in it.
- **Adding a string:** add the key to `en.ts` AND `ro.ts` (same path), then `t('...')` in the UI. Never hardcode display text.

## Pure logic + tests

Bug-prone logic is extracted into dependency-free `*Logic.ts` / `sessionSuggestion.ts` modules and unit-tested; the data layer is covered by AsyncStorage-mocked integration tests. `npm test` = 90 tests / 10 suites. Keep this pattern: new branching logic goes in a pure module with a test in `__tests__/`.

## Design system

**Strict aesthetic:** "luxury spa meets space" — dark, calm, premium.

| Token | Value |
|---|---|
| Background gradient | `#0f0c29 → #1a1a3e → #24243e` |
| Wind-down gradient (after 9 PM) | `#000814 → #0a0e27 → #16213e` |
| Primary violet | `#a78bfa` |
| Sky blue | `#7dd3fc` |
| Warm rose | `#fda4af` |
| Card bg | `rgba(255,255,255,0.07)` |
| Card border | `rgba(255,255,255,0.12)` |
| Card radius | 24 |
| Button | gradient `#a78bfa → #7c3aed`, pill shape |
| Font | Inter (400 / 500 / 600 / 700) |

All colors and tokens live in `src/constants/theme.ts`. **Do not hardcode colors elsewhere.**

## Running locally

```bash
npm install
npx expo install --fix       # if version mismatches
npx expo start --clear       # required after babel/reanimated changes
```

## Testing

Pure logic (date math, streak/shield rules, constellation runs, level curve,
seeded challenges) lives in dependency-free modules so it can be unit-tested
without the React Native runtime:

- `services/streakLogic.ts` — `computeStreakUpdate` (storage.ts wraps it with I/O)
- `services/skyLogic.ts` — `getRuns`, `countConstellations`
- `services/challengeLogic.ts` — `pickDailyChallengeDefs` (seeded)
- `constants/achievements.ts` — `getLevelForXp`

```bash
npm test            # jest, 43 tests across 5 suites
npm run typecheck   # tsc --noEmit (tests excluded from app build)
```

When adding a feature with branching logic (dates, scoring, seeded
randomness), put the pure part in a `*Logic.ts` module and add a test in
`__tests__/`. Keep AsyncStorage / RN imports out of those modules.

Press `a` for Android (Expo Go) · `w` for Web · iOS needs EAS Build (no Mac required).

### Environment

Create `.env` (gitignored):
```
EXPO_PUBLIC_GEMINI_API_KEY=your_key_from_aistudio.google.com
```

### Reload after dependency changes

The babel/reanimated plugin requires `--clear` on first start. Restart Metro after:
- adding a native module
- editing `babel.config.js`
- editing `.env`

## AI provider (Gemini)

`src/services/claude.ts` (kept the filename for easy Claude migration later) calls Gemini REST directly:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
```

- Free tier: 15 req/min, 1500 req/day
- Cached per day in AsyncStorage — pull-to-refresh forces a regenerate
- Returns strict JSON parsed against `DailyContent` shape
- 429 errors are surfaced to the UI as "Rate limit reached"

To switch to **Anthropic Claude**, replace the `fetch` body in this file with the Anthropic SDK call. The function signature stays the same.

## Platform notes

- **Web** — `expo-haptics`, `expo-notifications`, and `expo-av` are guarded with `Platform.OS !== 'web'` checks. Web is functional but mute and unhaptic.
- **Android** — Edge-to-edge enabled. Notifications use the `clarmind-daily` channel.
- **iOS** — `playsInSilentModeIOS: true` so soundscapes work even when phone is muted.

## Soundscapes

CDN URLs from Pixabay (CC0). For App Store submission, replace with bundled local files (`require('../../assets/sounds/rain.mp3')`) for offline support and to avoid third-party dependencies in production.

## Notifications

When the toggle in Profile is enabled:
1. Permission requested
2. All previous reminders cancelled
3. Daily reminder scheduled at 09:00 with random message from `REMINDER_MESSAGES`

## Wind-down mode

`BreatheScreen` checks `new Date().getHours() >= 21 || < 5`. If true:
- Banner suggests 4-7-8 pattern
- Auto-selects 4-7-8
- Background gradient darker
- Default pattern picked accordingly

## Leaderboard

Fake users are deterministically seeded by today's date (`YYYYMMDD`) via `Math.sin(seed) * 10000`. Same numbers appear all day, change daily. Current user injected and sorted by streak or total minutes.

## Building for the stores

See **`README.md`** for the deploy checklist. Quickref:

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview        # APK for testing
eas build -p ios     --profile preview        # TestFlight build
eas build -p android --profile production     # Play Store AAB
eas build -p ios     --profile production     # App Store
eas submit -p android
eas submit -p ios
```

## Conventions

- All new screens get a `LinearGradient` background using `GRADIENTS.background` (or wind-down variant).
- All new cards use `GradientCard` component or the same glassmorphism inline.
- All animations use `react-native-reanimated` (no `Animated` from react-native core).
- Storage keys all live in `services/storage.ts` `KEYS` object.
- Native-only APIs (`Haptics`, `Notifications`, `Audio`) wrapped in `Platform.OS !== 'web'`.

## What's NOT done yet

See `TODO.md`.
