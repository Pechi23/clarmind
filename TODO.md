# ClarMind — Roadmap, Architecture & Idea Bank

> **Handoff document.** Written so a fresh agent (or developer) can pick any item
> and implement it without prior context. Read `CLAUDE.md` first for conventions,
> then this file for *what to build next and how*.
> Update the Session Log at the bottom after every working session.

---

## 1. Architecture snapshot (current state)

**Local-first, zero-backend.** Everything persists in AsyncStorage under `clarmind_*` keys. The only network calls are Gemini (daily content) and Pixabay CDN (soundscape audio).

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
| 1.3 | **Weekly recap card** | Monday first-open: modal card with minutes, sessions, XP, mood trend vs last week, sharable. Data from existing sessions/moods. Gemini generates 1 encouraging sentence about the week. **← next up** |
| 1.4 | ✅ **Smarter notification copy** | DONE v1.2 — `buildPersonalizedMessage()` references streak + rank, mixed with generic pool |
| 1.5 | ✅ **Onboarding goal quiz** | DONE v1.2 — step 3 Sleep/Stress/Focus/Curiosity, injected into Gemini prompt via `GOAL_CONTEXT` |

### P2 — Content depth
| # | Feature | Notes |
|---|---|---|
| 2.1 | **"Clara" — AI companion chat** | Floating button on Home → short empathetic chat (Gemini, system prompt: warm mindfulness coach, 5 exchanges/day free). Differentiator: Calm/Headspace have nothing conversational. Reuse the existing Gemini service pattern; keep a rolling transcript in AsyncStorage |
| 2.2 | **7-day micro-courses** | AI-generated programs ("7 Days of Letting Go"). One unlock per day = built-in return visit. Generate day N content on demand, cache like daily content |
| 2.3 | **Mood-aware sessions** | Pre-session mood prompt; if mood ≤ 2 suggest longer session + warmer phase labels. Post-vs-pre delta shown on completion ("You moved +2 toward calm") |
| 2.4 | **Evening reflection journal** | After 21:00, Home shows 1 AI question ("What can you release before sleep?"). Answers stored locally; weekly recap quotes them |
| 2.5 | **Sound mixer** | Layer 2 soundscapes with volume sliders (rain + space drone). `expo-av` supports parallel sounds — extend `soundscape.ts` to manage a Map of active sounds |
| 2.6 | **Romanian localization** | `i18n-js` + `expo-localization`; extract ~200 strings to `src/i18n/{en,ro}.ts`. Zodiac names already exist. Gemini prompt gains "respond in Romanian" flag |
| 2.7 | **Seasonal events** | Calendar-seeded (no backend): full-moon meditation nights, solstice challenges, New Year reset ritual. Date check + special challenge pool + unique badge each |

### P3 — Monetization (after ~1k installs)
- Premium $3.99/mo or $24.99/yr via RevenueCat (`react-native-purchases`).
- **Paywall depth, not access** — free forever: sessions, XP, streaks, daily content. Premium: all soundscapes + mixer, micro-courses, Clara unlimited, mood analytics charts, custom breathing patterns, extra streak shields, constellation skins.
- Paywall moments: after first achievement unlock (high), 3rd session completion, locked soundscape tap.

### P4 — Social & platform
- Share cards: SVG → image (`react-native-view-shot`) gradient card with rank/constellation for IG stories.
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
- Expo Go SDK-54 dropped remote push notifications — reminder toggle is a no-op in Expo Go; works in dev/production builds. Non-blocking.
- `expo start --android` can hit interactive prompts (port busy, Expo Go version upgrade) in non-interactive shells — run in a real terminal, or pre-install matching Expo Go.
- Pixabay CDN soundscape URLs unverified — P0.2 replaces them with bundled assets.
- `sound-bather` achievement unlocks on any session (soundscape not yet stored per session) — add `soundscape?: string` to `MeditationSession` when implementing P1/P2 audio work.
- TypeScript strict mode off; package minor-version drift warnings (`expo@54.0.33` vs `54.0.35`) — run `npx expo install --fix` before next build.

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

---

**Last updated:** 2026-06-27
