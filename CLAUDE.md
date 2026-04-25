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
├── babel.config.js              Reanimated plugin
├── app.json                     Expo config (bundle IDs, splash, icons)
├── eas.json                     EAS Build profiles (dev/preview/prod)
├── .env                         EXPO_PUBLIC_GEMINI_API_KEY (gitignored)
├── src/
│   ├── components/
│   │   ├── ActivityHeatmap.tsx  30-day meditation heatmap
│   │   ├── BreathingCircle.tsx  Animated reanimated circle
│   │   ├── GradientCard.tsx     Glassmorphism card wrapper
│   │   └── StreakBadge.tsx      Fire streak pill
│   ├── constants/
│   │   ├── breathing.ts         3 patterns, durations
│   │   ├── theme.ts             Colors, fonts, spacing, radius
│   │   └── zodiac.ts            12 signs (English + Romanian names)
│   ├── navigation/
│   │   └── AppNavigator.tsx     Bottom tabs + custom glass tab bar
│   ├── screens/
│   │   ├── OnboardingScreen.tsx 2-step: name → zodiac picker
│   │   ├── HomeScreen.tsx       Daily AI content + streak
│   │   ├── BreatheScreen.tsx    Pattern + duration + soundscape + session
│   │   ├── LeaderboardScreen.tsx Streak / total time tabs (seeded fakes)
│   │   └── ProfileScreen.tsx    Avatar, stats, heatmap, settings
│   ├── services/
│   │   ├── claude.ts            (named for future migration) Gemini REST call
│   │   ├── leaderboard.ts       Seeded fake users
│   │   ├── notifications.ts     Schedule/cancel daily reminders
│   │   ├── soundscape.ts        expo-av player wrapper
│   │   └── storage.ts           AsyncStorage CRUD
│   └── types/
│       └── index.ts             UserProfile, DailyContent, MeditationSession, MoodEntry
```

## Data model

```typescript
UserProfile         { name, zodiacSign, onboardingComplete }
DailyContent        { quote, quoteAuthor, zodiacMessage, stressTip, mindfulnessTask, affirmation, generatedAt }
MeditationSession   { date, durationMinutes, pattern, completedAt }
MoodEntry           { date, mood (1-5), context }
```

All persisted to AsyncStorage under `clarmind_*` keys (see `services/storage.ts`).

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
