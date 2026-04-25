# ClarMind

**Clear your mind, every day.** Daily AI-personalized mindfulness, breathing meditation, zodiac insights, and stress relief — built with React Native + Expo.

[![Expo SDK 54](https://img.shields.io/badge/Expo-54-black)](https://expo.dev) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Features

- 🌙 **Daily AI content** — Gemini-personalized quote, zodiac message, stress tip, mindful task, affirmation
- 🌬️ **Breathing meditation** — 3 patterns (Box / 4-7-8 / Deep Calm), preset and custom durations, animated circle, haptics, ambient soundscapes
- 🏆 **Leaderboard** — Streak and total-time rankings, simulated community for daily motivation
- ⚙️ **Profile** — 30-day activity heatmap, stats, daily push notifications, reset
- 🌌 **Wind-down mode** — After 9 PM, recommends 4-7-8 pattern with darker palette
- 🇷🇴 **Romanian zodiac** — All 12 signs labeled in Romanian for native users

---

## Quick start

```bash
git clone https://github.com/Pechi23/clarmind.git
cd clarmind
npm install
npx expo install --fix
echo "EXPO_PUBLIC_GEMINI_API_KEY=your_key" > .env
npx expo start --clear
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com).

Then:
- Press `a` for Android (Expo Go)
- Press `w` for Web
- iOS requires EAS Build (no Mac needed) — see below

---

## Ship checklist (App Store + Play Store)

> See `TODO.md` for full list. The condensed version:

### One-time setup
1. **Apple Developer Program** ($99/yr) — [developer.apple.com](https://developer.apple.com/programs/)
2. **Google Play Console** ($25 one-time) — [play.google.com/console](https://play.google.com/console)
3. **EAS account** — `npm i -g eas-cli && eas login`
4. **Initialize project** — `eas init`
5. **App icons** (1024×1024) — replace `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`
6. **Privacy Policy** — host one (required by both stores)

### Test builds
```bash
eas build -p android --profile preview      # downloadable APK
eas build -p ios --profile preview          # TestFlight
```

### Production builds
```bash
eas build -p android --profile production   # AAB for Play Store
eas build -p ios --profile production       # IPA for App Store
```

### Submit
```bash
eas submit -p android
eas submit -p ios
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (React Native + TypeScript) |
| AI | Google Gemini 2.0 Flash (free tier 1500/day) |
| Animations | `react-native-reanimated` |
| Audio | `expo-av` |
| Notifications | `expo-notifications` |
| Storage | `@react-native-async-storage/async-storage` |
| Navigation | `@react-navigation/bottom-tabs` |

---

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Full developer reference, architecture, conventions
- **[TODO.md](./TODO.md)** — Roadmap, in-progress work, known issues, session log

---

## License

MIT © Pechi23
