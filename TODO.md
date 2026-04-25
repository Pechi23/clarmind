# ClarMind — Progress & Roadmap

> **Living document.** Update this at the end of every session so the next one picks up cleanly.

---

## ✅ Done (v1.0 MVP)

### Foundation
- [x] Expo + TypeScript scaffold with proper folder structure
- [x] Inter font family loading via `@expo-google-fonts/inter`
- [x] Splash screen control via `expo-splash-screen`
- [x] Babel config with `react-native-reanimated/plugin`
- [x] `.env` setup for `EXPO_PUBLIC_GEMINI_API_KEY` (gitignored)
- [x] GitHub repo created (`Pechi23/clarmind`)
- [x] EAS Build config (`eas.json`) with dev/preview/production profiles
- [x] Bundle IDs set: `com.clarmind.app`

### AI / Daily content
- [x] Gemini REST integration (`gemini-2.0-flash`)
- [x] Daily content cached in AsyncStorage — 1 API call per user per day
- [x] Pull-to-refresh forces regenerate
- [x] 429 rate-limit handling with friendly error
- [x] Strict JSON schema for output (quote/zodiac/stress/mindfulness/affirmation)

### Onboarding
- [x] 2-step flow: name → zodiac picker
- [x] All 12 signs with English + Romanian names + emoji + element
- [x] Form validation (min 2 char name, sign required)

### Home Screen
- [x] Greeting with time-of-day awareness
- [x] Streak badge (fire pill)
- [x] Daily quote card with author
- [x] Affirmation card (zodiac-tinted)
- [x] Zodiac message card
- [x] Stress relief tip card
- [x] Mindful task card
- [x] Pull-to-refresh

### Breathe Screen
- [x] 3 breathing patterns (Box, 4-7-8, Deep Calm)
- [x] Preset durations (2, 5, 10, 20 min)
- [x] Animated breathing circle (Reanimated 3, scale + glow)
- [x] Phase labels with timer countdown
- [x] Haptic feedback on phase transitions
- [x] Wind-down mode (after 9 PM): banner, auto-select 4-7-8, darker palette
- [x] Soundscape picker (Silence, Rain, Forest, Ocean, Deep Space)
- [x] expo-av background loop player
- [x] Session completion screen with XP earned
- [x] Mood check-in modal (5-emoji scale, post-session)

### Leaderboard
- [x] 2 tabs: Streak / Total Time
- [x] 14 deterministic fake users (seeded by date)
- [x] Romanian names + zodiac diversity
- [x] Top 3 medals (👑 🥈 🥉)
- [x] Current user highlighted with gold border
- [x] Pull-to-refresh

### Profile
- [x] Zodiac avatar header card with sign + element + dates
- [x] Stats grid (streak / total minutes / sessions)
- [x] 30-day activity heatmap with 5-level intensity
- [x] Daily reminder toggle (real `expo-notifications` scheduling at 9 AM)
- [x] Reset onboarding (with confirmation dialog)
- [x] App version display

### Navigation
- [x] Bottom tabs (Home / Breathe / Top / Profile)
- [x] Custom floating glass tab bar with active glow
- [x] Haptic feedback on tab change
- [x] No labels — clean icon-only design

### Design System
- [x] All tokens centralized in `theme.ts`
- [x] Glassmorphism cards via `GradientCard`
- [x] Consistent gradient backgrounds across all screens
- [x] Inter font weights wired

### Platform Compatibility
- [x] Web platform guards on Haptics / Notifications / Audio
- [x] Edge-to-edge enabled on Android
- [x] iOS silent-mode audio playback enabled

### Documentation
- [x] `CLAUDE.md` — developer reference for future sessions
- [x] `TODO.md` — this file
- [x] `README.md` — quick start + ship checklist

---

## 🚧 In Progress

_Nothing right now — pick from "Next up" below._

---

## 📋 Next up (v1.1 ship)

### Critical for App Store / Play Store
- [ ] Replace Pixabay CDN audio with bundled local files (offline-friendly + no third-party in production)
- [ ] Generate proper app icons (1024×1024, all densities) — replace default Expo icon
- [ ] Generate splash screen image with ClarMind branding
- [ ] Privacy Policy URL (required for stores)
- [ ] Terms of Service page
- [ ] Apple Developer Program enrollment ($99/yr)
- [ ] Google Play Developer enrollment ($25 one-time)
- [ ] Set up EAS project (`eas init`) and link to repo
- [ ] First `eas build -p android --profile preview` and test APK on device
- [ ] First `eas build -p ios --profile preview` and test TestFlight
- [ ] Submit to internal testing track on both stores

### Polish
- [ ] Verify Gemini key works after fresh install
- [ ] Add loading skeleton for daily content (instead of spinner)
- [ ] Add empty-state illustrations for new users on Profile + Leaderboard
- [ ] Sound preview when picking a soundscape
- [ ] Soft bell audio cue on phase transitions (eyes-closed users)
- [ ] Reminder time picker (currently hard-coded to 9 AM)

---

## 🌟 v2.0 Ideas

- [ ] HealthKit (iOS) / Google Fit (Android) integration for "mindful minutes"
- [ ] Premium tier with paywall ($3.99/mo) — unlock all soundscapes, history, custom timers
- [ ] DNS-based content blocker (adult / social media) — separate VPN profile
- [ ] Forest-style focus mode (timer where leaving the app "kills" the tree)
- [ ] Real backend (Supabase) — global leaderboard, account sync across devices
- [ ] Apple Watch / WearOS companion
- [ ] Romanian full localization (currently only zodiac names)
- [ ] Mood trends chart over time (line/bar)
- [ ] Streak recovery mechanics (1-day grace per week)
- [ ] Social: invite friends, see friends-only leaderboard
- [ ] Offline-first content fallback (pre-cached quote pool)

---

## 🐛 Known Issues / Tech Debt

- New Architecture (`newArchEnabled: true`) prevents the legacy Chrome JS Debugger from connecting. Use Metro terminal logs or React Native DevTools instead.
- Soundscape URLs depend on Pixabay's CDN — if it 404s the session still runs silently (graceful degrade).
- Web platform: `expo-av` may show warnings; gracefully handled but not fully tested.
- TypeScript strict mode not yet enabled — tsconfig is permissive.

---

## 📝 Session Log

| Date | Session focus | Outcome |
|---|---|---|
| 2026-04-25 | Initial scaffold | Onboarding + Home + Gemini integration shipped |
| 2026-04-25 | Switched AI provider | Claude → Gemini (free tier) via REST |
| 2026-04-25 | Full feature build | Breathe / Leaderboard / Profile / Navigation / Soundscapes / Notifications / Heatmap |
| 2026-04-25 | Documentation | CLAUDE.md, TODO.md, README.md, EAS config |

---

**Last updated:** 2026-04-25
