# Stillnova launch audit

Date: 2026-09-18. Scope: the full repo at commit `c08099f` (rebrand splash). Method: read every file under `src/`, `App.tsx`, config, workers, legal and docs; ran `npm run typecheck` (clean) and `npm test` (282 tests, 37 suites, all green); computed the i18n key diff with a script.

How to read this file:

- Part 1 is the localization audit (the bug you saw, the full gap list, the fix, the test, and drafted translations in the appendices).
- Part 2 is the general quality audit, ordered by severity. Each item has file paths and a concrete fix.
- Part 3 is prioritized feature ideas with effort estimates.
- Part 4 is the monetization and go-to-market plan with numbers.
- Appendix A is a drop-in parity test. Appendix B holds the 263 missing keys drafted for es, it, fr, de and pt. Appendix C holds new keys (with 7 translations) for text that is currently hardcoded in English.

Severity scale: **P0** = would embarrass us or break money/compliance at launch, fix before submitting. **P1** = users will hit it in week one. **P2** = should fix soon. **P3** = polish / debt.

---

## 0. Executive summary

The app is in good shape technically: strict TypeScript, 282 passing tests, a sensible local-first architecture, and the AI key already behind a proxy. The problems are concentrated in three areas: localization is only half done for five of the seven languages, several launch-critical business and compliance details are unfinished, and a handful of real bugs (timezone, screen lock during sessions, an open AI proxy) will bite real users on day one.

Must fix before store submission (details in Part 2):

| # | Severity | Issue | Where |
|---|---|---|---|
| 1 | P0 | Five locales (it/fr/es/de/pt) are missing exactly 263 of 527 keys, so half the app (numerology, courses, paywall, backup, achievements, ranks, the language-limit alerts you saw) shows English | `src/i18n/*.ts` |
| 2 | P0 | The "Premium (testing)" switch is visible to every user of the free build. Anyone gets Premium for free with one tap | `src/screens/ProfileScreen.tsx:459` |
| 3 | P0 | The AI proxy has no auth and no rate limit. Anyone who finds the URL can run your Gemini bill | `proxy/worker.js` |
| 4 | P0 | Language change, reset, and permission alerts are silent no-ops on web (`Alert.alert` is an empty function in react-native-web). Web users can never change language after onboarding | `src/screens/ProfileScreen.tsx:62-81`, `:188` |
| 5 | P0 | The "day" boundary is UTC in ~10 places while hours are local. In the Americas the day flips at 7 PM. Streaks, challenges, quota reset, session dates, Sky runs and course unlocks are all affected | `storage.ts`, `gamification.ts`, `BreatheScreen.tsx`, `entitlements.ts`, others |
| 6 | P0 | A meditation session dies when the screen locks (no keep-awake, timers pause in background). A 10-minute session with the phone face down never finishes | `src/screens/BreatheScreen.tsx` |
| 7 | P0 | Notifications are English-only and the same message is repeated every day forever | `src/services/notifications.ts` |
| 8 | P0 | Birth-place autocomplete uses Nominatim, whose usage policy explicitly forbids autocomplete. Getting blocked breaks birth chart, ascendant and houses for everyone | `src/services/placeSearch.ts` |
| 9 | P0 | Store compliance: no account deletion (Apple 5.1.1(v), Google policy), paywall lacks Terms/Privacy links and auto-renew disclosure, Sign in with Apple not wired, iOS has no declared localizations, `appleTeamId` placeholder, `ITSAppUsesNonExemptEncryption` missing | `AccountModal.tsx`, `PaywallModal.tsx`, `app.json`, `eas.json` |
| 10 | P0 | Birth time is treated as UTC. A Romanian born at 14:00 local is computed as 14:00 UT, which shifts the Ascendant by 2 to 3 hours (up to 1.5 signs). The headline premium feature is wrong for most users | `src/services/birthChart.ts:373` |
| 11 | P1 | Leaderboard accepts any name and any numbers from any client. Expect "💩💩💩 9999999" on top within a day | `leaderboard-worker/worker.js` |
| 12 | P1 | Store listing / Data Safety copy says "no backend, no analytics, no account". The app now has PostHog, Supabase accounts and sync, Cloudflare leaderboard, RevenueCat and Nominatim. A false Data Safety form is a Play policy violation | `legal/STORE_LISTING.md` |

Everything else (about 60 more findings) is in Part 2.

---

## 1. Localization audit

### 1.1 Root cause of what you saw in Spanish

Two separate mechanisms produce English text in a non-English locale:

1. **Missing dictionary keys.** `it.ts`, `fr.ts`, `es.ts`, `de.ts`, `pt.ts` are typed `DeepPartial<TranslationShape>`, and `translateWith` (`src/i18n/interpolate.ts:20`) silently falls back to English. The language-limit pop-up uses `profile.langLimitTitle`, `profile.langLimitDaily`, `profile.langLimitCooldown`, `profile.langConfirmTitle`, `profile.langConfirmMsg`, `profile.langConfirmYes` and `common.cancel`. All seven are missing from all five partial locales, so the dialog is 100% English. The "card descriptions" you saw are the 7-day programs card (`courses.homeCardTitle`, `courses.homeCardSubtitle`), the numerology card (`numerology.homeCardTitle`, `numerology.homeCardSubtitle`), the achievements grid, and the Insights / Mood trend cards on Profile. All of those sections are entirely missing.

2. **Hardcoded strings that never go through `t()`.** Notifications, the streak badge, the "Lv" chip, zodiac date ranges, the date line on Home, Clara's offline fallbacks, the guided-meditation fallback script, and all astrology/numerology interpretation text (which is EN/RO only). Full list in 1.5.

The existing parity test (`src/i18n/__tests__/interpolate.test.ts`) only checks `ro` against `en`. That is why nothing caught this.

### 1.2 Coverage table

Computed by flattening every dictionary to dot paths (script in the scratchpad; the same logic is in the proposed test in Appendix A).

| Locale | Keys present | Missing vs en | Extra keys | Values identical to English |
|---|---|---|---|---|
| en | 527 | (source) | | |
| ro | 527 | **0** | 0 | 11 (all legitimate: "Email", "Premium", "Total", brand names) |
| it | 264 | **263** | 0 | 9 |
| fr | 264 | **263** | 0 | 8 |
| es | 264 | **263** | 0 | 2 |
| de | 264 | **263** | 0 | 8 |
| pt | 264 | **263** | 0 | 3 |

All five partial locales miss the **same** 263 keys (they were generated from the same older snapshot of `en.ts`, before the numerology, courses, paywall, backup, moodScan, insights, intuition, moodTrend, legal, recap, suggestion, seasonal, challenges, ranks and achievements sections were added or completed).

Missing keys by section (identical for it/fr/es/de/pt), as missing/total:

| Section | Missing | Section | Missing |
|---|---|---|---|
| numerology | 78/78 | recap | 9/9 |
| achievements | 32/32 | challenges | 9/9 |
| courses | 20/20 | reflection | 8/13 (all 8 `questions.*`) |
| profile | 16/50 | insights | 6/6 |
| seasonal | 14/14 | moodTrend | 6/6 |
| paywall | 13/13 | legal | 3/3 |
| ranks | 13/13 | suggestion | 3/3 |
| backup | 11/11 | common | 2/11 (`cancel`, `close`) |
| moodScan | 10/10 | clara | 1/9 (`listening`) |
| intuition | 9/9 | | |

The 16 missing `profile.*` keys: `phaseCues`, `phaseCuesSub`, `analytics`, `analyticsSub`, `sleepFade`, `sleepFadeSub`, `langLimitTitle`, `langLimitDaily`, `langLimitCooldown`, `langConfirmTitle`, `langConfirmMsg`, `langConfirmYes`, `voice`, `voiceSub`, `voice_female`, `voice_male`.

### 1.3 Full list of missing keys (per language)

Because the set is identical for it, fr, es, de and pt, it is listed once. Every key below is missing from all five files.

```
common.cancel  common.close
paywall.title  paywall.subtitle  paywall.benefit1  paywall.benefit2  paywall.benefit3  paywall.benefit4
paywall.cta  paywall.perMonth  paywall.restore  paywall.unavailable  paywall.maybeLater  paywall.thanks  paywall.upgrade
moodScan.entry  moodScan.entrySub  moodScan.title  moodScan.prompt  moodScan.placeholder  moodScan.listening
moodScan.analyze  moodScan.analyzing  moodScan.suggested  moodScan.fallback
insights.title  insights.loading  insights.fbStart  insights.fbConsistent  insights.fbCalm  insights.fbKeep
intuition.entry  intuition.entrySub  intuition.title  intuition.prompt  intuition.hit  intuition.miss
intuition.score  intuition.streak  intuition.again
moodTrend.title  moodTrend.window  moodTrend.empty  moodTrend.trendUp  moodTrend.trendDown  moodTrend.trendFlat
legal.title  legal.privacy  legal.terms
backup.title  backup.sub  backup.export  backup.exported  backup.exportError  backup.restore  backup.placeholder
backup.restoreBtn  backup.restored  backup.restoreError  backup.cancel
profile.phaseCues  profile.phaseCuesSub  profile.analytics  profile.analyticsSub  profile.sleepFade  profile.sleepFadeSub
profile.langLimitTitle  profile.langLimitDaily  profile.langLimitCooldown  profile.langConfirmTitle
profile.langConfirmMsg  profile.langConfirmYes  profile.voice  profile.voiceSub  profile.voice_female  profile.voice_male
clara.listening
recap.kicker  recap.title  recap.minutesLabel  recap.sessionsLabel  recap.activeDaysLabel  recap.same  recap.vsLast
recap.moodDelta  recap.button
suggestion.night  suggestion.lowMood  suggestion.highMood
numerology.label  numerology.homeCardTitle  numerology.homeCardSubtitle  numerology.setupTitle  numerology.setupSubtitle
numerology.firstName  numerology.lastName  numerology.gender  numerology.genderFemale  numerology.genderMale
numerology.genderOther  numerology.dob  numerology.day  numerology.month  numerology.year  numerology.birthTime
numerology.hour  numerology.minute  numerology.selectDate  numerology.selectTime  numerology.locality
numerology.localityPlaceholder  numerology.country  numerology.countryPlaceholder  numerology.place
numerology.placePlaceholder  numerology.save  numerology.edit  numerology.coreTitle  numerology.lifePath
numerology.lifePathHint  numerology.expression  numerology.soulUrge  numerology.personality  numerology.personalDay
numerology.todayTitle  numerology.matrixTitle  numerology.matrixHint  numerology.matrixTapHint  numerology.arcanaLabel
numerology.influence  numerology.genMale  numerology.genFemale  numerology.linesTitle  numerology.relationships
numerology.money  numerology.chakraTitle  numerology.chakraPhysical  numerology.chakraEnergy  numerology.chakraEmotions
numerology.chakraTotal  numerology.chakraNote  numerology.astroTitle  numerology.bigThreeTitle  numerology.bigThreeHint
numerology.natalOpen  numerology.natalTitle  numerology.natalPlacements  numerology.natalTapHint  numerology.natalIn
numerology.aspect_conjunction  numerology.aspect_sextile  numerology.aspect_square  numerology.aspect_trine
numerology.aspect_opposition  numerology.natalAspects  numerology.natalHouse  numerology.natalNoBirth
numerology.natalNoHouses  numerology.sunSign  numerology.moonSign  numerology.ascendant  numerology.ascendantHint
numerology.disclaimer  numerology.incomplete  numerology.lockedTitle  numerology.lockedBody  numerology.lockedHint
courses.label  courses.homeCardTitle  courses.homeCardSubtitle  courses.choose  courses.day  courses.dayOf  courses.locked
courses.todaysPractice  courses.reflectPrompt  courses.markComplete  courses.completed  courses.start  courses.leave
courses.finished  courses.items.letting-go.title  courses.items.letting-go.description
courses.items.better-sleep.title  courses.items.better-sleep.description
courses.items.finding-focus.title  courses.items.finding-focus.description
reflection.questions.release  reflection.questions.wentWell  reflection.questions.grateful  reflection.questions.emotion
reflection.questions.lighter  reflection.questions.calm  reflection.questions.kind  reflection.questions.canWait
seasonal.fullMoon.title  seasonal.fullMoon.message  seasonal.newYear.title  seasonal.newYear.message
seasonal.newYearEve.title  seasonal.newYearEve.message  seasonal.winterSolstice.title  seasonal.winterSolstice.message
seasonal.summerSolstice.title  seasonal.summerSolstice.message  seasonal.springEquinox.title
seasonal.springEquinox.message  seasonal.autumnEquinox.title  seasonal.autumnEquinox.message
challenges.session-5min  challenges.pattern-478  challenges.pattern-box  challenges.mood-checkin  challenges.read-guide
challenges.morning  challenges.two-sessions  challenges.session-10min  challenges.soundscape
ranks.1 … ranks.12  ranks.enlightened
achievements.<id>.name and achievements.<id>.description for: first-breath, mood-explorer, sound-bather, night-owl,
streak-3, streak-7, streak-30, streak-100, minutes-30, minutes-100, minutes-500, minutes-1000, all-patterns,
marathon, perfect-day, level-10
```

Romanian: 0 missing. (Romanian is only affected by the hardcoded strings in 1.5.)

### 1.4 Values identical to English (possibly untranslated)

Worth a second look; some are fine (brand, "Email"), some are not:

- it: `guide.home.title` = "Home", `tabs.home` = "Home" (Italian apps use "Home" but "Inizio" is more consistent with the other locales), `account.title` / `account.settingRow` = "Account", `account.password` = "Password", `guided.focus` = "Focus".
- de: `guide.home.title` = "Home", `tabs.home` = "Home", `breathe.kicker` = "MEDITATION" (fine), `profile.level` = "Level {n}" (fine in German), `guided.pause` / `breathe.pause` = "Pause" (fine).
- fr: `common.minutes` = "minutes", `profile.minutesStat` = "minutes", `sky.constellations` = "constellations", `soundscapes.silence` = "Silence" (all valid French).
- pt: `account.email` = "Email" (fine).
- ro: `guided.focus` = "Focus", `moodScan.title` = "Check-in", `legal.title` = "Legal", `breathe.moodCalm` = "Calm", `profile.minTotal` = "min total", `numerology.arcanaLabel` = "Arcana" (all acceptable in Romanian, but "Calm" could be "Calm" or "Liniștit"; your call).

### 1.5 Hardcoded user-facing strings that bypass i18n

These show English (or Romanian) regardless of the selected language.

**Alerts, toasts, notifications (the category you asked about):**

| File | What | Notes |
|---|---|---|
| `src/services/notifications.ts:17-23` | `REMINDER_MESSAGES` (5 English strings) | Daily reminder body. Never localized. |
| `src/services/notifications.ts:46-56` | Personalized messages (`Day ${streak+1} is waiting, ${rank}`) | `rank` comes from `getLevelForXp(xp).rank`, the **English** rank name from `constants/achievements.ts`, not the localized `ranks.*` key. Contains an em dash. |
| `src/services/notifications.ts:35-36` | Android channel name `'Daily Reminders'` | Shown in system settings. |
| `src/services/notifications.ts:65` | Title `'Stillnova'` | Fine (brand). |
| `src/components/AccountModal.tsx:168,184,192` | `setErr(e?.message ?? 'Error')` | Raw Supabase errors in English ("Invalid login credentials"), plus a literal `'Error'`. |
| `src/screens/HomeScreen.tsx:122` | `'Unknown error'` | Not displayed (UI shows `home.errorLoad`), harmless. |
| `src/components/CountryPicker.tsx:70` | Empty-list placeholder `'—'` | An em dash as content; use `common.noResults`. |

**Visible UI text:**

| File | What | Fix |
|---|---|---|
| `src/components/StreakBadge.tsx:14` | `day` / `days` | Use `t('common.day')` / `t('common.days')` (keys already exist). |
| `src/screens/HomeScreen.tsx:263` | `Lv {n}` | Add `profile.levelShort` or reuse `profile.level`. |
| `src/screens/ProfileScreen.tsx:357` | `Stillnova · v1.6.0` | Also wrong version (app.json says 1.7.1). Read from `expo-constants`. |
| `src/constants/zodiac.ts:16-27` | `dateRange` like `'20 Apr – 20 Mai'`, `'21 Iun – 22 Iul'`, `'22 Dec – 19 Ian'` | Romanian month abbreviations shown to every language, with an en dash. Store `{startMonth,startDay,endMonth,endDay}` and format with `Intl.DateTimeFormat(locale, {month:'short', day:'numeric'})`. |
| `src/screens/HomeScreen.tsx:191,271` | `toLocaleDateString(language === 'ro' ? 'ro-RO' : 'en-GB', …)` | Spanish/Italian/etc. users get English dates. Reuse the `LOCALE` map from `services/claude.ts:11`. |
| `src/screens/HomeScreen.tsx:304` | `— {content.quoteAuthor}` | Em dash violates the house rule; use `"~ "` or nothing. |
| `src/screens/NatalChartScreen.tsx:100-101,133` | Planet names `Sun`, `Moon`, `Mercury`… `Ascendant`, `Midheaven`, `ASC`, `MC` | Add `astro.planets.*` keys. |
| `src/screens/ClaraScreen.tsx:148` | `Clara 🌙` | Fine (name). |
| `src/screens/GuidedMeditationScreen.tsx` | Voice names Luna/Sol/Aria/Terra | Fine (names). |
| `src/screens/LeaderboardScreen.tsx:646` | unit `'XP'` | Fine. |
| `src/services/placeSearch.ts:673` | `accept-language=en` | City labels come back in English for everyone; pass the app language. |

**Content that only exists in EN/RO (`lang === 'ro' ? … : english`):**

| File | What | Count |
|---|---|---|
| `src/constants/astroText.ts` | Planet themes (12), sign qualities (12), houses (12), aspects (5), sentence templates (2) | 43 strings |
| `src/services/destinyMatrix.ts:93-101` | Chakra names/themes (7) | 7 |
| `src/services/destinyMatrix.ts:130-153` | Arcana names (22) | 22 |
| `src/services/destinyMatrix.ts:163-186` | Arcana meanings (22) | 22 |
| `src/services/destinyMatrix.ts:196-237` | Matrix position titles + meanings (10 × 2) | 20 |
| `src/services/courses.ts:237-250` | Offline fallback day content | 4 |
| `src/services/numerologyReading.ts:319-328` | Offline fallback reading | 3 |
| `src/constants/localize.ts:7`, `NumerologyScreen.tsx:261,386` | `language === 'ro' ? romanian : name` for sign names and chakra text | Sign names: the Latin names are acceptable in it/fr/es/de/pt but a `zodiac.<sign>` key would let each locale use "Bélier", "Widder", etc. |

**English-only fallbacks (shown when the AI is unavailable, i.e. offline or proxy down):**

| File | What |
|---|---|
| `src/services/clara.ts:44-48` | 3 Clara fallback replies (with em dashes) |
| `src/services/guidedMeditation.ts:546-561` | 11-line fallback meditation script, read aloud by TTS in the wrong language |
| `src/services/guidedMeditation.ts:513-518` | `GOAL_FOCUS` (used in the spoken goal line of the fallback) |

**AI output caching that ignores language:**

- `src/services/insights.ts:88` caches the weekly insight under `clarmind_insight` with `{week, text}` but not the language. After switching language, Profile shows last week's insight in the old language until Monday. Include `language` in the cache key or the stored object.

**Locale metadata:**

- `src/i18n/languages.ts:5`: 🇬🇧 for English, 🇪🇸 for Spanish, 🇵🇹 for Portuguese. Flags for languages is a known anti-pattern (US, Latin America, Brazil). Consider language names only.
- `pt.ts` is European Portuguese and `TTS_LOCALE.pt = 'pt-PT'`. Brazil is roughly 20× the Portuguese-speaking market; decide pt-BR vs pt-PT (or ship both later).
- `languageName('pt')` returns "Portuguese" for AI prompts; say "European Portuguese" (or Brazilian) so Gemini is consistent with the UI.

**Dashes (house rule "never use em or en dashes in user-facing text"):**

- `es.ts`, `it.ts`, `fr.ts`, `de.ts`, `pt.ts`: 12 em dashes each (e.g. es `subtext`, `guide.home.desc`, `guide.clara.desc`, `home.shieldEarned`, `cosmic.tierLow`, `cosmic.tierHigh`, `cosmic.guide.*`, `guided.subtitle`, `breathe.calibrateNeedMore`, `profile.badgeLockedHint`). `en.ts` and `ro.ts` are clean.
- `clara.ts:45-46`, `notifications.ts:51`, `guidedMeditation.ts:514,552`, `destinyMatrix.ts:175,177,197-235` (user-facing values), `zodiac.ts` date ranges, `HomeScreen.tsx:304`.

### 1.6 Recommended fix

1. **Make the five partial dictionaries complete and typed as full.** Change `export const es: DeepPartial<TranslationShape>` to `export const es: TranslationShape` in all five files. From then on, a missing key is a **TypeScript compile error**, which is stronger than any test. Paste the drafts from Appendix B, review them (they are machine-drafted by me, fluent but not native-reviewed), then flip the type. Keep the runtime English fallback in `translateWith` as a safety net only.

2. **Add the parity test** in Appendix A (`src/i18n/__tests__/parity.test.ts`). It checks all six non-English locales for: missing keys, extra keys, empty values, placeholder mismatches (`{n}` present in en but not in the translation), and em/en dashes. It fails today with 263 missing keys per locale, which is the point.

3. **Move the hardcoded content into `en.ts` / `ro.ts` and the other five** (keys and drafted translations in Appendix C):
   - `notifications.*` (reminder pool, personalized templates, channel name). In `notifications.ts`, import `translate` from `../i18n` and build the message at schedule time with `translate('notifications.generic.0')` etc. Use the localized `rankName(level, translate)` instead of `getLevelForXp(xp).rank`. Reschedule when the language changes (call `scheduleDailyReminder` from `setLanguage` in `I18nProvider` if notifications are enabled) and on each app open so the message rotates (see Part 2, item 7).
   - `astro.*` (planets, signs' qualities, houses, aspects, templates), `arcana.*`, `matrix.positions.*`, `chakras.*`. Replace the `EnRo` helper in `astroText.ts` and the `enRo()` helper in `destinyMatrix.ts` with `translate()` calls keyed by id. `ro` values already exist and can be moved as-is.
   - `clara.fallbacks.*`, `guided.fallback.*`, `guided.goalFocus.*`, `courses.fallback.*`, `numerology.fallback.*`, `account.errGeneric`, `common.noResults`, `profile.levelShort`.
   - Zodiac date ranges: replace `dateRange` strings with numbers and format with `Intl`.

4. **Sweep dashes** in the five locale files (a one-line regex, then re-read the sentences; most become a period or a comma). The parity test will keep them out.

5. **Add an ESLint guard for JSX literals** (optional, 20 minutes): `eslint-plugin-i18next` rule `no-literal-string` on `src/**/*.tsx`, allowlisting emoji and symbols. This catches the next "Lv" or "days".

6. **Localize the iOS/Android shells** (Part 2, item 9): `app.json` `locales` map for permission strings and `CFBundleLocalizations`, so the stores list seven languages and the mic prompt is not English.

Estimated effort: 1 day to paste, review and wire the drafts; half a day for the hardcoded content refactor; 1 hour for the test and lint rule.

---

## 2. General quality audit

### 2.1 P0: fix before store submission

**1. Localization gaps.** See Part 1.

**2. Free Premium for everyone.** `ProfileScreen.tsx:459` shows the "Premium (testing)" switch whenever `!isPaidVariant()`, i.e. in the free production build. `entitlements.isPremium()` honors it. Anyone gets numerology, birth chart, guided meditation and 50 AI calls/day for free, and the numerology paywall even tells them how (`numerology.lockedHint`: "Testing? Turn on Premium (testing) in Profile → Settings"). Fix: render the switch only when `__DEV__ || process.env.EXPO_PUBLIC_PREMIUM_BYPASS === '1'`; delete `numerology.lockedHint` and `paywall.unavailable` from production copy; also strip `clarmind_premium_override` in `backup.importData` (`src/services/backup.ts:47`) or a pasted backup re-enables it.

**3. The AI proxy is open.** `proxy/worker.js` accepts any POST from anywhere (`Access-Control-Allow-Origin: *`, no token, no rate limit, no per-request output cap). The URL is in the public web bundle (`dist/`) so it is trivially discoverable. On a paid Gemini tier this is a direct bill; on the free tier one abuser exhausts your 1,500 requests/day and every user's Home goes blank. Fix (2 hours): (a) require a header `X-App-Key` with a value baked into the app via `EXPO_PUBLIC_AI_APP_KEY` (obfuscation, not security, but it stops drive-by use); (b) add a Cloudflare Rate Limiting rule on the worker route (e.g. 30 req/10 min per IP) and a per-`X-Device-Id` counter in Workers KV (60/day, matching the 50 premium quota + slack) so the quota is enforced server-side rather than in AsyncStorage; (c) force `generationConfig.maxOutputTokens` server-side to ≤ 2048; (d) restrict `Access-Control-Allow-Origin` to `https://pechi23.github.io` (native requests have no Origin, so they pass). Do the same for `leaderboard-worker` (item 11).

**4. `Alert.alert` is a no-op on web.** Confirmed: `node_modules/react-native-web/dist/exports/Alert/index.js` is `class Alert { static alert() {} }`. Consequences on the live web app: language can never be changed after onboarding (`ProfileScreen.tsx:71`), "Reset onboarding" does nothing (`:188`), the language-limit warning never appears, the share error never appears, notification permission alert never appears. Fix: a tiny `confirm()`-style helper `src/components/dialog.ts` that calls `Alert.alert` on native and `window.confirm` / a custom modal on web, and use it in the four call sites. TODO.md already noted this class of bug for Share.

**5. UTC day boundary.** `new Date().toISOString().split('T')[0]` is used for "today" in `storage.ts:94` (streak), `gamification.ts:231` (daily XP, challenges, guide-read), `BreatheScreen.tsx:247` (session date), `entitlements.ts:16` (AI quota), `ReflectionCard.tsx:409`, `CoursesScreen.tsx:31` (day unlock), `SkyScreen.tsx:777`, `HomeScreen.tsx:97`, `numerologyReading.ts:336`, `claude.ts:82`. Hours use local time (`getHours()`). For a user in New York the "day" rolls over at 19:00 or 20:00; in California at 16:00 or 17:00; in Bucharest at 02:00 or 03:00. Symptoms: an 8 PM session in the US is dated tomorrow (Sky heatmap wrong, "meditate today" hint wrong, two-sessions challenge miscounted), streak increments early, "resets at midnight" is false, course days unlock in the evening. `moodTrend.ts:811` already has a correct local `dayKey`. Fix: add `export const localDateKey = (d = new Date()) => …` to `streakLogic.ts` (pure, tested) and replace every `toISOString().split('T')[0]` used as a date key. Existing stored dates keep working (they are already "somewhere within a day").

**6. Sessions die when the screen locks.** No `expo-keep-awake` in `package.json`; `soundscape.ts:48,107` sets `staysActiveInBackground: false`; the session runs on `setInterval` (`BreatheScreen.tsx:150-185`), which the OS suspends in background. A user who starts 10 minutes, puts the phone down and closes their eyes gets no end bell, no XP, and later a "resume?" banner. For a meditation app this is the core loop. Fix: `useKeepAwake()` while `mode === 'session'` and while a guided meditation plays; set `staysActiveInBackground: true` (plus `UIBackgroundModes: ['audio']` in `app.json` for iOS) so soundscapes and the end bell keep playing if the user does lock the phone; compute remaining time from a wall-clock deadline (`endsAt = Date.now() + secs*1000`) instead of decrementing, so a suspended timer still ends at the right moment when the app resumes. Same pattern for `GuidedMeditationScreen.tsx` (its `setTimeout` chain also stops).

**7. Notifications: English only, one message forever.** `scheduleDailyReminder` picks one random message at scheduling time and schedules a DAILY repeating trigger with that fixed body. So the user gets the same sentence every day until they touch the toggle. The pool and the personalized copy are English and use the English rank name. The channel name is English. Also `channelId` is never passed (`scheduleNotificationAsync` content has no `channelId`), so on Android the reminder lands in the default "Miscellaneous" channel and the `clarmind-daily` channel is unused. Fix: localize via `translate` (Appendix C keys), pass `channelId: 'clarmind-daily'` in the content, and reschedule on every app open (`AppNavigator.tsx` first-entry effect already has the plumbing) so the message rotates and stays in the current language. Consider a second, smarter trigger (Part 3, idea 1).

**8. Nominatim autocomplete.** OpenStreetMap's Nominatim usage policy lists "auto-complete search" under unacceptable use and caps at 1 request/second with a valid identifying User-Agent. `CityAutocomplete.tsx` queries on every keystroke after 450 ms; with a few hundred users you will be rate-limited or blocked by UA, and then `placeSearch` returns `[]` (silent) and `geocodePlace` returns `null` (silent), which downgrades every birth chart to "no houses" and the approximate ascendant. Fix: switch the typeahead to **Photon** (`https://photon.komoot.io/api/?q=…&lang=…&limit=6`, free, explicitly built for autocomplete, no key) or Geoapify's free tier (3,000/day). Keep one-shot geocoding but move it behind the proxy with a KV cache (`place → lat/lon`) so repeat lookups never hit the upstream. Honor the user's language in `lang=`.

**9. Store compliance checklist.** Items that commonly cause rejection:
   - **Account deletion.** Apple 5.1.1(v) and Google's account-deletion policy require in-app deletion when accounts can be created. `AccountModal.tsx` has sign out only. Add "Delete account" (Supabase: an Edge Function with the service role, or `rpc('delete_user')`), plus a web URL for the Play Data Safety form.
   - **Sign in with Apple.** Apple 4.8: if you offer Google sign-in you must offer Sign in with Apple, and it must work. The button exists (`AccountModal.tsx:113`) but Apple OAuth is not configured. Either finish it (Apple developer setup + Supabase provider) or hide both OAuth buttons at launch and ship email/password only.
   - **Paywall content.** Apple 3.1.2 requires the paywall to show price, billing period, that it auto-renews, and links to Terms of Use and Privacy Policy. `PaywallModal.tsx` shows price and "/month" only. Add the two links (`PRIVACY_URL`, `TERMS_URL` already exist) and a one-line renewal disclosure (Appendix C key `paywall.legalNote`).
   - **iOS localizations.** `app.json` has no `locales` and no `CFBundleLocalizations`, so App Store Connect lists English only and the microphone / speech prompts from the `expo-speech-recognition` plugin are English for everyone. Add `"locales": {"es": "./locales/es.json", …}` with the two permission strings translated, and `ios.infoPlist.CFBundleLocalizations: ["en","ro","it","fr","es","de","pt"]`.
   - `eas.json` `appleTeamId: "REPLACE_WITH_TEAM_ID"`.
   - `app.json` missing `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` (every TestFlight upload will ask about export compliance).
   - `android.versionCode: 2` while 1.6.3 shipped as versionCode 4 (`git log`). EAS remote `autoIncrement` covers EAS builds, but any local Gradle build will produce an APK Play rejects. Bump to 5.
   - `package.json` version 1.6.0 vs `app.json` 1.7.1 vs Profile footer "v1.6.0".

**10. Birth time treated as UTC.** `birthChart.ts:373` `dayNumber(dob, hour, minute)` feeds `hour` straight into the UT fraction. Users enter local birth time. Bucharest is UTC+2/+3, Lisbon UTC+0/+1, São Paulo UTC−3, so the Ascendant (which moves one sign every ~2 hours) is wrong for a large share of users, and the Moon sign is off by up to ~6°. The Numerology screen now shows this same value on the "Big Three" card. Fix: derive the IANA zone from the geocoded coordinates (`tz-lookup`, 70 kB, offline) and convert local → UT with `Intl.DateTimeFormat(…, {timeZone})` (Hermes on RN 0.81 ships full Intl). Without coordinates, fall back to the device zone and say so in the UI. Also note `NumerologyScreen.tsx:259` uses the self-selected `profile.zodiacSign` as "Sun", not the computed Sun longitude; if the user picked the wrong sign in onboarding the card contradicts the natal wheel. Compute Sun from the chart and, if it differs from `profile.zodiacSign`, offer to correct the profile. Validate three known charts (including one southern-hemisphere birth) against cafeastrology after the fix; there are tests but they encode the current UT assumption.

### 2.2 P1: users will hit these in week one

**11. Leaderboard integrity and abuse.** `leaderboard-worker/worker.js` accepts any `name` (40 chars, no filter) and any `xp/streak/totalMinutes` up to 10,000,000 from anyone who can POST JSON. No rate limit. Expect offensive names and impossible scores on day one, which is exactly the kind of screenshot that ends up in a 1-star review. Fix: server-side plausibility (`streak ≤ days since the row's first insert + 1`, `totalMinutes ≤ 24*60*days`, `xp ≤ totalMinutes*10 + 200*days`), a small profanity list, per-device rate limit (1 write/min), and hide rows that fail. Longer term, sign submissions with the device id + a server-issued token.

**12. Fake leaderboard users.** When the remote board is unset or the fetch fails, `buildLeaderboard` shows 14 seeded Romanian names as if they were real people (`leaderboard.ts:13-17`). Now that the real board exists, either remove the fakes, or label the section "sample community" when offline. Undisclosed fake users are an easy "this app is fake" review.

**13. Home has no content fallback.** `HomeScreen.loadContent` regenerates on day change or language change and, if `generateDailyContent` throws (proxy down, quota exhausted, Gemini returns truncated JSON, or a `JSON.parse` failure), shows an error box and discards the cached content it already had. On first launch with no network, Home is empty except an error. Fix: keep the last good content on screen while regenerating and swap only on success; ship a bundled offline pack (`assets/fallback/daily.<lang>.json`, ~10 quotes / affirmations / tips per language) chosen by date so Home is never empty; retry with backoff. Use `response_mime_type: 'application/json'` in `generationConfig` to make Gemini emit valid JSON and avoid the fence-stripping.

**14. Premium flag can be false on cold start.** `App.tsx:50` calls `configurePurchases()` without awaiting. `isPremium()` reads `getCachedPremium()`, which is `false` until RevenueCat's `getCustomerInfo()` resolves. `NumerologyScreen` and `GuidedMeditationScreen` check once on mount, so a paying subscriber who opens Numerology right away sees the paywall until they back out and reopen. Fix: `await Promise.race([configurePurchases(), timeout(3000)])` before `setAppReady(true)`; also call `refreshPremium()` on `AppState` active. Related: `purchases.ts:14-20` refuses `test_` keys in release builds, so if `EXPO_PUBLIC_REVENUECAT_KEY` is still the test key at submission, Premium is silently unavailable and the paywall says "Subscriptions aren't set up yet" to real customers. Make the production key a launch checklist item, and make `paywall.unavailable` a neutral "Premium is coming to this platform" message.

**15. Stale closure when resuming a session.** `BreatheScreen.tsx:214-229` `resumeAbandoned` calls `setPattern(p)` then `startTimers()` synchronously; `startTimers` closes over the old `pattern`. If the abandoned session was 4-7-8 (3 phases) while Box (4 phases) is currently selected, phase advance uses `% 4`, `phaseIndex` reaches 3, and the effect at `:234-238` reads `pattern.phases[3].duration` on a 3-phase pattern: `TypeError: Cannot read property 'duration' of undefined`, crash. Fix: pass the pattern into `startTimers(p)` or keep it in a ref. While there: `finishSession()` is called from inside the `setSecondsLeft` updater (`:153-156`); side effects in updaters run twice under StrictMode and are fragile. Move the check to an effect on `secondsLeft`.

**16. Cloud sync can silently destroy progress.** `sync.ts` is whole-blob newest-wins and `syncOnLogin` runs on **every app start** when signed in. Scenario: phone A backs up at 09:00; user meditates on phone B (offline, or before B synced) at 10:00; B's next start finds cloud (09:00) newer than B's `lastSync` (never) and **restores**, wiping B's session. Two-device users will lose data. Also the blob includes `clarmind_premium_override`, daily `clarmind_ai_usage_*` counters and the per-day numerology cache. Fix for launch: merge instead of replace for the append-only collections (sessions, moods, reflections: union by `completedAt`/`date`), take max for XP/streak, exclude override and usage keys, and only auto-restore when local has no activity since `lastSync`; otherwise ask.

**17. Mental-health data privacy.** Clara transcripts (`clarmind_chat_history`) and mood/reflection entries are plaintext in AsyncStorage, exported in backups, and synced to Supabase. The real name is uploaded to a public leaderboard on the first visit to the Top tab with no consent step (`LeaderboardScreen.tsx:39-49`). `public/privacy.html` does mention these flows (good), but: (a) add a one-time "Show me on the leaderboard as <name>? [Use a nickname]" prompt; (b) exclude chat history from cloud sync unless the user opts in; (c) add "Delete my data" alongside account deletion.

**18. Store listing and marketing copy are stale.** `legal/STORE_LISTING.md` Data Safety answers say "no backend", "no third-party analytics SDKs", "data never leaves the device", "no account required", "zodiac signs in English and Romanian", support email `george.pecherle@gmail.com` (the legal pages say `stillnova.support@gmail.com`), privacy URL placeholder. `landing/index.html` says "Free: 3 messages a day" (it is 5) and "Available in five languages" (seven). `scripts/web-postbuild.js:22` still sets the PWA `NAME = 'ClarMind'`, so the installable web app is called ClarMind on the home screen. `README.md`, `SHIPPING.md`, `WEB.md`, `CLAUDE.md` still describe ClarMind, Gemini 2.0, EN/RO only, "no backend". Future agents will regress against stale docs; refresh `CLAUDE.md` in particular.

**19. Git repository bloat.** Twelve APKs are tracked (`ClarMind-1.6.0.apk` is 89 MB, the rest ~43 MB each); `.git` is 502 MB. GitHub's hard limit is 100 MB per file, clones are slow, and the CI checkout downloads it all on every deploy. Fix: `git rm --cached *.apk`, add `*.apk` and `*.aab` to `.gitignore`, and rewrite history with `git filter-repo --path-glob '*.apk' --invert-paths` (coordinate since it changes hashes). Attach APKs to GitHub Releases instead.

**20. Accessibility.** The whole app has 6 accessibility props (4 in the tab bar, 2 in the calibration modal). Missing: `accessibilityRole="button"` and labels on every `TouchableOpacity` (close ✕, gear, mic, send, speak, mood emoji, chips, matrix nodes, FAB), `accessibilityState={{selected}}` on chips/tabs, labels on the five `Switch` rows (`accessibilityLabelledBy` or wrap in a labelled Pressable), `accessibilityLiveRegion` for the XP toast and phase label, and `reduceMotion` respect (`AccessibilityInfo.isReduceMotionEnabled`) for the breathing circle and skeleton shimmer. Contrast: `COLORS.textDim` on the dark gradient is below 4.5:1 for 11 to 12 px text (badge descriptions at 9 px are the worst). Fixed widths (`mixerLabel width: 110`, `pName width: 92`, `facetLabel width: 110`) clip at larger font sizes. A screen-reader user cannot complete onboarding today (zodiac cards have no labels). Budget: one day for roles/labels, half a day for reduce motion and contrast.

**21. Unbounded storage growth.** Per-day keys are written and never pruned: `clarmind_ai_usage_<date>` (`entitlements.ts`), `clarmind_numerology_<date>_<lang>` (`numerologyReading.ts`), `clarmind_geo_<place>`, `clarmind_course_*`. They accumulate forever, are all included in every backup/sync blob, and on web they share the ~5 MB `localStorage` budget with everything else. Add a `pruneOldKeys()` on app start that removes date-keyed entries older than 7 days.

### 2.3 P2: fix soon after launch

**22. AI quota only counts Clara and guided meditation.** Daily content, numerology reading, courses, insights, mood scan and weekly reflection are uncounted, and language switches regenerate several of them. The "AI Usage Today" card therefore under-reports. TODO P3 already says "cover ALL AI calls". Until the proxy enforces a server-side limit (item 3), client quotas are advisory anyway.

**23. Weekly insight cache ignores language** (`insights.ts:88`). Add `language` to the cached object and regenerate on mismatch.

**24. Guide-read XP depends on scrolling to the bottom** (`HomeScreen.tsx:157-172`). On tall screens, tablets and wide web the content fits without scrolling, so the XP and the "read-guide" challenge are unreachable. Also `challenges` in that closure can be stale. Award when the last card becomes visible (`onLayout` + `onScroll` with `IntersectionObserver`-style logic) or simply after N seconds on screen.

**25. "Day streak" counts app opens, Sky counts sessions.** `updateStreak` runs on Home mount; a user who opens the app daily without meditating has a growing "day streak", a `streak-7` badge and Stardust Shields, but an empty Sky. Decide what a streak means (recommend: a session day) and label accordingly; the current setup is easy to game and confusing.

**26. Language switch regenerates immediately with no cache reuse.** Switching es → en → es regenerates twice. Cache daily content per language (`clarmind_daily_content_<lang>`) so switching back is free and the rate limit can be relaxed.

**27. Web navigation.** `NavigationContainer` has no `linking` config: refresh always lands on Home, the browser back button exits the app, and tab URLs cannot be shared. `Dimensions.get('window')` at module scope in `OnboardingScreen.tsx:16`, `FloatingClara.tsx:354`, `GuideOverlay.tsx:509` is wrong after resize or rotation (FAB can end up off-screen; onboarding card widths wrong on tablets). `GuideOverlay` spotlights a phone tab bar that does not exist in the wide-web sidebar layout. `expo-notifications` runs `setNotificationHandler` at import on web (`notifications.ts:7`); wrap in `Platform.OS !== 'web'`.

**28. Android keyboard.** `ClaraScreen.tsx:138` and `NumerologyScreen.tsx:147` use `KeyboardAvoidingView behavior="padding"` while `app.json` uses `softwareKeyboardLayoutMode: "pan"`; on Android that can double-shift. Use `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` (Onboarding already uses the custom `useKeyboardHeight` hook, which is the pattern to standardize on).

**29. Silent failures that hide real problems.** 29 empty `catch {}` blocks. Most are fine (best-effort haptics, audio unload). These are not: `purchases.configurePurchases` failure (Premium silently off), `sync.pushUserData` returning `false` with no UI, `backupIfSignedIn`, `insights` and `courses` swallowing Gemini errors (user just sees a fallback with no hint), `AccountModal` OAuth errors shown raw. Add a `reportError(e, ctx)` helper that logs in dev and sends a breadcrumb to analytics (opt-in respected), and add crash reporting (`@sentry/react-native` free tier) before launch; launch week without crash visibility is blind.

**30. No CI for tests/typecheck.** `.github/workflows/deploy-web.yml` builds and deploys web on every push to `main` but never runs `npm test` or `tsc`. Add a job (2 minutes). Also `jest` reports "a worker process has failed to exit gracefully" (leaked timer, likely `fadeOutMix`/`setTimeout` in a test); run once with `--detectOpenHandles`.

**31. Notification permission timing.** `AppNavigator.tsx:120-131` fires the OS permission prompt immediately after onboarding with no explanation. Opt-in rates roughly double with a pre-prompt ("Want a gentle daily reminder at 9:00?") and asking after the first completed session.

**32. Onboarding asks for the zodiac sign, then later for the birth date.** Ask for the date of birth (one picker), derive the sign, and let the user confirm; it removes a step and prevents the sign/DOB contradiction in item 10.

**33. Remote leaderboard rank.** `fetchTop` returns 25 rows; if the user is not in them they are appended as row 26 with no real rank. Return the user's rank from the worker (`SELECT COUNT(*) WHERE xp > ?`).

**34. expo-av is deprecated** (removed in SDK 55). Plan the migration to `expo-audio` for the mixer, chimes and cloud TTS playback after launch.

**35. Dead code and duplicates.** `clara.ts:6` `CLARA_DAILY_LIMIT` and `:80` `claraOpeners` (unused; the limit lives in `entitlements.ts`, the opener in i18n). `storage.ts:320-333` `getClaraCount` / `incrementClaraCount` (unused). `soundscape.ts:41-95` single-sound API (`playSoundscape`, `stopSoundscape`, `fadeOutSoundscape`, `setSoundscapeVolume`) superseded by the mixer; `Soundscape.name` unused. `constants/achievements.ts` `name`/`description` and `LEVELS[].rank` English copies are shadowed by i18n (only `rank` is still read, wrongly, by `notifications.ts`). `challengeLogic.ts` `text` and `breathing.ts` `name`/`description` likewise. `XP.STREAK_7_BONUS` never awarded. Unused styles: `ProfileScreen` `langToggle`, `langChip`; `OnboardingScreen` `stepContainer`, `langToggle`, `langChip*`; `HomeScreen` `center`, `loadingText`; `NumerologyScreen` `row3`, `smallInput`, `lineTile`. `entitlements.isFeatureLocked(_feature)` ignores its argument. `IMPROVEMENTS.md` and `legal/privacy-policy.md` / `legal/index.html` are historical; mark or delete.

**36. Minor correctness.** `BreatheScreen.phaseLabel` maps on the English label strings (`'Breathe in'`), fragile; map on an enum. `SkyScreen.tsx:778` computes "yesterday" from UTC too. `HomeScreen.tsx:97` `today` is computed per render; fine but should use the same helper. `GuideOverlay` `BAR_HEIGHT = 62` is a magic number duplicated from the tab bar. `CosmicEnergyCard` `useMemo` dependency `new Date().toDateString()` creates a new string each render (works, but the memo never actually caches across renders).

### 2.4 Platform-specific notes

**Android**
- Edge-to-edge + `adjustPan` is set; verify Clara and the birth-details form on a small phone (item 28).
- Notification channel unused (item 7). Android 13+ runtime permission is handled by `requestPermissionsAsync`.
- Hardware back in a session `Modal` calls `cancelSession` without confirmation; acceptable because the in-progress snapshot allows resume, but a "Leave session?" confirm is friendlier.
- `elevation` shadows on `LinearGradient` cards render as hard edges on some OEM skins; test on a Samsung.

**iOS**
- Keep-awake and background audio (item 6). `playsInSilentModeIOS` is set, good.
- Sign in with Apple, account deletion, paywall links, localizations, encryption flag (item 9).
- `expo-speech-recognition` plugin strings are English only until `locales` is added.
- DateTimePicker `display="spinner"` plus a "Done" button is correct for iOS.
- Haptics on the phase transitions: on iPhones with Reduce Motion or Haptics off, `impactAsync` rejects; already caught.

**Web**
- `Alert.alert` no-op (item 4) is the big one.
- Purchases are inert; the paywall should say "Premium is available in the iOS and Android apps" with store badges, not "subscriptions aren't set up yet".
- `localStorage` ~5 MB cap shared by everything (item 21).
- Speech recognition works in Chrome/Edge only (already handled). TTS via the proxy works.
- PWA is named ClarMind (item 18).
- No `linking`, module-scope `Dimensions` (item 27).

### 2.5 Security summary

- Gemini key is server-side (good). Proxy is open (item 3).
- Supabase anon key + RLS on `user_data` is correct. Enable "confirm email" and set a password policy in the Supabase dashboard; the client only checks length ≥ 6.
- Leaderboard worker: no auth, no validation (item 11).
- `importData` accepts any `clarmind_*` key from pasted JSON, including `clarmind_premium_override` and `clarmind_device_id` (leaderboard identity takeover if someone shares a backup). Whitelist keys on import.
- PostHog key is public by design; events carry no PII beyond the device UUID (good).
- `.env` is gitignored; `dist/` is ignored. Old Gemini key was rotated per TODO.

---

## 3. Feature ideas (prioritized)

Effort: S = ≤ 1 day, M = 2 to 4 days, L = 1 to 2 weeks. Ordered by expected impact on retention (R), Premium conversion (C) and word of mouth (W) for a solo developer.

| # | Feature | Why it matters | Effort | Levers |
|---|---|---|---|---|
| 1 | **Streak-at-risk evening reminder.** At 20:00 local, if no session today: "Your 12-day streak ends at midnight. 2 minutes keeps it alive 🔥". Uses the shield status. Fully local, no backend. | The single highest-leverage retention mechanic in habit apps (Duolingo attributes a large share of D7 to it). You already have the data. | S | R |
| 2 | **Aha-moment onboarding.** Ask DOB (derive the sign), goal, then show a personalized horoscope + affirmation *before* the tab bar appears, then the notification pre-prompt. Today the first screen after onboarding is a skeleton loader plus a 7-step tour. | Onboarding completion and D1 retention. Target: first personalized content in < 45 seconds. | S/M | R, C |
| 3 | **Annual plan + 7-day trial** (see Part 4). | Doubles LTV; trials convert 3 to 5× better than a cold monthly buy. | S (RevenueCat offerings) | C |
| 4 | **Post-session mood delta + shareable card.** "You went from 😟 to 😌 in 5 minutes." Auto-generate a branded card (you already have `ShareCardModal` + `view-shot`). | Tangible proof of value, and the share is organic acquisition. | S | R, W |
| 5 | **Daily quote / affirmation share card** (Stories format 1080×1920) with a small watermark. | This is how astrology apps (Co-Star, The Pattern) grew: screenshots of daily readings. Make the screenshot beautiful and pre-cropped. | S | W |
| 6 | **Compatibility reading** (two signs, or two birth charts for Premium): friendship / romance / work, AI-written, shareable. | The highest-sharing feature in the astrology category; every reading involves a second person by definition. Premium hook for the birth-chart version. | M | W, C |
| 7 | **Friends & private leagues** via invite code (Supabase table `friendships`, reuse the leaderboard shape). | Turns the leaderboard from fake strangers into real accountability; the strongest long-term retention lever after reminders. | M/L | R, W |
| 8 | **Sleep stories / sleep meditation** using the guided-meditation engine + sleep fade, with a longer 15/20-minute option. | "Sleep" is the largest search intent in the category and the #1 onboarding goal. Premium-only. | M | C, R |
| 9 | **Monthly and "year ahead" forecast** (AI, Premium), delivered on the 1st with a push. | Recurring reason to keep paying; astrology users expect it. | S/M | C |
| 10 | **Referral: give 7 days Premium, get 7 days.** RevenueCat promotional entitlements + a code. | Cheap acquisition loop in a niche with strong word of mouth. | M | W, C |
| 11 | **Apple Health / Health Connect "Mindful Minutes"** write. | Trust signal, Apple featuring criterion, rings closing. | M (native module or `react-native-health`) | R |
| 12 | **Buy a Stardust Shield** (consumable IAP, €0.99) when a streak is about to break, plus "streak repair" the day after. | Small revenue line; a proven habit-app monetizer. | S | C |
| 13 | **Home-screen widget** (streak + today's affirmation). | Daily impression without opening the app. | L (Expo Apple targets / Glance) | R |
| 14 | **Seasonal / lunar content packs** (New Moon intentions, Full Moon release ritual) with a special badge. | You already detect the events; give them a 3-minute ritual and a badge. | S | R |
| 15 | **Localized ASO landing pages** (7 languages) on GitHub Pages linking to the stores. | Free organic traffic in the smaller languages where competition is thin. | S | W |

Skip for now: watch app, full social feed, productivity planner (off-theme, as TODO already noted).

---

## 4. Monetization, ads and go-to-market

### 4.1 Unit economics at $5/month (why paid acquisition is hard right now)

Assumptions (category benchmarks for meditation/astrology apps with an onboarding paywall):

| Metric | Typical range | Use for planning |
|---|---|---|
| Install → trial start (paywall shown in onboarding) | 5 to 12% | 8% |
| Trial → paid (7-day trial, annual) | 30 to 50% | 40% |
| Install → paid, monthly with no trial (today's setup) | 1.5 to 3% | 2.5% |
| Monthly churn (monthly plan) | 8 to 15% | 12% |
| Annual renewal rate | 35 to 50% | 40% |
| Store fee (Apple Small Business Program / Google 15% tier) | 15% | 15% |

Today (monthly only, no trial): net revenue per paying user ≈ $5 × 0.85 = $4.25/month; expected lifetime ≈ 1/0.12 ≈ 8 months; **LTV ≈ $34 per subscriber**, **≈ $0.85 per install** at 2.5% conversion. To pay back inside 6 months you can afford roughly **$0.50 CPI**. Benchmarks: TikTok EU tier-2 $0.30 to $1.20, Meta EU/US $1 to $3, Apple Search Ads $1 to $3 per tap ($5 to $15 per install). Paid acquisition does not pay back on the current pricing. Conclusion: fix the offer first (annual + trial), then buy traffic.

With annual ($29.99, effectively $2.50/month) + 7-day trial: 8% trial × 40% = 3.2% install → paid; average first-year net ≈ 0.65 × $29.99 × 0.85 (annual) + 0.35 × $34 (monthly) ≈ $16.6 + $11.9 ≈ **$28 per payer**, plus ~40% renewals. **LTV per install ≈ $0.90 to $1.10, and 65% of it is collected upfront**, which makes a $0.60 to $0.80 CPI viable with a 30-day payback instead of 6 months. That upfront cash is what funds the next ad cycle.

### 4.2 Pricing and paywall experiments (in order)

1. **Add annual at $29.99 (or €29.99) with a 7-day free trial, preselected. Keep monthly at $4.99 with no trial.** Show the price per month ("$2.50/mo, billed yearly") and "Save 50%". This alone is the biggest revenue lever available.
2. **Paywall placement.** Show the full paywall once at the end of onboarding (after the aha content, before the tab bar), then again at intent moments: first tap on the Birth Chart, Clara's 6th message, first "Guided meditation" tap. Track `paywall_view` with a `source` property (you already capture it).
3. **Blurred teaser** on the natal wheel and the Destiny Matrix (render, then blur with a lock) instead of a text-only lock screen. Curiosity converts astrology users.
4. **Regional pricing.** Use store price tiers: Romania €2.49/€19.99, Brazil R$ 9.90/R$ 59.90, Spain/Italy/Portugal €3.99/€24.99, DE/FR/US full price. Play and App Store both support per-country pricing; RevenueCat surfaces the localized `priceString` automatically (already used in `PaywallModal`).
5. **Launch-week lifetime offer** $49.99 (optional, limited 14 days): converts the fans, funds ads.
6. **A/B via RevenueCat Experiments** (free): A = monthly+annual, B = annual only with trial; then trial length 3 vs 7 days; then $29.99 vs $39.99 annual. One experiment at a time, minimum 300 paywall views per arm.
7. **Win-back**: on cancellation (RevenueCat webhook → Supabase → in-app banner), offer 50% off 3 months. Store-native offers (Apple promotional offers / Play offers) work here.

### 4.3 In-app ads

Do **not** put banner or interstitial ads in a calm/premium app at launch; they lower ratings and Premium conversion more than they earn (category eCPM $3 to $8, ~$0.05 to $0.15 per free user per month). The one format that works in this niche is **rewarded**: "Watch a 30-second ad to unlock 3 more Clara messages today" for free users who hit the limit. It monetizes the non-payers and nudges the payers. Add after launch, behind a remote flag, and only if free-user volume exceeds ~10k MAU; below that it is not worth the SDK weight.

### 4.4 Paid acquisition plan (first 60 days)

Start small, in the cheapest markets where you have a language advantage, and only scale what pays back.

**Month 1 budget: €600 total.** Split:

| Channel | Budget | Targeting | Why |
|---|---|---|---|
| **TikTok Ads (Spark Ads)** | €250 | Romania first (CPI ~€0.20 to €0.50), then Spain + Italy + Portugal, women 18 to 34, interests: astrology, horoscope, self-care, sleep, meditation | Cheapest CPI in the category; astrology content is native to the platform. |
| **Meta (Instagram Reels + Stories, Advantage+ app campaigns)** | €200 | Romania, Spain, Italy; women 22 to 40; lookalike from PostHog "session_complete" exports later | Best targeting once you have 50+ purchase events to optimize against. |
| **Apple Search Ads (Basic → Advanced)** | €150 | Exact match, RO/ES/IT/PT: "horoscop zilnic", "meditatie ghidata", "respiración 4-7-8", "oroscopo del giorno", "meditación para dormir", plus brand "stillnova" | High intent, cheapest US-alternative; run in the small markets where CPT is €0.30 to €0.80. |

Kill/scale rules: kill any ad set with CPI > €1.20 after €40 spend; kill any creative with install → trial < 5% after 100 installs (that is a paywall problem, not a traffic problem); scale winners +30%/day. Do not touch US/UK/DE with paid until the funnel converts ≥ 3% install → paid in cheap markets; those CPIs are 3 to 5×.

**Month 2:** €1,000 to €1,500 if payback ≤ 60 days on the winners; add Google App Campaigns (Play install optimization) for Android, which is your primary platform in RO/ES/IT/PT/BR.

### 4.5 Creative angles (test 6 to 8, 15 to 20 s each, vertical, captions, no voice needed)

1. **"Your horoscope, but it actually knows you"**: screen recording of onboarding → personalized reading with the user's name. (Personalization is your differentiator vs Co-Star.)
2. **The birth chart reveal**: type birth details → the natal wheel draws itself → tap a planet → interpretation. ASMR-style, no text needed.
3. **"Breathe with me for 30 seconds"**: the breathing circle full screen with 4-7-8, hook text "can't sleep? try this". Native TikTok behavior; ends with the star lighting up in the Sky.
4. **Streak/Sky progression**: 30 days of a Sky filling into a constellation in 5 seconds.
5. **Clara conversation**: a relatable message ("I'm overthinking everything tonight") and her calm reply, subtitles in the target language.
6. **Numerology "what's your Life Path number"**: interactive hook ("comment your birthday"), converts extremely well for astrology audiences.
7. **UGC-style review**: a person saying what changed in a week (use TikTok Creator Marketplace micro-creators in RO/ES for €50 to €150 each; Spark-boost the best one).
8. **Language-native cut** for every winner: the same video with local subtitles for ES/IT/PT/DE/FR.

### 4.6 Organic and ASO

- **Name and subtitle.** App Store title (30 chars): `Stillnova: Calm & Horoscope`. Subtitle: `Breathe, sleep & daily astrology`. Google Play title: `Stillnova: Meditation & Horoscope`, short description: `Daily horoscope, guided breathing, sleep & an AI calm companion.`
- **Keyword field (100 chars, no spaces, no repeats of title words):** `mindfulness,breathing,zodiac,natal,chart,numerology,anxiety,stress,relax,focus,mood,journal,affirmation`
- **Localize the listing in all 7 languages** (title, subtitle, keywords, screenshots captions). Localized listings are the cheapest ASO win in small markets: "horoscop", "oroscopo", "horóscopo", "Horoskop" are high-volume, low-competition terms compared to English "horoscope".
- **Screenshots (6, in this order):** 1) personalized daily horoscope + quote with the user's name, 2) breathing circle mid-session, 3) natal wheel, 4) Clara chat, 5) Sky constellation + streak, 6) Premium benefits. First two must sell without reading.
- **Ratings prompt** (`expo-store-review`) after the 3rd completed session, never at launch time. Target 4.6+ before spending on ads (ratings move CPI by 20 to 40%).
- **Web SEO**: the existing GitHub Pages site plus 7 localized landing pages with the store badges and 300 words of copy each; link from every share card.
- **Category:** Health & Fitness primary, Lifestyle secondary (astrology apps live in Lifestyle; test the swap after 60 days).

### 4.7 Metrics to watch (weekly) and targets

| Metric | Source | Launch target | Good |
|---|---|---|---|
| Onboarding completion | PostHog `onboarding_complete` / `app_open` (first) | > 65% | > 80% |
| D1 / D7 / D30 retention | PostHog cohorts | 35 / 15 / 7% | 45 / 22 / 12% |
| Sessions per active user per week | `session_complete` | 2.5 | 4 |
| Install → trial start | RevenueCat | 6% | 10% |
| Trial → paid | RevenueCat | 30% | 45% |
| Install → paid (blended) | RevenueCat / installs | 2% | 4% |
| Monthly churn (monthly plan) | RevenueCat | < 15% | < 9% |
| ARPU (per install, 90 days) | RevenueCat | $0.60 | $1.20 |
| CAC (per paying user) | Ad spend / new payers | < $25 | < $15 |
| LTV / CAC | | > 2 | > 3 |
| Payback period | | < 90 days | < 45 days |
| Crash-free sessions | Sentry | > 99% | > 99.5% |
| Store rating | | 4.5 | 4.7 |

Instrumentation needed before spending: add `paywall_view {source}`, `trial_start`, `purchase_success {plan}`, `purchase_fail`, `onboarding_step {n}` events; connect the RevenueCat → PostHog integration (built in) and the Apple Search Ads / TikTok / Meta attribution via RevenueCat's attribution fields (no MMP needed at this budget).

### 4.8 Ninety-day revenue sketch (conservative)

| Month | Spend | Paid installs | Organic installs | Blended paid conv. | New payers | MRR added (net) |
|---|---|---|---|---|---|---|
| 1 | €600 | 1,200 (€0.50) | 800 | 2.5% | 50 | ≈ €150 (mix of annual cash and monthly) |
| 2 | €1,200 | 2,200 | 1,500 | 3% | 110 | ≈ €330 |
| 3 | €2,000 | 3,300 | 2,500 | 3.5% | 200 | ≈ €600 |

Cumulative net revenue after 90 days ≈ €2,000 to €3,000 on €3,800 spend, with ~65% of it collected upfront from annual plans and the cohort still paying. That is break-even by month 4 or 5 if churn behaves, which is normal for this category. If install → paid stays below 2% after month 1, stop buying traffic and fix the paywall and onboarding; the numbers above only work with the annual + trial change and the P0 fixes shipped.

---

## Appendix A: locale parity test (drop-in)

Save as `src/i18n/__tests__/parity.test.ts`. It fails today (263 missing keys per locale, plus dashes) and will pass once Appendix B is merged and the dashes are swept.

```ts
// Every locale must mirror en.ts exactly: same keys, no empty values, same
// {placeholders}, and no em/en dashes (house rule). This is the guard that
// stops "Spanish shows English" from shipping again.
import { en } from '../en';
import { ro } from '../ro';
import { it } from '../it';
import { fr } from '../fr';
import { es } from '../es';
import { de } from '../de';
import { pt } from '../pt';
import { lookup } from '../interpolate';

const LOCALES: Record<string, any> = { ro, it, fr, es, de, pt };

const paths = (obj: any, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? paths(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

const placeholders = (s: string): string[] =>
  (s.match(/\{(\w+)\}/g) ?? []).sort();

const enPaths = paths(en).sort();

describe.each(Object.entries(LOCALES))('locale %s', (code, dict) => {
  it('has every key that en has', () => {
    const missing = enPaths.filter((p) => lookup(dict, p) === undefined);
    expect(missing).toEqual([]);
  });

  it('has no keys that en lacks', () => {
    const extra = paths(dict).filter((p) => lookup(en, p) === undefined);
    expect(extra).toEqual([]);
  });

  it('has no empty values', () => {
    const empty = paths(dict).filter((p) => String(lookup(dict, p)).trim().length === 0);
    expect(empty).toEqual([]);
  });

  it('keeps the same {placeholders} as en', () => {
    const bad = enPaths.filter((p) => {
      const a = lookup(en, p);
      const b = lookup(dict, p);
      return typeof a === 'string' && typeof b === 'string' &&
        placeholders(a).join(',') !== placeholders(b).join(',');
    });
    expect(bad).toEqual([]);
  });

  it('contains no em or en dashes', () => {
    const dashed = paths(dict).filter((p) => /[–—]/.test(String(lookup(dict, p))));
    expect(dashed).toEqual([]);
  });
});

describe('en itself', () => {
  it('contains no em or en dashes', () => {
    expect(enPaths.filter((p) => /[–—]/.test(String(lookup(en, p))))).toEqual([]);
  });
});
```

Also add to `package.json` scripts: `"i18n:check": "jest src/i18n"` and run it in CI.

A second, cheaper guard: change the five partial files from `DeepPartial<TranslationShape>` to `TranslationShape` once Appendix B is merged, so `npm run typecheck` fails on any future missing key.


## Appendix B: drafted translations for the 263 missing keys

How to use: each block below has the same nesting as `en.ts`. For sections that already exist in the locale file (`common`, `profile`, `clara`, `reflection`) merge the listed keys into the existing object; for the others paste the whole section. Placeholders (`{n}`, `{min}`, …) and emoji are kept identical to `en.ts`. No em or en dashes. These are drafts written by me in one pass; they are fluent and consistent with the existing style of each file, but a native read-through before launch is worth an hour per language. Two notes: `numerology.lockedHint` and `paywall.unavailable` are translated for parity but should be removed from production copy (Part 2, item 2). "Box Breathing" / "Deep Calm" names match what each locale file already uses under `patterns.*`.

### B.1 Spanish (`src/i18n/es.ts`)

```ts
  common: { /* merge */ cancel: 'Cancelar', close: 'Cerrar' },
  paywall: {
    title: 'Stillnova Premium',
    subtitle: 'Desbloquea todo el cosmos',
    benefit1: 'Numerología completa y Matriz del Destino',
    benefit2: 'Carta natal completa (rueda natal)',
    benefit3: '50 mensajes con Clara al día',
    benefit4: 'Todas las funciones premium futuras',
    cta: 'Suscribirse',
    perMonth: '/mes',
    restore: 'Restaurar compras',
    unavailable: 'Las suscripciones aún no están configuradas. Por ahora usa el desbloqueo de prueba de abajo.',
    maybeLater: 'Quizás más tarde',
    thanks: 'Ya eres Premium, disfrútalo ✨',
    upgrade: 'Pasar a Premium',
  },
  moodScan: {
    entry: '¿Cómo te sientes?',
    entrySub: 'Dilo en voz alta y recupera un momento de calma',
    title: 'Check-in',
    prompt: 'Toca el micrófono y di cómo te sientes, o escríbelo.',
    placeholder: '¿Cómo te sientes ahora mismo?',
    listening: 'Escuchando…',
    analyze: '✨ Reflexionar',
    analyzing: 'Reflexionando…',
    suggested: 'Prueba: {pattern}',
    fallback: 'Gracias por pasar a saludar. Respira despacio una vez: estás aquí, y con eso basta.',
  },
  insights: {
    title: 'Perspectivas',
    loading: 'Leyendo tus patrones…',
    fbStart: 'Tus primeras sesiones empezarán a revelar tus patrones.',
    fbConsistent: 'Has construido un ritmo constante esta semana. En la constancia crece la calma.',
    fbCalm: 'Tu calma va en aumento últimamente. Lo que estás haciendo funciona.',
    fbKeep: 'Los momentos pequeños y regulares suman. Sigue cuidándote.',
  },
  intuition: {
    entry: 'Entrena tu intuición',
    entrySub: 'Siente qué estrella está escondida',
    title: 'Intuición',
    prompt: '¿Cuál te llama?',
    hit: 'Tu intuición está afinada ✨',
    miss: 'Confía en la siguiente 🌙',
    score: '{hits}/{total} acertadas',
    streak: '🔥 racha {n}',
    again: 'Otra vez',
  },
  moodTrend: {
    title: 'Tu estado de ánimo',
    window: 'últimos {n} días',
    empty: 'Registra cómo te sientes y tu tendencia aparecerá aquí.',
    trendUp: 'más calma últimamente ↑',
    trendDown: 'un poco más bajo últimamente ↓',
    trendFlat: 'estable →',
  },
  legal: { title: 'Legal', privacy: 'Política de privacidad', terms: 'Términos y condiciones' },
  backup: {
    title: 'Copia de seguridad y restauración',
    sub: 'Guarda tu progreso o pásalo a otro dispositivo',
    export: '⬆️ Copiar copia de seguridad',
    exported: 'Copia copiada. Pégala en una nota o archivo para guardarla a salvo.',
    exportError: 'No se pudo crear la copia de seguridad.',
    restore: '⬇️ Restaurar desde una copia',
    placeholder: 'Pega aquí tu copia de seguridad…',
    restoreBtn: 'Restaurar',
    restored: 'Se restauraron {n} elementos. Reinicia la app para verlo todo.',
    restoreError: 'Eso no parece una copia de seguridad de Stillnova.',
    cancel: 'Cancelar',
  },
  profile: { /* merge */
    phaseCues: 'Señales de respiración',
    phaseCuesSub: 'Una vibración sutil en cada inhalación, pausa y exhalación',
    analytics: 'Compartir uso anónimo',
    analyticsSub: 'Nos ayuda a mejorar Stillnova. Sin datos personales, sin rastreo.',
    sleepFade: 'Atenuar sonidos para dormir',
    sleepFadeSub: 'Tras una sesión, el sonido se apaga suavemente durante unos 90 segundos',
    langLimitTitle: 'Cambio de idioma limitado',
    langLimitDaily: 'Ya has cambiado el idioma varias veces hoy. Inténtalo mañana. Así evitamos regenerar tu contenido diario demasiado a menudo.',
    langLimitCooldown: 'Espera unos {min} min antes de volver a cambiar el idioma.',
    langConfirmTitle: '¿Cambiar el idioma?',
    langConfirmMsg: 'Esto regenerará tu contenido diario en el nuevo idioma. Te quedan {remaining} cambio(s) hoy.',
    langConfirmYes: 'Cambiar',
    voice: 'Voz de la IA',
    voiceSub: 'La voz con la que habla tu compañera',
    voice_female: 'Femenina',
    voice_male: 'Masculina',
  },
  clara: { /* merge */ listening: 'Escuchando… habla ahora' },
  recap: {
    kicker: 'TU SEMANA EN RESUMEN',
    title: 'Una semana de\ncielos más claros ✨',
    minutesLabel: 'minutos',
    sessionsLabel: 'sesiones',
    activeDaysLabel: 'días activos',
    same: '± igual que la semana pasada',
    vsLast: '{arrow} {value} {unit} vs la semana pasada',
    moodDelta: '{arrow} ánimo {value} hacia la calma',
    button: 'Empezar una nueva semana',
  },
  suggestion: {
    night: 'Es tarde. La respiración 4-7-8 puede ayudarte a deslizarte hacia el sueño. 🌙',
    lowMood: '¿Te sientes tenso? Una sesión más lenta de Calma profunda puede ayudarte a asentarte. 💙',
    highMood: 'Estás en un buen momento. Una sesión corta de Respiración en caja te mantiene centrado. ✨',
  },
  numerology: {
    label: 'Numerología',
    homeCardTitle: 'Numerología diaria',
    homeCardSubtitle: 'Tu número del destino y tu Matriz',
    setupTitle: 'Tus datos de nacimiento',
    setupSubtitle: 'Se usan para calcular tu número del destino y tu Matriz del Destino.',
    firstName: 'Nombre',
    lastName: 'Apellido',
    gender: 'Género',
    genderFemale: 'Mujer',
    genderMale: 'Hombre',
    genderOther: 'Otro',
    dob: 'Fecha de nacimiento',
    day: 'Día',
    month: 'Mes',
    year: 'Año',
    birthTime: 'Hora de nacimiento',
    hour: 'Hora',
    minute: 'Min',
    selectDate: 'Toca para elegir una fecha',
    selectTime: 'Toca para elegir una hora',
    locality: 'Localidad de nacimiento',
    localityPlaceholder: 'Ciudad o pueblo',
    country: 'País de nacimiento',
    countryPlaceholder: 'País',
    place: 'Lugar de nacimiento',
    placePlaceholder: 'Ciudad o pueblo, país',
    save: 'Calcular',
    edit: 'Editar datos de nacimiento',
    coreTitle: 'Tus números esenciales',
    lifePath: 'Camino de vida',
    lifePathHint: 'tu número del destino',
    expression: 'Expresión',
    soulUrge: 'Impulso del alma',
    personality: 'Personalidad',
    personalDay: 'Día personal',
    todayTitle: 'Lectura de hoy',
    matrixTitle: 'Matriz del Destino',
    matrixHint: 'Centro = tu energía esencial · las esquinas son los 22 arcanos',
    matrixTapHint: 'Toca cualquier número para ver qué significa →',
    arcanaLabel: 'Arcano',
    influence: 'Aquí, {arcana} moldea cómo vives esta parte de tu vida.',
    genMale: 'Línea masculina (paterna)',
    genFemale: 'Línea femenina (materna)',
    linesTitle: 'Tus líneas de vida',
    relationships: 'Relaciones ❤️',
    money: 'Autorrealización 💰',
    chakraTitle: 'Mapa de energía (7 chakras)',
    chakraPhysical: 'Cuerpo',
    chakraEnergy: 'Energía',
    chakraEmotions: 'Emociones',
    chakraTotal: 'Total',
    chakraNote: 'Una interpretación simplificada del mapa de energía, para reflexionar, no una evaluación de salud.',
    astroTitle: 'Sol y Ascendente',
    bigThreeTitle: 'Carta natal · Los tres grandes',
    bigThreeHint: 'Tu Sol, tu Luna y tu Ascendente, el corazón de tu carta.',
    natalOpen: 'Ver la carta natal completa →',
    natalTitle: 'Carta natal',
    natalPlacements: 'Planetas en los signos',
    natalTapHint: 'Toca un planeta o un aspecto para leer qué significa.',
    natalIn: 'en',
    aspect_conjunction: 'Conjunción',
    aspect_sextile: 'Sextil',
    aspect_square: 'Cuadratura',
    aspect_trine: 'Trígono',
    aspect_opposition: 'Oposición',
    natalAspects: 'Aspectos',
    natalHouse: 'C{n}',
    natalNoBirth: 'Añade primero tus datos de nacimiento para ver tu carta.',
    natalNoHouses: 'Añade tu lugar de nacimiento para un Ascendente y unas casas exactos. Los planetas en los signos se muestran sin casas.',
    sunSign: 'Sol',
    moonSign: 'Luna',
    ascendant: 'Ascendente',
    ascendantHint: 'Tu ascendente se estima a partir de tu hora de nacimiento. La carta natal completa (muy pronto) usará tu lugar de nacimiento para un resultado exacto.',
    disclaimer: 'Estas lecturas son una estimación ofrecida solo para reflexión y entretenimiento. No nos hacemos responsables de posibles errores.',
    incomplete: 'Escribe tu nombre y una fecha de nacimiento válida.',
    lockedTitle: 'Una función Premium',
    lockedBody: 'La numerología diaria, la Matriz del Destino y tu carta natal forman parte de Stillnova Premium (5 $/mes).',
    lockedHint: '¿Estás probando? Activa "Premium (prueba)" en Perfil → Ajustes para desbloquearlo todo.',
  },
  courses: {
    label: 'Programas',
    homeCardTitle: 'Programas de 7 días',
    homeCardSubtitle: 'Viajes guiados, un día tranquilo a la vez',
    choose: 'Elige un programa',
    day: 'Día {n}',
    dayOf: 'Día {n} de 7',
    locked: 'Se desbloquea en {n} día(s)',
    todaysPractice: 'Práctica de hoy',
    reflectPrompt: 'Reflexiona',
    markComplete: 'Marcar el día como completado',
    completed: 'Completado ✓',
    start: 'Empezar el programa',
    leave: 'Abandonar el programa',
    finished: '¡Programa completado! 🎉',
    items: {
      'letting-go': { title: '7 días para soltar', description: 'Libera el estrés y la necesidad de controlar' },
      'better-sleep': { title: '7 noches para dormir mejor', description: 'Relájate y descansa más profundamente' },
      'finding-focus': { title: '7 días de enfoque', description: 'Construye una mente más clara y serena' },
    },
  },
  reflection: { /* merge */
    questions: {
      release: '¿Qué puedes soltar antes de dormir?',
      wentWell: '¿Qué salió bien hoy, por pequeño que sea?',
      grateful: '¿Por qué estás agradecido esta noche?',
      emotion: '¿Qué emoción llevas contigo? ¿Puedes dejarla en el suelo?',
      lighter: '¿Qué haría que mañana se sintiera un poco más ligero?',
      calm: '¿Quién o qué te trajo calma hoy?',
      kind: '¿Qué gesto amable tuviste hoy, con otros o contigo?',
      canWait: '¿Qué puede esperar hasta mañana?',
    },
  },
  seasonal: {
    fullMoon: { title: 'Luna llena esta noche 🌕', message: 'La luna está llena, una noche perfecta para soltar lo que ya no te sirve.' },
    newYear: { title: 'Año nuevo, mente clara ✨', message: 'Un nuevo comienzo. Fija una intención serena para el año que empieza.' },
    newYearEve: { title: 'Nochevieja 🎆', message: 'Cierra el año con unas respiraciones conscientes. Has llegado hasta aquí.' },
    winterSolstice: { title: 'Solsticio de invierno ❄️', message: 'La noche más larga. Mira hacia dentro, descansa y deja que la quietud te restaure.' },
    summerSolstice: { title: 'Solsticio de verano ☀️', message: 'El día más largo. Inspira la luz y deja que tu energía suba.' },
    springEquinox: { title: 'Equinoccio de primavera 🌸', message: 'Vuelve el equilibrio. Planta una pequeña intención y mírala crecer.' },
    autumnEquinox: { title: 'Equinoccio de otoño 🍂', message: 'Tiempo de equilibrio. Suelta con suavidad, como las hojas al viento.' },
  },
  challenges: {
    'session-5min': 'Completa una sesión de 5 minutos',
    'pattern-478': 'Prueba el patrón 4-7-8',
    'pattern-box': 'Haz una sesión de Respiración en caja',
    'mood-checkin': 'Registra tu ánimo tras una sesión',
    'read-guide': 'Lee tu guía diaria completa',
    'morning': 'Medita antes del mediodía',
    'two-sessions': 'Completa 2 sesiones hoy',
    'session-10min': 'Completa una sesión de 10 minutos',
    'soundscape': 'Medita con un paisaje sonoro',
  },
  ranks: {
    '1': 'Mente errante', '2': 'Mente curiosa', '3': 'Mente que despierta', '4': 'Buscador de calma',
    '5': 'Aprendiz de la respiración', '6': 'Agua serena', '7': 'Cielo despejado', '8': 'Aprendiz zen',
    '9': 'Jardinero de la mente', '10': 'Luz interior', '11': 'Calma cósmica', '12': 'Mente clara',
    enlightened: 'Iluminado',
  },
  achievements: {
    'first-breath': { name: 'Primera respiración', description: 'Completa tu primera sesión' },
    'mood-explorer': { name: 'Explorador del ánimo', description: 'Registra tu primer estado de ánimo' },
    'sound-bather': { name: 'Baño de sonido', description: 'Medita con un paisaje sonoro' },
    'night-owl': { name: 'Búho nocturno', description: 'Completa una sesión después de las 21:00' },
    'streak-3': { name: 'Chispa', description: 'Alcanza una racha de 3 días' },
    'streak-7': { name: 'Llama constante', description: 'Alcanza una racha de 7 días' },
    'streak-30': { name: 'Fuego eterno', description: 'Alcanza una racha de 30 días' },
    'streak-100': { name: 'Supernova', description: 'Alcanza una racha de 100 días' },
    'minutes-30': { name: 'Asentándote', description: '30 minutos conscientes en total' },
    'minutes-100': { name: 'Raíces profundas', description: '100 minutos conscientes en total' },
    'minutes-500': { name: 'Bosque antiguo', description: '500 minutos conscientes en total' },
    'minutes-1000': { name: 'Bosque sagrado', description: '1000 minutos conscientes en total' },
    'all-patterns': { name: 'Maestro de patrones', description: 'Prueba los 3 patrones de respiración' },
    'marathon': { name: 'Mente maratoniana', description: 'Completa una sesión de 20 minutos' },
    'perfect-day': { name: 'Día perfecto', description: 'Completa los 3 retos diarios' },
    'level-10': { name: 'Luz interior', description: 'Alcanza el nivel 10' },
  },
```

### B.2 Italian (`src/i18n/it.ts`)

```ts
  common: { /* merge */ cancel: 'Annulla', close: 'Chiudi' },
  paywall: {
    title: 'Stillnova Premium',
    subtitle: 'Sblocca tutto il cosmo',
    benefit1: 'Numerologia completa e Matrice del Destino',
    benefit2: 'Tema natale completo (ruota natale)',
    benefit3: '50 messaggi con Clara al giorno',
    benefit4: 'Tutte le future funzioni premium',
    cta: 'Abbonati',
    perMonth: '/mese',
    restore: 'Ripristina acquisti',
    unavailable: 'Gli abbonamenti non sono ancora attivi. Per ora usa lo sblocco di prova qui sotto.',
    maybeLater: 'Forse più tardi',
    thanks: 'Sei Premium, goditelo ✨',
    upgrade: 'Passa a Premium',
  },
  moodScan: {
    entry: 'Come ti senti?',
    entrySub: 'Dillo a voce alta e ritrova un momento di calma',
    title: 'Check-in',
    prompt: "Tocca il microfono e di' come ti senti, oppure scrivilo.",
    placeholder: 'Come ti senti in questo momento?',
    listening: 'In ascolto…',
    analyze: '✨ Rifletti',
    analyzing: 'Sto riflettendo…',
    suggested: 'Prova: {pattern}',
    fallback: 'Grazie per esserti fermato un attimo. Fai un respiro lento: sei qui, e questo basta.',
  },
  insights: {
    title: 'Spunti',
    loading: 'Sto leggendo i tuoi schemi…',
    fbStart: 'Le tue prime sessioni inizieranno a rivelare i tuoi schemi.',
    fbConsistent: 'Questa settimana hai costruito un ritmo costante. La calma cresce nella costanza.',
    fbCalm: 'La tua calma sta crescendo ultimamente. Qualunque cosa tu stia facendo, funziona.',
    fbKeep: 'I piccoli momenti regolari si sommano. Continua a prenderti cura di te.',
  },
  intuition: {
    entry: 'Allena la tua intuizione',
    entrySub: 'Senti quale stella è nascosta',
    title: 'Intuizione',
    prompt: 'Quale ti chiama?',
    hit: 'La tua intuizione è affilata ✨',
    miss: 'Fidati della prossima 🌙',
    score: '{hits}/{total} percepite',
    streak: '🔥 serie {n}',
    again: 'Ancora',
  },
  moodTrend: {
    title: 'Il tuo umore',
    window: 'ultimi {n} giorni',
    empty: "Registra come ti senti e qui apparirà l'andamento del tuo umore.",
    trendUp: 'più calmo ultimamente ↑',
    trendDown: "un po' più giù ultimamente ↓",
    trendFlat: 'stabile →',
  },
  legal: { title: 'Note legali', privacy: 'Informativa sulla privacy', terms: 'Termini e condizioni' },
  backup: {
    title: 'Backup e ripristino',
    sub: 'Salva i tuoi progressi o spostali su un altro dispositivo',
    export: '⬆️ Copia il backup',
    exported: 'Backup copiato. Incollalo in una nota o in un file per tenerlo al sicuro.',
    exportError: 'Impossibile creare il backup.',
    restore: '⬇️ Ripristina da un backup',
    placeholder: 'Incolla qui il tuo backup…',
    restoreBtn: 'Ripristina',
    restored: "Ripristinati {n} elementi. Riavvia l'app per vedere tutto.",
    restoreError: 'Non sembra un backup di Stillnova.',
    cancel: 'Annulla',
  },
  profile: { /* merge */
    phaseCues: 'Segnali di respiro',
    phaseCuesSub: 'Una vibrazione leggera a ogni inspirazione, pausa ed espirazione',
    analytics: "Condividi dati d'uso anonimi",
    analyticsSub: 'Ci aiuta a migliorare Stillnova. Nessun dato personale, nessun tracciamento.',
    sleepFade: 'Sfuma i suoni per dormire',
    sleepFadeSub: 'Dopo una sessione, il suono si spegne dolcemente in circa 90 secondi',
    langLimitTitle: 'Cambio lingua limitato',
    langLimitDaily: 'Hai già cambiato lingua alcune volte oggi. Riprova domani. Così evitiamo di rigenerare troppo spesso i tuoi contenuti giornalieri.',
    langLimitCooldown: 'Attendi circa {min} min prima di cambiare di nuovo lingua.',
    langConfirmTitle: 'Cambiare lingua?',
    langConfirmMsg: 'I tuoi contenuti giornalieri verranno rigenerati nella nuova lingua. Ti restano {remaining} cambi oggi.',
    langConfirmYes: 'Cambia',
    voice: "Voce dell'IA",
    voiceSub: 'La voce con cui parla la tua compagna',
    voice_female: 'Femminile',
    voice_male: 'Maschile',
  },
  clara: { /* merge */ listening: 'In ascolto… parla ora' },
  recap: {
    kicker: 'LA TUA SETTIMANA',
    title: 'Una settimana di\ncieli più sereni ✨',
    minutesLabel: 'minuti',
    sessionsLabel: 'sessioni',
    activeDaysLabel: 'giorni attivi',
    same: '± come la settimana scorsa',
    vsLast: '{arrow} {value} {unit} rispetto alla settimana scorsa',
    moodDelta: '{arrow} umore {value} verso la calma',
    button: 'Inizia una nuova settimana',
  },
  suggestion: {
    night: 'È tardi. La respirazione 4-7-8 può aiutarti a scivolare nel sonno. 🌙',
    lowMood: "Ti senti teso? Una sessione più lenta di Calma Profonda può aiutarti a ritrovare l'equilibrio. 💙",
    highMood: 'Sei in un buon momento. Una breve sessione di Respirazione a Scatola ti mantiene centrato. ✨',
  },
  numerology: {
    label: 'Numerologia',
    homeCardTitle: 'Numerologia del giorno',
    homeCardSubtitle: 'Il tuo numero del destino e la tua Matrice',
    setupTitle: 'I tuoi dati di nascita',
    setupSubtitle: 'Servono per calcolare il tuo numero del destino e la Matrice del Destino.',
    firstName: 'Nome',
    lastName: 'Cognome',
    gender: 'Genere',
    genderFemale: 'Donna',
    genderMale: 'Uomo',
    genderOther: 'Altro',
    dob: 'Data di nascita',
    day: 'Giorno',
    month: 'Mese',
    year: 'Anno',
    birthTime: 'Ora di nascita',
    hour: 'Ora',
    minute: 'Min',
    selectDate: 'Tocca per scegliere una data',
    selectTime: "Tocca per scegliere un'ora",
    locality: 'Località di nascita',
    localityPlaceholder: 'Città o paese',
    country: 'Paese di nascita',
    countryPlaceholder: 'Paese',
    place: 'Luogo di nascita',
    placePlaceholder: 'Città o paese, nazione',
    save: 'Calcola',
    edit: 'Modifica i dati di nascita',
    coreTitle: 'I tuoi numeri essenziali',
    lifePath: 'Cammino di vita',
    lifePathHint: 'il tuo numero del destino',
    expression: 'Espressione',
    soulUrge: "Desiderio dell'anima",
    personality: 'Personalità',
    personalDay: 'Giorno personale',
    todayTitle: 'La lettura di oggi',
    matrixTitle: 'Matrice del Destino',
    matrixHint: 'Centro = la tua energia essenziale · gli angoli sono i 22 arcani',
    matrixTapHint: 'Tocca un numero per scoprire cosa significa →',
    arcanaLabel: 'Arcano',
    influence: 'Qui {arcana} plasma il modo in cui vivi questa parte della tua vita.',
    genMale: 'Linea maschile (paterna)',
    genFemale: 'Linea femminile (materna)',
    linesTitle: 'Le tue linee di vita',
    relationships: 'Relazioni ❤️',
    money: 'Realizzazione 💰',
    chakraTitle: 'Mappa energetica (7 chakra)',
    chakraPhysical: 'Corpo',
    chakraEnergy: 'Energia',
    chakraEmotions: 'Emozioni',
    chakraTotal: 'Totale',
    chakraNote: "Un'interpretazione semplificata della mappa energetica, per riflettere, non una valutazione della salute.",
    astroTitle: 'Sole e Ascendente',
    bigThreeTitle: 'Tema natale · I tre grandi',
    bigThreeHint: 'Il tuo Sole, la tua Luna e il tuo Ascendente, il cuore del tuo tema.',
    natalOpen: 'Vedi il tema natale completo →',
    natalTitle: 'Tema natale',
    natalPlacements: 'Pianeti nei segni',
    natalTapHint: 'Tocca un pianeta o un aspetto per leggerne il significato.',
    natalIn: 'in',
    aspect_conjunction: 'Congiunzione',
    aspect_sextile: 'Sestile',
    aspect_square: 'Quadratura',
    aspect_trine: 'Trigono',
    aspect_opposition: 'Opposizione',
    natalAspects: 'Aspetti',
    natalHouse: 'C{n}',
    natalNoBirth: 'Aggiungi prima i tuoi dati di nascita per vedere il tema.',
    natalNoHouses: 'Aggiungi il luogo di nascita per un Ascendente e case esatti. I pianeti nei segni sono mostrati senza case.',
    sunSign: 'Sole',
    moonSign: 'Luna',
    ascendant: 'Ascendente',
    ascendantHint: "Il tuo ascendente è stimato dall'ora di nascita. Il tema natale completo (in arrivo) userà il luogo di nascita per un risultato esatto.",
    disclaimer: 'Queste letture sono una stima offerta solo per riflessione e intrattenimento. Non ci assumiamo responsabilità per eventuali errori.',
    incomplete: 'Inserisci il tuo nome e una data di nascita valida.',
    lockedTitle: 'Una funzione Premium',
    lockedBody: 'La numerologia del giorno, la Matrice del Destino e il tuo tema natale fanno parte di Stillnova Premium (5 $/mese).',
    lockedHint: 'Stai testando? Attiva "Premium (test)" in Profilo → Impostazioni per sbloccare tutto.',
  },
  courses: {
    label: 'Programmi',
    homeCardTitle: 'Programmi di 7 giorni',
    homeCardSubtitle: 'Percorsi guidati, un giorno tranquillo alla volta',
    choose: 'Scegli un programma',
    day: 'Giorno {n}',
    dayOf: 'Giorno {n} di 7',
    locked: 'Si sblocca tra {n} giorno/i',
    todaysPractice: 'La pratica di oggi',
    reflectPrompt: 'Rifletti',
    markComplete: 'Segna il giorno come completato',
    completed: 'Completato ✓',
    start: 'Inizia il programma',
    leave: 'Abbandona il programma',
    finished: 'Programma completato! 🎉',
    items: {
      'letting-go': { title: '7 giorni per lasciar andare', description: 'Libera lo stress e il bisogno di controllare' },
      'better-sleep': { title: '7 notti per dormire meglio', description: 'Rilassati e riposa più a fondo' },
      'finding-focus': { title: '7 giorni di concentrazione', description: 'Costruisci una mente più chiara e calma' },
    },
  },
  reflection: { /* merge */
    questions: {
      release: 'Cosa puoi lasciar andare prima di dormire?',
      wentWell: 'Cosa è andato bene oggi, anche di piccolo?',
      grateful: 'Per cosa sei grato stasera?',
      emotion: 'Quale emozione porti con te? Puoi posarla?',
      lighter: "Cosa renderebbe domani un po' più leggero?",
      calm: 'Chi o cosa ti ha portato calma oggi?',
      kind: 'Quale gesto gentile hai fatto oggi, per gli altri o per te?',
      canWait: 'Cosa può aspettare fino a domani?',
    },
  },
  seasonal: {
    fullMoon: { title: 'Luna piena stanotte 🌕', message: 'La luna è piena, una notte perfetta per lasciar andare ciò che non ti serve più.' },
    newYear: { title: 'Anno nuovo, mente chiara ✨', message: "Un nuovo inizio. Fissa un'intenzione serena per l'anno che arriva." },
    newYearEve: { title: 'Notte di San Silvestro 🎆', message: "Chiudi l'anno con qualche respiro consapevole. Sei arrivato fin qui." },
    winterSolstice: { title: "Solstizio d'inverno ❄️", message: 'La notte più lunga. Volgiti verso l\'interno, riposa e lascia che la quiete ti rigeneri.' },
    summerSolstice: { title: "Solstizio d'estate ☀️", message: 'Il giorno più lungo. Inspira la luce e lascia salire la tua energia.' },
    springEquinox: { title: 'Equinozio di primavera 🌸', message: "Torna l'equilibrio. Pianta una piccola intenzione e guardala crescere." },
    autumnEquinox: { title: "Equinozio d'autunno 🍂", message: 'Un tempo di equilibrio. Lascia andare con dolcezza, come foglie al vento.' },
  },
  challenges: {
    'session-5min': 'Completa una sessione di 5 minuti',
    'pattern-478': 'Prova lo schema 4-7-8',
    'pattern-box': 'Fai una sessione di Respirazione a Scatola',
    'mood-checkin': 'Registra il tuo umore dopo una sessione',
    'read-guide': 'Leggi tutta la tua guida del giorno',
    'morning': 'Medita prima di mezzogiorno',
    'two-sessions': 'Completa 2 sessioni oggi',
    'session-10min': 'Completa una sessione di 10 minuti',
    'soundscape': 'Medita con un paesaggio sonoro',
  },
  ranks: {
    '1': 'Mente errante', '2': 'Mente curiosa', '3': 'Mente che si sveglia', '4': 'Cercatore di calma',
    '5': 'Apprendista del respiro', '6': 'Acqua immobile', '7': 'Cielo sereno', '8': 'Apprendista zen',
    '9': 'Giardiniere della mente', '10': 'Luce interiore', '11': 'Calma cosmica', '12': 'Mente chiara',
    enlightened: 'Illuminato',
  },
  achievements: {
    'first-breath': { name: 'Primo respiro', description: 'Completa la tua prima sessione' },
    'mood-explorer': { name: "Esploratore dell'umore", description: "Registra il tuo primo stato d'animo" },
    'sound-bather': { name: 'Bagno di suoni', description: 'Medita con un paesaggio sonoro' },
    'night-owl': { name: 'Nottambulo', description: 'Completa una sessione dopo le 21' },
    'streak-3': { name: 'Scintilla', description: 'Raggiungi una serie di 3 giorni' },
    'streak-7': { name: 'Fiamma costante', description: 'Raggiungi una serie di 7 giorni' },
    'streak-30': { name: 'Fuoco eterno', description: 'Raggiungi una serie di 30 giorni' },
    'streak-100': { name: 'Supernova', description: 'Raggiungi una serie di 100 giorni' },
    'minutes-30': { name: 'Primi passi', description: '30 minuti consapevoli in totale' },
    'minutes-100': { name: 'Radici profonde', description: '100 minuti consapevoli in totale' },
    'minutes-500': { name: 'Bosco antico', description: '500 minuti consapevoli in totale' },
    'minutes-1000': { name: 'Foresta sacra', description: '1000 minuti consapevoli in totale' },
    'all-patterns': { name: 'Maestro degli schemi', description: 'Prova tutti e 3 gli schemi di respirazione' },
    'marathon': { name: 'Mente maratoneta', description: 'Completa una sessione di 20 minuti' },
    'perfect-day': { name: 'Giornata perfetta', description: 'Completa tutte e 3 le sfide del giorno' },
    'level-10': { name: 'Luce interiore', description: 'Raggiungi il livello 10' },
  },
```

### B.3 French (`src/i18n/fr.ts`)

```ts
  common: { /* merge */ cancel: 'Annuler', close: 'Fermer' },
  paywall: {
    title: 'Stillnova Premium',
    subtitle: 'Débloquez tout le cosmos',
    benefit1: 'Numérologie complète et Matrice du Destin',
    benefit2: 'Thème astral complet (roue natale)',
    benefit3: '50 messages avec Clara par jour',
    benefit4: 'Toutes les futures fonctions premium',
    cta: "S'abonner",
    perMonth: '/mois',
    restore: 'Restaurer les achats',
    unavailable: "Les abonnements ne sont pas encore configurés. Pour l'instant, utilisez le déblocage de test ci-dessous.",
    maybeLater: 'Peut-être plus tard',
    thanks: 'Vous êtes Premium, profitez-en ✨',
    upgrade: 'Passer à Premium',
  },
  moodScan: {
    entry: 'Comment vous sentez-vous ?',
    entrySub: 'Dites-le à voix haute et retrouvez un moment de calme',
    title: 'Bilan',
    prompt: 'Touchez le micro et dites comment vous vous sentez, ou écrivez-le.',
    placeholder: 'Comment vous sentez-vous en ce moment ?',
    listening: "À l'écoute…",
    analyze: '✨ Réfléchir',
    analyzing: 'Réflexion en cours…',
    suggested: 'Essayez : {pattern}',
    fallback: "Merci d'avoir pris ce moment. Respirez lentement une fois : vous êtes là, et cela suffit.",
  },
  insights: {
    title: 'Observations',
    loading: 'Lecture de vos habitudes…',
    fbStart: 'Vos premières séances commenceront à révéler vos habitudes.',
    fbConsistent: 'Vous avez trouvé un rythme régulier cette semaine. Le calme grandit dans la constance.',
    fbCalm: 'Votre calme progresse ces derniers temps. Ce que vous faites fonctionne.',
    fbKeep: "Les petits moments réguliers s'additionnent. Continuez à prendre soin de vous.",
  },
  intuition: {
    entry: 'Entraînez votre intuition',
    entrySub: 'Sentez quelle étoile est cachée',
    title: 'Intuition',
    prompt: 'Laquelle vous appelle ?',
    hit: 'Votre intuition est affûtée ✨',
    miss: 'Faites confiance à la prochaine 🌙',
    score: '{hits}/{total} ressenties',
    streak: '🔥 série {n}',
    again: 'Encore',
  },
  moodTrend: {
    title: 'Votre humeur',
    window: '{n} derniers jours',
    empty: "Notez comment vous vous sentez et la tendance de votre humeur apparaîtra ici.",
    trendUp: 'plus calme ces derniers temps ↑',
    trendDown: 'un peu plus bas ces derniers temps ↓',
    trendFlat: 'stable →',
  },
  legal: { title: 'Mentions légales', privacy: 'Politique de confidentialité', terms: 'Conditions générales' },
  backup: {
    title: 'Sauvegarde et restauration',
    sub: 'Sauvegardez vos progrès ou transférez-les sur un autre appareil',
    export: '⬆️ Copier la sauvegarde',
    exported: 'Sauvegarde copiée. Collez-la dans une note ou un fichier pour la garder en sécurité.',
    exportError: 'Impossible de créer la sauvegarde.',
    restore: '⬇️ Restaurer une sauvegarde',
    placeholder: 'Collez votre sauvegarde ici…',
    restoreBtn: 'Restaurer',
    restored: "{n} éléments restaurés. Redémarrez l'application pour tout voir.",
    restoreError: 'Cela ne ressemble pas à une sauvegarde Stillnova.',
    cancel: 'Annuler',
  },
  profile: { /* merge */
    phaseCues: 'Repères de respiration',
    phaseCuesSub: 'Une vibration discrète à chaque inspiration, pause et expiration',
    analytics: 'Partager des statistiques anonymes',
    analyticsSub: 'Nous aide à améliorer Stillnova. Aucune donnée personnelle, aucun suivi.',
    sleepFade: 'Fondu des sons pour dormir',
    sleepFadeSub: "Après une séance, le son s'estompe doucement pendant environ 90 secondes",
    langLimitTitle: 'Changement de langue limité',
    langLimitDaily: "Vous avez déjà changé de langue plusieurs fois aujourd'hui. Réessayez demain. Cela évite de régénérer trop souvent votre contenu du jour.",
    langLimitCooldown: 'Patientez environ {min} min avant de changer à nouveau de langue.',
    langConfirmTitle: 'Changer de langue ?',
    langConfirmMsg: "Votre contenu du jour sera régénéré dans la nouvelle langue. Il vous reste {remaining} changement(s) aujourd'hui.",
    langConfirmYes: 'Changer',
    voice: "Voix de l'IA",
    voiceSub: 'La voix de votre compagne',
    voice_female: 'Féminine',
    voice_male: 'Masculine',
  },
  clara: { /* merge */ listening: "À l'écoute… parlez maintenant" },
  recap: {
    kicker: 'VOTRE SEMAINE EN BREF',
    title: 'Une semaine de\nciels plus clairs ✨',
    minutesLabel: 'minutes',
    sessionsLabel: 'séances',
    activeDaysLabel: 'jours actifs',
    same: '± comme la semaine dernière',
    vsLast: '{arrow} {value} {unit} vs la semaine dernière',
    moodDelta: '{arrow} humeur {value} vers le calme',
    button: 'Commencer une nouvelle semaine',
  },
  suggestion: {
    night: 'Il est tard. La respiration 4-7-8 peut vous aider à glisser vers le sommeil. 🌙',
    lowMood: 'Vous vous sentez tendu ? Une séance plus lente de Calme profond peut vous aider à vous apaiser. 💙',
    highMood: 'Vous êtes dans une bonne période. Une courte séance de Respiration carrée vous garde centré. ✨',
  },
  numerology: {
    label: 'Numérologie',
    homeCardTitle: 'Numérologie du jour',
    homeCardSubtitle: 'Votre nombre du destin et votre Matrice',
    setupTitle: 'Vos informations de naissance',
    setupSubtitle: 'Elles servent à calculer votre nombre du destin et votre Matrice du Destin.',
    firstName: 'Prénom',
    lastName: 'Nom',
    gender: 'Genre',
    genderFemale: 'Femme',
    genderMale: 'Homme',
    genderOther: 'Autre',
    dob: 'Date de naissance',
    day: 'Jour',
    month: 'Mois',
    year: 'Année',
    birthTime: 'Heure de naissance',
    hour: 'Heure',
    minute: 'Min',
    selectDate: 'Touchez pour choisir une date',
    selectTime: 'Touchez pour choisir une heure',
    locality: 'Localité de naissance',
    localityPlaceholder: 'Ville ou village',
    country: 'Pays de naissance',
    countryPlaceholder: 'Pays',
    place: 'Lieu de naissance',
    placePlaceholder: 'Ville ou village, pays',
    save: 'Calculer',
    edit: 'Modifier les informations de naissance',
    coreTitle: 'Vos nombres essentiels',
    lifePath: 'Chemin de vie',
    lifePathHint: 'votre nombre du destin',
    expression: 'Expression',
    soulUrge: "Élan de l'âme",
    personality: 'Personnalité',
    personalDay: 'Jour personnel',
    todayTitle: 'Lecture du jour',
    matrixTitle: 'Matrice du Destin',
    matrixHint: 'Centre = votre énergie essentielle · les coins sont les 22 arcanes',
    matrixTapHint: 'Touchez un nombre pour découvrir sa signification →',
    arcanaLabel: 'Arcane',
    influence: 'Ici, {arcana} façonne la manière dont vous vivez cette partie de votre vie.',
    genMale: 'Lignée masculine (paternelle)',
    genFemale: 'Lignée féminine (maternelle)',
    linesTitle: 'Vos lignes de vie',
    relationships: 'Relations ❤️',
    money: 'Accomplissement 💰',
    chakraTitle: 'Carte énergétique (7 chakras)',
    chakraPhysical: 'Corps',
    chakraEnergy: 'Énergie',
    chakraEmotions: 'Émotions',
    chakraTotal: 'Total',
    chakraNote: 'Une interprétation simplifiée de la carte énergétique, pour la réflexion, pas une évaluation de santé.',
    astroTitle: 'Soleil et Ascendant',
    bigThreeTitle: 'Thème astral · Le grand trio',
    bigThreeHint: 'Votre Soleil, votre Lune et votre Ascendant, le cœur de votre thème.',
    natalOpen: 'Voir le thème astral complet →',
    natalTitle: 'Thème astral',
    natalPlacements: 'Planètes dans les signes',
    natalTapHint: 'Touchez une planète ou un aspect pour lire sa signification.',
    natalIn: 'en',
    aspect_conjunction: 'Conjonction',
    aspect_sextile: 'Sextile',
    aspect_square: 'Carré',
    aspect_trine: 'Trigone',
    aspect_opposition: 'Opposition',
    natalAspects: 'Aspects',
    natalHouse: 'M{n}',
    natalNoBirth: "Ajoutez d'abord vos informations de naissance pour voir votre thème.",
    natalNoHouses: 'Ajoutez votre lieu de naissance pour un Ascendant et des maisons exacts. Les planètes dans les signes sont affichées sans maisons.',
    sunSign: 'Soleil',
    moonSign: 'Lune',
    ascendant: 'Ascendant',
    ascendantHint: 'Votre ascendant est estimé à partir de votre heure de naissance. Le thème astral complet (bientôt) utilisera votre lieu de naissance pour un résultat exact.',
    disclaimer: "Ces lectures sont une estimation proposée uniquement à des fins de réflexion et de divertissement. Nous déclinons toute responsabilité en cas d'erreur.",
    incomplete: 'Saisissez votre nom et une date de naissance valide.',
    lockedTitle: 'Une fonction Premium',
    lockedBody: 'La numérologie du jour, la Matrice du Destin et votre thème astral font partie de Stillnova Premium (5 $/mois).',
    lockedHint: 'En phase de test ? Activez « Premium (test) » dans Profil → Réglages pour tout débloquer.',
  },
  courses: {
    label: 'Programmes',
    homeCardTitle: 'Programmes de 7 jours',
    homeCardSubtitle: 'Des parcours guidés, un jour paisible à la fois',
    choose: 'Choisissez un programme',
    day: 'Jour {n}',
    dayOf: 'Jour {n} sur 7',
    locked: 'Se débloque dans {n} jour(s)',
    todaysPractice: 'Pratique du jour',
    reflectPrompt: 'Réfléchir',
    markComplete: 'Marquer la journée comme terminée',
    completed: 'Terminé ✓',
    start: 'Commencer le programme',
    leave: 'Quitter le programme',
    finished: 'Programme terminé ! 🎉',
    items: {
      'letting-go': { title: '7 jours pour lâcher prise', description: 'Libérez le stress et le besoin de tout contrôler' },
      'better-sleep': { title: '7 nuits pour mieux dormir', description: 'Détendez-vous et reposez-vous plus profondément' },
      'finding-focus': { title: '7 jours de concentration', description: 'Cultivez un esprit plus clair et plus calme' },
    },
  },
  reflection: { /* merge */
    questions: {
      release: 'Que pouvez-vous lâcher avant de dormir ?',
      wentWell: "Qu'est-ce qui s'est bien passé aujourd'hui, même en petit ?",
      grateful: 'De quoi êtes-vous reconnaissant ce soir ?',
      emotion: 'Quelle émotion portez-vous, et pouvez-vous la déposer ?',
      lighter: "Qu'est-ce qui rendrait demain un peu plus léger ?",
      calm: "Qui ou quoi vous a apporté du calme aujourd'hui ?",
      kind: "Quel geste bienveillant avez-vous eu aujourd'hui, pour les autres ou pour vous ?",
      canWait: "Qu'est-ce qui peut attendre demain ?",
    },
  },
  seasonal: {
    fullMoon: { title: 'Pleine lune ce soir 🌕', message: 'La lune est pleine, une nuit parfaite pour lâcher ce qui ne vous sert plus.' },
    newYear: { title: 'Nouvelle année, esprit clair ✨', message: "Un nouveau départ. Posez une intention calme pour l'année qui vient." },
    newYearEve: { title: 'Réveillon du Nouvel An 🎆', message: "Terminez l'année avec quelques respirations conscientes. Vous êtes arrivé jusqu'ici." },
    winterSolstice: { title: "Solstice d'hiver ❄️", message: "La nuit la plus longue. Tournez-vous vers l'intérieur, reposez-vous et laissez le calme vous restaurer." },
    summerSolstice: { title: "Solstice d'été ☀️", message: 'Le jour le plus long. Inspirez la lumière et laissez monter votre énergie.' },
    springEquinox: { title: 'Équinoxe de printemps 🌸', message: "L'équilibre revient. Plantez une petite intention et regardez-la grandir." },
    autumnEquinox: { title: "Équinoxe d'automne 🍂", message: "Un temps d'équilibre. Lâchez prise en douceur, comme les feuilles dans le vent." },
  },
  challenges: {
    'session-5min': 'Faites une séance de 5 minutes',
    'pattern-478': 'Essayez le rythme 4-7-8',
    'pattern-box': 'Faites une séance de Respiration carrée',
    'mood-checkin': 'Notez votre humeur après une séance',
    'read-guide': 'Lisez votre guide du jour en entier',
    'morning': 'Méditez avant midi',
    'two-sessions': "Faites 2 séances aujourd'hui",
    'session-10min': 'Faites une séance de 10 minutes',
    'soundscape': 'Méditez avec un paysage sonore',
  },
  ranks: {
    '1': 'Esprit vagabond', '2': 'Esprit curieux', '3': "Esprit qui s'éveille", '4': 'Chercheur de calme',
    '5': 'Apprenti du souffle', '6': 'Eau calme', '7': 'Ciel dégagé', '8': 'Apprenti zen',
    '9': "Jardinier de l'esprit", '10': 'Lumière intérieure', '11': 'Calme cosmique', '12': 'Esprit clair',
    enlightened: 'Éveillé',
  },
  achievements: {
    'first-breath': { name: 'Premier souffle', description: 'Terminez votre première séance' },
    'mood-explorer': { name: "Explorateur d'humeur", description: 'Notez votre première humeur' },
    'sound-bather': { name: 'Bain sonore', description: 'Méditez avec un paysage sonore' },
    'night-owl': { name: 'Oiseau de nuit', description: 'Terminez une séance après 21 h' },
    'streak-3': { name: 'Étincelle', description: 'Atteignez une série de 3 jours' },
    'streak-7': { name: 'Flamme régulière', description: 'Atteignez une série de 7 jours' },
    'streak-30': { name: 'Feu éternel', description: 'Atteignez une série de 30 jours' },
    'streak-100': { name: 'Supernova', description: 'Atteignez une série de 100 jours' },
    'minutes-30': { name: 'Prise de repères', description: '30 minutes de pleine conscience au total' },
    'minutes-100': { name: 'Racines profondes', description: '100 minutes de pleine conscience au total' },
    'minutes-500': { name: 'Vieille forêt', description: '500 minutes de pleine conscience au total' },
    'minutes-1000': { name: 'Forêt sacrée', description: '1000 minutes de pleine conscience au total' },
    'all-patterns': { name: 'Maître des rythmes', description: 'Essayez les 3 rythmes de respiration' },
    'marathon': { name: 'Esprit marathonien', description: 'Terminez une séance de 20 minutes' },
    'perfect-day': { name: 'Journée parfaite', description: 'Relevez les 3 défis du jour' },
    'level-10': { name: 'Lumière intérieure', description: 'Atteignez le niveau 10' },
  },
```

### B.4 German (`src/i18n/de.ts`)

```ts
  common: { /* merge */ cancel: 'Abbrechen', close: 'Schließen' },
  paywall: {
    title: 'Stillnova Premium',
    subtitle: 'Schalte den ganzen Kosmos frei',
    benefit1: 'Vollständige Numerologie und Schicksalsmatrix',
    benefit2: 'Vollständiges Geburtshoroskop (Radix)',
    benefit3: '50 Nachrichten mit Clara pro Tag',
    benefit4: 'Alle zukünftigen Premium-Funktionen',
    cta: 'Abonnieren',
    perMonth: '/Monat',
    restore: 'Käufe wiederherstellen',
    unavailable: 'Abos sind noch nicht eingerichtet. Nutze vorerst die Test-Freischaltung unten.',
    maybeLater: 'Vielleicht später',
    thanks: 'Du bist Premium, genieß es ✨',
    upgrade: 'Auf Premium upgraden',
  },
  moodScan: {
    entry: 'Wie fühlst du dich?',
    entrySub: 'Sprich es aus und gewinne einen Moment Ruhe zurück',
    title: 'Check-in',
    prompt: 'Tippe auf das Mikrofon und sag, wie du dich fühlst, oder schreib es auf.',
    placeholder: 'Wie fühlst du dich gerade?',
    listening: 'Ich höre zu…',
    analyze: '✨ Reflektieren',
    analyzing: 'Reflektiere…',
    suggested: 'Probier: {pattern}',
    fallback: 'Danke, dass du kurz innehältst. Atme einmal langsam: Du bist hier, und das genügt.',
  },
  insights: {
    title: 'Einblicke',
    loading: 'Lese deine Muster…',
    fbStart: 'Deine ersten Sitzungen werden nach und nach deine Muster zeigen.',
    fbConsistent: 'Du hast diese Woche einen stetigen Rhythmus gefunden. In der Beständigkeit wächst die Ruhe.',
    fbCalm: 'Deine Ruhe nimmt in letzter Zeit zu. Was auch immer du tust, es wirkt.',
    fbKeep: 'Kleine, regelmäßige Momente summieren sich. Bleib dir selbst treu.',
  },
  intuition: {
    entry: 'Trainiere deine Intuition',
    entrySub: 'Spüre, welcher Stern verborgen ist',
    title: 'Intuition',
    prompt: 'Welcher ruft dich?',
    hit: 'Deine Intuition ist scharf ✨',
    miss: 'Vertrau beim nächsten Mal 🌙',
    score: '{hits}/{total} erspürt',
    streak: '🔥 Serie {n}',
    again: 'Nochmal',
  },
  moodTrend: {
    title: 'Deine Stimmung',
    window: 'letzte {n} Tage',
    empty: 'Halte fest, wie du dich fühlst. Dein Stimmungsverlauf erscheint dann hier.',
    trendUp: 'zuletzt ruhiger ↑',
    trendDown: 'zuletzt etwas gedämpfter ↓',
    trendFlat: 'stabil →',
  },
  legal: { title: 'Rechtliches', privacy: 'Datenschutzerklärung', terms: 'Nutzungsbedingungen' },
  backup: {
    title: 'Sichern und wiederherstellen',
    sub: 'Sichere deinen Fortschritt oder übertrage ihn auf ein anderes Gerät',
    export: '⬆️ Sicherung kopieren',
    exported: 'Sicherung kopiert. Füge sie in eine Notiz oder Datei ein, um sie aufzubewahren.',
    exportError: 'Die Sicherung konnte nicht erstellt werden.',
    restore: '⬇️ Aus Sicherung wiederherstellen',
    placeholder: 'Füge deine Sicherung hier ein…',
    restoreBtn: 'Wiederherstellen',
    restored: '{n} Einträge wiederhergestellt. Starte die App neu, um alles zu sehen.',
    restoreError: 'Das sieht nicht nach einer Stillnova-Sicherung aus.',
    cancel: 'Abbrechen',
  },
  profile: { /* merge */
    phaseCues: 'Atemsignale',
    phaseCuesSub: 'Eine sanfte Vibration bei jedem Einatmen, Halten und Ausatmen',
    analytics: 'Anonyme Nutzungsdaten teilen',
    analyticsSub: 'Hilft uns, Stillnova zu verbessern. Keine persönlichen Daten, kein Tracking.',
    sleepFade: 'Klänge zum Einschlafen ausblenden',
    sleepFadeSub: 'Nach einer Sitzung wird der Klang über etwa 90 Sekunden sanft leiser',
    langLimitTitle: 'Sprachwechsel begrenzt',
    langLimitDaily: 'Du hast die Sprache heute schon mehrmals gewechselt. Versuch es morgen wieder. So werden deine Tagesinhalte nicht zu oft neu erzeugt.',
    langLimitCooldown: 'Bitte warte etwa {min} Min., bevor du die Sprache erneut wechselst.',
    langConfirmTitle: 'Sprache wechseln?',
    langConfirmMsg: 'Deine Tagesinhalte werden in der neuen Sprache neu erzeugt. Du hast heute noch {remaining} Wechsel übrig.',
    langConfirmYes: 'Wechseln',
    voice: 'KI-Stimme',
    voiceSub: 'Die Sprechstimme deiner Begleiterin',
    voice_female: 'Weiblich',
    voice_male: 'Männlich',
  },
  clara: { /* merge */ listening: 'Ich höre zu… sprich jetzt' },
  recap: {
    kicker: 'DEINE WOCHE IM RÜCKBLICK',
    title: 'Eine Woche mit\nklarerem Himmel ✨',
    minutesLabel: 'Minuten',
    sessionsLabel: 'Sitzungen',
    activeDaysLabel: 'aktive Tage',
    same: '± wie letzte Woche',
    vsLast: '{arrow} {value} {unit} im Vergleich zur letzten Woche',
    moodDelta: '{arrow} Stimmung {value} Richtung Ruhe',
    button: 'Eine neue Woche beginnen',
  },
  suggestion: {
    night: 'Es ist spät. Die 4-7-8-Atmung kann dir helfen, in den Schlaf zu gleiten. 🌙',
    lowMood: 'Fühlst du dich angespannt? Eine langsamere Sitzung Tiefe Ruhe kann dir helfen, zur Ruhe zu kommen. 💙',
    highMood: 'Du bist gut drauf. Eine kurze Box-Atmung hält dich zentriert. ✨',
  },
  numerology: {
    label: 'Numerologie',
    homeCardTitle: 'Numerologie des Tages',
    homeCardSubtitle: 'Deine Schicksalszahl und deine Matrix',
    setupTitle: 'Deine Geburtsdaten',
    setupSubtitle: 'Sie werden verwendet, um deine Schicksalszahl und deine Schicksalsmatrix zu berechnen.',
    firstName: 'Vorname',
    lastName: 'Nachname',
    gender: 'Geschlecht',
    genderFemale: 'Weiblich',
    genderMale: 'Männlich',
    genderOther: 'Divers',
    dob: 'Geburtsdatum',
    day: 'Tag',
    month: 'Monat',
    year: 'Jahr',
    birthTime: 'Geburtszeit',
    hour: 'Stunde',
    minute: 'Min',
    selectDate: 'Tippen, um ein Datum zu wählen',
    selectTime: 'Tippen, um eine Uhrzeit zu wählen',
    locality: 'Geburtsort',
    localityPlaceholder: 'Stadt oder Dorf',
    country: 'Geburtsland',
    countryPlaceholder: 'Land',
    place: 'Geburtsort',
    placePlaceholder: 'Stadt oder Dorf, Land',
    save: 'Berechnen',
    edit: 'Geburtsdaten bearbeiten',
    coreTitle: 'Deine Kernzahlen',
    lifePath: 'Lebensweg',
    lifePathHint: 'deine Schicksalszahl',
    expression: 'Ausdruck',
    soulUrge: 'Seelenwunsch',
    personality: 'Persönlichkeit',
    personalDay: 'Persönlicher Tag',
    todayTitle: 'Deine Lesung für heute',
    matrixTitle: 'Schicksalsmatrix',
    matrixHint: 'Mitte = deine Kernenergie · die Ecken sind die 22 Arkana',
    matrixTapHint: 'Tippe auf eine Zahl, um ihre Bedeutung zu sehen →',
    arcanaLabel: 'Arkanum',
    influence: 'Hier prägt {arcana}, wie du diesen Teil deines Lebens erlebst.',
    genMale: 'Männliche Linie (väterlich)',
    genFemale: 'Weibliche Linie (mütterlich)',
    linesTitle: 'Deine Lebenslinien',
    relationships: 'Beziehungen ❤️',
    money: 'Selbstverwirklichung 💰',
    chakraTitle: 'Energiekarte (7 Chakren)',
    chakraPhysical: 'Körper',
    chakraEnergy: 'Energie',
    chakraEmotions: 'Gefühle',
    chakraTotal: 'Gesamt',
    chakraNote: 'Eine vereinfachte Deutung der Energiekarte, zum Nachdenken gedacht, keine Gesundheitsbewertung.',
    astroTitle: 'Sonne und Aszendent',
    bigThreeTitle: 'Geburtshoroskop · Die großen Drei',
    bigThreeHint: 'Deine Sonne, dein Mond und dein Aszendent, das Herz deines Horoskops.',
    natalOpen: 'Vollständiges Geburtshoroskop ansehen →',
    natalTitle: 'Geburtshoroskop',
    natalPlacements: 'Planeten in den Zeichen',
    natalTapHint: 'Tippe auf einen Planeten oder Aspekt, um die Bedeutung zu lesen.',
    natalIn: 'in',
    aspect_conjunction: 'Konjunktion',
    aspect_sextile: 'Sextil',
    aspect_square: 'Quadrat',
    aspect_trine: 'Trigon',
    aspect_opposition: 'Opposition',
    natalAspects: 'Aspekte',
    natalHouse: 'H{n}',
    natalNoBirth: 'Füge zuerst deine Geburtsdaten hinzu, um dein Horoskop zu sehen.',
    natalNoHouses: 'Füge deinen Geburtsort hinzu, um einen exakten Aszendenten und Häuser zu erhalten. Planeten in den Zeichen werden ohne Häuser angezeigt.',
    sunSign: 'Sonne',
    moonSign: 'Mond',
    ascendant: 'Aszendent',
    ascendantHint: 'Dein Aszendent wird aus deiner Geburtszeit geschätzt. Das vollständige Geburtshoroskop (bald verfügbar) nutzt deinen Geburtsort für ein exaktes Ergebnis.',
    disclaimer: 'Diese Deutungen sind Schätzungen, die nur zur Reflexion und Unterhaltung dienen. Für Fehler übernehmen wir keine Verantwortung.',
    incomplete: 'Bitte gib deinen Namen und ein gültiges Geburtsdatum ein.',
    lockedTitle: 'Eine Premium-Funktion',
    lockedBody: 'Numerologie des Tages, die Schicksalsmatrix und dein Geburtshoroskop sind Teil von Stillnova Premium (5 $/Monat).',
    lockedHint: 'Am Testen? Schalte „Premium (Test)“ unter Profil → Einstellungen ein, um alles freizuschalten.',
  },
  courses: {
    label: 'Programme',
    homeCardTitle: '7-Tage-Programme',
    homeCardSubtitle: 'Geführte Reisen, ein ruhiger Tag nach dem anderen',
    choose: 'Wähle ein Programm',
    day: 'Tag {n}',
    dayOf: 'Tag {n} von 7',
    locked: 'Wird in {n} Tag(en) freigeschaltet',
    todaysPractice: 'Übung des Tages',
    reflectPrompt: 'Reflektieren',
    markComplete: 'Tag als erledigt markieren',
    completed: 'Erledigt ✓',
    start: 'Programm starten',
    leave: 'Programm verlassen',
    finished: 'Programm abgeschlossen! 🎉',
    items: {
      'letting-go': { title: '7 Tage Loslassen', description: 'Lass Stress und das Bedürfnis nach Kontrolle los' },
      'better-sleep': { title: '7 Nächte für besseren Schlaf', description: 'Komm zur Ruhe und schlaf tiefer' },
      'finding-focus': { title: '7 Tage Fokus', description: 'Entwickle einen klareren, ruhigeren Geist' },
    },
  },
  reflection: { /* merge */
    questions: {
      release: 'Was kannst du vor dem Schlafen loslassen?',
      wentWell: 'Was ist heute gut gelaufen, und sei es noch so klein?',
      grateful: 'Wofür bist du heute Abend dankbar?',
      emotion: 'Welches Gefühl trägst du mit dir, und kannst du es ablegen?',
      lighter: 'Was würde morgen ein wenig leichter machen?',
      calm: 'Wer oder was hat dir heute Ruhe gebracht?',
      kind: 'Was hast du heute Gutes getan, für andere oder für dich?',
      canWait: 'Was kann bis morgen warten?',
    },
  },
  seasonal: {
    fullMoon: { title: 'Heute Nacht Vollmond 🌕', message: 'Der Mond ist voll, eine perfekte Nacht, um loszulassen, was dir nicht mehr dient.' },
    newYear: { title: 'Neues Jahr, klarer Kopf ✨', message: 'Ein Neuanfang. Setz dir eine ruhige Absicht für das kommende Jahr.' },
    newYearEve: { title: 'Silvester 🎆', message: 'Beende das Jahr mit ein paar bewussten Atemzügen. Du hast es bis hierher geschafft.' },
    winterSolstice: { title: 'Wintersonnenwende ❄️', message: 'Die längste Nacht. Kehr nach innen, ruh dich aus und lass die Stille dich erneuern.' },
    summerSolstice: { title: 'Sommersonnenwende ☀️', message: 'Der längste Tag. Atme das Licht ein und lass deine Energie steigen.' },
    springEquinox: { title: 'Frühlingsanfang 🌸', message: 'Das Gleichgewicht kehrt zurück. Pflanze eine kleine Absicht und sieh sie wachsen.' },
    autumnEquinox: { title: 'Herbstanfang 🍂', message: 'Eine Zeit des Gleichgewichts. Lass sanft los, wie Blätter im Wind.' },
  },
  challenges: {
    'session-5min': 'Schließe eine 5-Minuten-Sitzung ab',
    'pattern-478': 'Probier das 4-7-8-Muster',
    'pattern-box': 'Mach eine Sitzung Box-Atmung',
    'mood-checkin': 'Halte nach einer Sitzung deine Stimmung fest',
    'read-guide': 'Lies deinen ganzen Tagesguide',
    'morning': 'Meditiere vor dem Mittag',
    'two-sessions': 'Schließe heute 2 Sitzungen ab',
    'session-10min': 'Schließe eine 10-Minuten-Sitzung ab',
    'soundscape': 'Meditiere mit einer Klanglandschaft',
  },
  ranks: {
    '1': 'Wandernder Geist', '2': 'Neugieriger Geist', '3': 'Erwachender Geist', '4': 'Ruhesuchender',
    '5': 'Atemlehrling', '6': 'Stilles Wasser', '7': 'Klarer Himmel', '8': 'Zen-Lehrling',
    '9': 'Gärtner des Geistes', '10': 'Inneres Licht', '11': 'Kosmische Ruhe', '12': 'Klarer Geist',
    enlightened: 'Erleuchtet',
  },
  achievements: {
    'first-breath': { name: 'Erster Atemzug', description: 'Schließe deine erste Sitzung ab' },
    'mood-explorer': { name: 'Stimmungsforscher', description: 'Halte deine erste Stimmung fest' },
    'sound-bather': { name: 'Klangbad', description: 'Meditiere mit einer Klanglandschaft' },
    'night-owl': { name: 'Nachteule', description: 'Schließe eine Sitzung nach 21 Uhr ab' },
    'streak-3': { name: 'Funke', description: 'Erreiche eine Serie von 3 Tagen' },
    'streak-7': { name: 'Stete Flamme', description: 'Erreiche eine Serie von 7 Tagen' },
    'streak-30': { name: 'Ewiges Feuer', description: 'Erreiche eine Serie von 30 Tagen' },
    'streak-100': { name: 'Supernova', description: 'Erreiche eine Serie von 100 Tagen' },
    'minutes-30': { name: 'Angekommen', description: '30 achtsame Minuten insgesamt' },
    'minutes-100': { name: 'Tiefe Wurzeln', description: '100 achtsame Minuten insgesamt' },
    'minutes-500': { name: 'Alter Wald', description: '500 achtsame Minuten insgesamt' },
    'minutes-1000': { name: 'Heiliger Wald', description: '1000 achtsame Minuten insgesamt' },
    'all-patterns': { name: 'Mustermeister', description: 'Probier alle 3 Atemmuster' },
    'marathon': { name: 'Marathon-Geist', description: 'Schließe eine 20-Minuten-Sitzung ab' },
    'perfect-day': { name: 'Perfekter Tag', description: 'Erfülle alle 3 Tagesaufgaben' },
    'level-10': { name: 'Inneres Licht', description: 'Erreiche Level 10' },
  },
```

### B.5 Portuguese, European (`src/i18n/pt.ts`)

```ts
  common: { /* merge */ cancel: 'Cancelar', close: 'Fechar' },
  paywall: {
    title: 'Stillnova Premium',
    subtitle: 'Desbloqueia todo o cosmos',
    benefit1: 'Numerologia completa e Matriz do Destino',
    benefit2: 'Mapa astral completo (roda natal)',
    benefit3: '50 mensagens com a Clara por dia',
    benefit4: 'Todas as futuras funcionalidades premium',
    cta: 'Subscrever',
    perMonth: '/mês',
    restore: 'Restaurar compras',
    unavailable: 'As subscrições ainda não estão configuradas. Por agora, usa o desbloqueio de teste abaixo.',
    maybeLater: 'Talvez mais tarde',
    thanks: 'És Premium, aproveita ✨',
    upgrade: 'Passar a Premium',
  },
  moodScan: {
    entry: 'Como te sentes?',
    entrySub: 'Diz em voz alta e recupera um momento de calma',
    title: 'Check-in',
    prompt: 'Toca no microfone e diz como te sentes, ou escreve.',
    placeholder: 'Como te sentes neste momento?',
    listening: 'A ouvir…',
    analyze: '✨ Refletir',
    analyzing: 'A refletir…',
    suggested: 'Experimenta: {pattern}',
    fallback: 'Obrigado por parares um momento. Respira devagar uma vez: estás aqui, e isso basta.',
  },
  insights: {
    title: 'Perceções',
    loading: 'A ler os teus padrões…',
    fbStart: 'As tuas primeiras sessões vão começar a revelar os teus padrões.',
    fbConsistent: 'Construíste um ritmo constante esta semana. A calma cresce na constância.',
    fbCalm: 'A tua calma tem vindo a aumentar. O que estás a fazer está a resultar.',
    fbKeep: 'Os pequenos momentos regulares somam-se. Continua a cuidar de ti.',
  },
  intuition: {
    entry: 'Treina a tua intuição',
    entrySub: 'Sente qual estrela está escondida',
    title: 'Intuição',
    prompt: 'Qual te chama?',
    hit: 'A tua intuição está apurada ✨',
    miss: 'Confia na próxima 🌙',
    score: '{hits}/{total} acertadas',
    streak: '🔥 sequência {n}',
    again: 'Outra vez',
  },
  moodTrend: {
    title: 'O teu humor',
    window: 'últimos {n} dias',
    empty: 'Regista como te sentes e a tendência do teu humor aparece aqui.',
    trendUp: 'mais calmo ultimamente ↑',
    trendDown: 'um pouco mais em baixo ultimamente ↓',
    trendFlat: 'estável →',
  },
  legal: { title: 'Legal', privacy: 'Política de privacidade', terms: 'Termos e condições' },
  backup: {
    title: 'Cópia de segurança e restauro',
    sub: 'Guarda o teu progresso ou leva-o para outro dispositivo',
    export: '⬆️ Copiar cópia de segurança',
    exported: 'Cópia copiada. Cola-a numa nota ou ficheiro para a manteres segura.',
    exportError: 'Não foi possível criar a cópia de segurança.',
    restore: '⬇️ Restaurar a partir de uma cópia',
    placeholder: 'Cola aqui a tua cópia de segurança…',
    restoreBtn: 'Restaurar',
    restored: '{n} itens restaurados. Reinicia a app para veres tudo.',
    restoreError: 'Isso não parece uma cópia de segurança da Stillnova.',
    cancel: 'Cancelar',
  },
  profile: { /* merge */
    phaseCues: 'Sinais de respiração',
    phaseCuesSub: 'Uma vibração subtil a cada inspiração, pausa e expiração',
    analytics: 'Partilhar utilização anónima',
    analyticsSub: 'Ajuda-nos a melhorar a Stillnova. Sem dados pessoais, sem rastreio.',
    sleepFade: 'Suavizar sons para dormir',
    sleepFadeSub: 'Depois de uma sessão, o som desvanece suavemente durante cerca de 90 segundos',
    langLimitTitle: 'Mudança de idioma limitada',
    langLimitDaily: 'Já mudaste de idioma algumas vezes hoje. Tenta amanhã. Assim evitamos regenerar o teu conteúdo diário demasiadas vezes.',
    langLimitCooldown: 'Aguarda cerca de {min} min antes de mudares de idioma outra vez.',
    langConfirmTitle: 'Mudar de idioma?',
    langConfirmMsg: 'O teu conteúdo diário será regenerado no novo idioma. Ainda tens {remaining} mudança(s) hoje.',
    langConfirmYes: 'Mudar',
    voice: 'Voz da IA',
    voiceSub: 'A voz com que a tua companheira fala',
    voice_female: 'Feminina',
    voice_male: 'Masculina',
  },
  clara: { /* merge */ listening: 'A ouvir… fala agora' },
  recap: {
    kicker: 'A TUA SEMANA EM RESUMO',
    title: 'Uma semana de\ncéus mais limpos ✨',
    minutesLabel: 'minutos',
    sessionsLabel: 'sessões',
    activeDaysLabel: 'dias ativos',
    same: '± igual à semana passada',
    vsLast: '{arrow} {value} {unit} vs a semana passada',
    moodDelta: '{arrow} humor {value} rumo à calma',
    button: 'Começar uma nova semana',
  },
  suggestion: {
    night: 'É tarde. A respiração 4-7-8 pode ajudar-te a deslizar para o sono. 🌙',
    lowMood: 'Sentes-te tenso? Uma sessão mais lenta de Calma Profunda pode ajudar-te a assentar. 💙',
    highMood: 'Estás num bom momento. Uma sessão curta de Respiração Quadrada mantém-te centrado. ✨',
  },
  numerology: {
    label: 'Numerologia',
    homeCardTitle: 'Numerologia diária',
    homeCardSubtitle: 'O teu número do destino e a tua Matriz',
    setupTitle: 'Os teus dados de nascimento',
    setupSubtitle: 'Usados para calcular o teu número do destino e a Matriz do Destino.',
    firstName: 'Nome',
    lastName: 'Apelido',
    gender: 'Género',
    genderFemale: 'Feminino',
    genderMale: 'Masculino',
    genderOther: 'Outro',
    dob: 'Data de nascimento',
    day: 'Dia',
    month: 'Mês',
    year: 'Ano',
    birthTime: 'Hora de nascimento',
    hour: 'Hora',
    minute: 'Min',
    selectDate: 'Toca para escolher uma data',
    selectTime: 'Toca para escolher uma hora',
    locality: 'Localidade de nascimento',
    localityPlaceholder: 'Cidade ou vila',
    country: 'País de nascimento',
    countryPlaceholder: 'País',
    place: 'Local de nascimento',
    placePlaceholder: 'Cidade ou vila, país',
    save: 'Calcular',
    edit: 'Editar dados de nascimento',
    coreTitle: 'Os teus números essenciais',
    lifePath: 'Caminho de vida',
    lifePathHint: 'o teu número do destino',
    expression: 'Expressão',
    soulUrge: 'Impulso da alma',
    personality: 'Personalidade',
    personalDay: 'Dia pessoal',
    todayTitle: 'A leitura de hoje',
    matrixTitle: 'Matriz do Destino',
    matrixHint: 'Centro = a tua energia essencial · os cantos são os 22 arcanos',
    matrixTapHint: 'Toca num número para veres o que significa →',
    arcanaLabel: 'Arcano',
    influence: 'Aqui, {arcana} molda a forma como vives esta parte da tua vida.',
    genMale: 'Linha masculina (paterna)',
    genFemale: 'Linha feminina (materna)',
    linesTitle: 'As tuas linhas de vida',
    relationships: 'Relações ❤️',
    money: 'Realização pessoal 💰',
    chakraTitle: 'Mapa de energia (7 chakras)',
    chakraPhysical: 'Corpo',
    chakraEnergy: 'Energia',
    chakraEmotions: 'Emoções',
    chakraTotal: 'Total',
    chakraNote: 'Uma interpretação simplificada do mapa de energia, para reflexão, não uma avaliação de saúde.',
    astroTitle: 'Sol e Ascendente',
    bigThreeTitle: 'Mapa astral · Os três grandes',
    bigThreeHint: 'O teu Sol, a tua Lua e o teu Ascendente, o coração do teu mapa.',
    natalOpen: 'Ver o mapa astral completo →',
    natalTitle: 'Mapa astral',
    natalPlacements: 'Planetas nos signos',
    natalTapHint: 'Toca num planeta ou aspeto para leres o que significa.',
    natalIn: 'em',
    aspect_conjunction: 'Conjunção',
    aspect_sextile: 'Sextil',
    aspect_square: 'Quadratura',
    aspect_trine: 'Trígono',
    aspect_opposition: 'Oposição',
    natalAspects: 'Aspetos',
    natalHouse: 'C{n}',
    natalNoBirth: 'Adiciona primeiro os teus dados de nascimento para veres o teu mapa.',
    natalNoHouses: 'Adiciona o teu local de nascimento para um Ascendente e casas exatos. Os planetas nos signos são mostrados sem casas.',
    sunSign: 'Sol',
    moonSign: 'Lua',
    ascendant: 'Ascendente',
    ascendantHint: 'O teu ascendente é estimado a partir da hora de nascimento. O mapa astral completo (em breve) usará o teu local de nascimento para um resultado exato.',
    disclaimer: 'Estas leituras são uma estimativa oferecida apenas para reflexão e entretenimento. Não nos responsabilizamos por eventuais erros.',
    incomplete: 'Preenche o teu nome e uma data de nascimento válida.',
    lockedTitle: 'Uma funcionalidade Premium',
    lockedBody: 'A numerologia diária, a Matriz do Destino e o teu mapa astral fazem parte do Stillnova Premium (5 $/mês).',
    lockedHint: 'A testar? Ativa "Premium (teste)" em Perfil → Definições para desbloqueares tudo.',
  },
  courses: {
    label: 'Programas',
    homeCardTitle: 'Programas de 7 dias',
    homeCardSubtitle: 'Percursos guiados, um dia tranquilo de cada vez',
    choose: 'Escolhe um programa',
    day: 'Dia {n}',
    dayOf: 'Dia {n} de 7',
    locked: 'Desbloqueia em {n} dia(s)',
    todaysPractice: 'Prática de hoje',
    reflectPrompt: 'Reflete',
    markComplete: 'Marcar o dia como concluído',
    completed: 'Concluído ✓',
    start: 'Começar o programa',
    leave: 'Sair do programa',
    finished: 'Programa concluído! 🎉',
    items: {
      'letting-go': { title: '7 dias para largar', description: 'Liberta o stress e a necessidade de controlar' },
      'better-sleep': { title: '7 noites para dormir melhor', description: 'Desacelera e descansa mais profundamente' },
      'finding-focus': { title: '7 dias de foco', description: 'Constrói uma mente mais clara e calma' },
    },
  },
  reflection: { /* merge */
    questions: {
      release: 'O que podes largar antes de dormir?',
      wentWell: 'O que correu bem hoje, por mais pequeno que seja?',
      grateful: 'Pelo que estás grato esta noite?',
      emotion: 'Que emoção carregas contigo? Consegues pousá-la?',
      lighter: 'O que tornaria o amanhã um pouco mais leve?',
      calm: 'Quem ou o que te trouxe calma hoje?',
      kind: 'Que gesto bondoso tiveste hoje, com os outros ou contigo?',
      canWait: 'O que pode esperar até amanhã?',
    },
  },
  seasonal: {
    fullMoon: { title: 'Lua cheia esta noite 🌕', message: 'A lua está cheia, uma noite perfeita para largares o que já não te serve.' },
    newYear: { title: 'Ano novo, mente clara ✨', message: 'Um novo começo. Define uma intenção serena para o ano que aí vem.' },
    newYearEve: { title: 'Véspera de Ano Novo 🎆', message: 'Fecha o ano com algumas respirações conscientes. Chegaste até aqui.' },
    winterSolstice: { title: 'Solstício de inverno ❄️', message: 'A noite mais longa. Vira-te para dentro, descansa e deixa a quietude restaurar-te.' },
    summerSolstice: { title: 'Solstício de verão ☀️', message: 'O dia mais longo. Inspira a luz e deixa a tua energia subir.' },
    springEquinox: { title: 'Equinócio de primavera 🌸', message: 'O equilíbrio regressa. Planta uma pequena intenção e vê-a crescer.' },
    autumnEquinox: { title: 'Equinócio de outono 🍂', message: 'Um tempo de equilíbrio. Larga com suavidade, como folhas ao vento.' },
  },
  challenges: {
    'session-5min': 'Completa uma sessão de 5 minutos',
    'pattern-478': 'Experimenta o padrão 4-7-8',
    'pattern-box': 'Faz uma sessão de Respiração Quadrada',
    'mood-checkin': 'Regista o teu humor depois de uma sessão',
    'read-guide': 'Lê o teu guia diário completo',
    'morning': 'Medita antes do meio-dia',
    'two-sessions': 'Completa 2 sessões hoje',
    'session-10min': 'Completa uma sessão de 10 minutos',
    'soundscape': 'Medita com uma paisagem sonora',
  },
  ranks: {
    '1': 'Mente errante', '2': 'Mente curiosa', '3': 'Mente a despertar', '4': 'Buscador de calma',
    '5': 'Aprendiz da respiração', '6': 'Água serena', '7': 'Céu limpo', '8': 'Aprendiz zen',
    '9': 'Jardineiro da mente', '10': 'Luz interior', '11': 'Calma cósmica', '12': 'Mente clara',
    enlightened: 'Iluminado',
  },
  achievements: {
    'first-breath': { name: 'Primeira respiração', description: 'Completa a tua primeira sessão' },
    'mood-explorer': { name: 'Explorador do humor', description: 'Regista o teu primeiro estado de espírito' },
    'sound-bather': { name: 'Banho de som', description: 'Medita com uma paisagem sonora' },
    'night-owl': { name: 'Coruja noturna', description: 'Completa uma sessão depois das 21h' },
    'streak-3': { name: 'Faísca', description: 'Alcança uma sequência de 3 dias' },
    'streak-7': { name: 'Chama constante', description: 'Alcança uma sequência de 7 dias' },
    'streak-30': { name: 'Fogo eterno', description: 'Alcança uma sequência de 30 dias' },
    'streak-100': { name: 'Supernova', description: 'Alcança uma sequência de 100 dias' },
    'minutes-30': { name: 'A assentar', description: '30 minutos conscientes no total' },
    'minutes-100': { name: 'Raízes profundas', description: '100 minutos conscientes no total' },
    'minutes-500': { name: 'Floresta antiga', description: '500 minutos conscientes no total' },
    'minutes-1000': { name: 'Floresta sagrada', description: '1000 minutos conscientes no total' },
    'all-patterns': { name: 'Mestre dos padrões', description: 'Experimenta os 3 padrões de respiração' },
    'marathon': { name: 'Mente maratonista', description: 'Completa uma sessão de 20 minutos' },
    'perfect-day': { name: 'Dia perfeito', description: 'Completa os 3 desafios diários' },
    'level-10': { name: 'Luz interior', description: 'Alcança o nível 10' },
  },
```

## Appendix C: new keys for text that is currently hardcoded

These keys do not exist yet. Add them to `en.ts` (shape), then to all six other locales. Romanian is included because the notification, Clara-fallback and guided-fallback text is not in Romanian today either. For the astrology/numerology sets the Romanian value already exists in code (`astroText.ts`, `destinyMatrix.ts`); move it as-is, so only the five new languages are drafted here.

### C.1 Notifications (`notifications.*`)

Replace `REMINDER_MESSAGES` and `buildPersonalizedMessage` with `translate()` calls. `{rank}` is the localized rank name from `rankName(level, translate)`; `{streak}` and `{next}` are numbers.

| key | en |
|---|---|
| `notifications.channelName` | Daily reminders |
| `notifications.generic.0` | 🌙 The stars are aligning for your daily moment of calm. |
| `notifications.generic.1` | ✨ One breath at a time. Open Stillnova. |
| `notifications.generic.2` | 🧘 A clear mind awaits. Take 5 minutes for yourself. |
| `notifications.generic.3` | 🌬️ Ready to breathe? Your daily reset is here. |
| `notifications.generic.4` | 🌌 Pause. Reset. Bloom. Your daily Stillnova is ready. |
| `notifications.streakNext` | 🔥 Day {next} is waiting, {rank}. Keep the flame alive. |
| `notifications.streakSave` | 🛡️ Don't let your {streak}-day streak fade. Two mindful minutes is all it takes. |
| `notifications.newStar` | 🌌 A new star is waiting in your sky, {rank}. |
| `notifications.streakAtRisk` | 🔥 Your {streak}-day streak ends at midnight. Two minutes keeps it alive. |

```ts
// ro
notifications: {
  channelName: 'Memento zilnic',
  generic: {
    0: '🌙 Stelele se aliniază pentru momentul tău zilnic de calm.',
    1: '✨ O respirație pe rând. Deschide Stillnova.',
    2: '🧘 O minte limpede te așteaptă. Ia-ți 5 minute pentru tine.',
    3: '🌬️ Gata să respiri? Resetarea ta zilnică e aici.',
    4: '🌌 Pauză. Resetare. Înflorire. Stillnova ta zilnică e gata.',
  },
  streakNext: '🔥 Ziua {next} te așteaptă, {rank}. Ține flacăra aprinsă.',
  streakSave: '🛡️ Nu lăsa seria ta de {streak} zile să se stingă. Două minute de liniște sunt de ajuns.',
  newStar: '🌌 O stea nouă te așteaptă pe cerul tău, {rank}.',
  streakAtRisk: '🔥 Seria ta de {streak} zile se încheie la miezul nopții. Două minute o țin în viață.',
},
// es
notifications: {
  channelName: 'Recordatorios diarios',
  generic: {
    0: '🌙 Las estrellas se alinean para tu momento diario de calma.',
    1: '✨ Una respiración a la vez. Abre Stillnova.',
    2: '🧘 Una mente clara te espera. Tómate 5 minutos para ti.',
    3: '🌬️ ¿Listo para respirar? Tu reinicio diario está aquí.',
    4: '🌌 Pausa. Reinicia. Florece. Tu Stillnova de hoy está lista.',
  },
  streakNext: '🔥 El día {next} te espera, {rank}. Mantén viva la llama.',
  streakSave: '🛡️ No dejes que tu racha de {streak} días se apague. Dos minutos conscientes bastan.',
  newStar: '🌌 Una nueva estrella te espera en tu cielo, {rank}.',
  streakAtRisk: '🔥 Tu racha de {streak} días termina a medianoche. Dos minutos la mantienen viva.',
},
// it
notifications: {
  channelName: 'Promemoria giornalieri',
  generic: {
    0: '🌙 Le stelle si allineano per il tuo momento di calma quotidiano.',
    1: '✨ Un respiro alla volta. Apri Stillnova.',
    2: '🧘 Una mente chiara ti aspetta. Prenditi 5 minuti per te.',
    3: '🌬️ Pronto a respirare? Il tuo reset quotidiano è qui.',
    4: '🌌 Pausa. Reset. Fioritura. La tua Stillnova di oggi è pronta.',
  },
  streakNext: '🔥 Il giorno {next} ti aspetta, {rank}. Tieni viva la fiamma.',
  streakSave: '🛡️ Non lasciare che la tua serie di {streak} giorni si spenga. Bastano due minuti di calma.',
  newStar: '🌌 Una nuova stella ti aspetta nel tuo cielo, {rank}.',
  streakAtRisk: '🔥 La tua serie di {streak} giorni finisce a mezzanotte. Due minuti la tengono viva.',
},
// fr
notifications: {
  channelName: 'Rappels quotidiens',
  generic: {
    0: "🌙 Les étoiles s'alignent pour votre moment de calme du jour.",
    1: '✨ Une respiration à la fois. Ouvrez Stillnova.',
    2: '🧘 Un esprit clair vous attend. Prenez 5 minutes pour vous.',
    3: '🌬️ Prêt à respirer ? Votre pause du jour est là.',
    4: '🌌 Pause. Reset. Épanouissement. Votre Stillnova du jour est prête.',
  },
  streakNext: '🔥 Le jour {next} vous attend, {rank}. Gardez la flamme vivante.',
  streakSave: '🛡️ Ne laissez pas votre série de {streak} jours s\'éteindre. Deux minutes de calme suffisent.',
  newStar: '🌌 Une nouvelle étoile vous attend dans votre ciel, {rank}.',
  streakAtRisk: '🔥 Votre série de {streak} jours se termine à minuit. Deux minutes la gardent en vie.',
},
// de
notifications: {
  channelName: 'Tägliche Erinnerungen',
  generic: {
    0: '🌙 Die Sterne stehen günstig für deinen täglichen Moment der Ruhe.',
    1: '✨ Ein Atemzug nach dem anderen. Öffne Stillnova.',
    2: '🧘 Ein klarer Kopf wartet. Nimm dir 5 Minuten für dich.',
    3: '🌬️ Bereit zum Atmen? Dein täglicher Neustart ist da.',
    4: '🌌 Innehalten. Neu starten. Aufblühen. Dein tägliches Stillnova ist bereit.',
  },
  streakNext: '🔥 Tag {next} wartet, {rank}. Halte die Flamme am Leben.',
  streakSave: '🛡️ Lass deine Serie von {streak} Tagen nicht erlöschen. Zwei achtsame Minuten genügen.',
  newStar: '🌌 Ein neuer Stern wartet an deinem Himmel, {rank}.',
  streakAtRisk: '🔥 Deine Serie von {streak} Tagen endet um Mitternacht. Zwei Minuten halten sie am Leben.',
},
// pt
notifications: {
  channelName: 'Lembretes diários',
  generic: {
    0: '🌙 As estrelas alinham-se para o teu momento diário de calma.',
    1: '✨ Uma respiração de cada vez. Abre a Stillnova.',
    2: '🧘 Uma mente clara espera por ti. Reserva 5 minutos para ti.',
    3: '🌬️ Pronto para respirar? O teu reinício diário está aqui.',
    4: '🌌 Pausa. Reinicia. Floresce. A tua Stillnova de hoje está pronta.',
  },
  streakNext: '🔥 O dia {next} espera por ti, {rank}. Mantém a chama viva.',
  streakSave: '🛡️ Não deixes a tua sequência de {streak} dias apagar-se. Bastam dois minutos de calma.',
  newStar: '🌌 Uma nova estrela espera por ti no teu céu, {rank}.',
  streakAtRisk: '🔥 A tua sequência de {streak} dias termina à meia-noite. Dois minutos mantêm-na viva.',
},
```

### C.2 Small UI keys

| key | en | ro | es | it | fr | de | pt |
|---|---|---|---|---|---|---|---|
| `common.noResults` | No results | Niciun rezultat | Sin resultados | Nessun risultato | Aucun résultat | Keine Ergebnisse | Sem resultados |
| `profile.levelShort` | Lv {n} | Nv {n} | Nv {n} | Lv {n} | Niv {n} | Lv {n} | Nv {n} |
| `account.errGeneric` | Something went wrong. Please try again. | Ceva nu a mers. Încearcă din nou. | Algo salió mal. Inténtalo de nuevo. | Qualcosa è andato storto. Riprova. | Une erreur est survenue. Réessayez. | Etwas ist schiefgelaufen. Bitte versuch es erneut. | Algo correu mal. Tenta novamente. |
| `account.errInvalidLogin` | Wrong email or password. | Email sau parolă greșită. | Correo o contraseña incorrectos. | Email o password errati. | E-mail ou mot de passe incorrect. | E-Mail oder Passwort falsch. | Email ou palavra-passe errados. |
| `account.errEmailTaken` | An account with this email already exists. | Există deja un cont cu acest email. | Ya existe una cuenta con este correo. | Esiste già un account con questa email. | Un compte existe déjà avec cet e-mail. | Mit dieser E-Mail existiert bereits ein Konto. | Já existe uma conta com este email. |
| `account.deleteAccount` | Delete account | Șterge contul | Eliminar cuenta | Elimina account | Supprimer le compte | Konto löschen | Eliminar conta |
| `account.deleteConfirm` | This permanently deletes your account and cloud backup. Your data on this phone stays. | Aceasta îți șterge definitiv contul și copia din cloud. Datele de pe acest telefon rămân. | Esto elimina permanentemente tu cuenta y tu copia en la nube. Los datos de este teléfono se conservan. | Questo elimina definitivamente il tuo account e il backup cloud. I dati su questo telefono restano. | Cela supprime définitivement votre compte et votre sauvegarde cloud. Vos données sur ce téléphone restent. | Das löscht dein Konto und dein Cloud-Backup dauerhaft. Die Daten auf diesem Handy bleiben. | Isto elimina permanentemente a tua conta e a cópia na nuvem. Os dados neste telemóvel ficam. |
| `paywall.legalNote` | Auto-renews monthly until cancelled. Cancel anytime in your store account settings. | Se reînnoiește lunar până la anulare. Poți anula oricând din setările contului tău din magazin. | Se renueva automáticamente cada mes hasta que lo canceles. Cancela cuando quieras en los ajustes de tu cuenta de la tienda. | Si rinnova automaticamente ogni mese fino alla disdetta. Puoi annullare in qualsiasi momento dalle impostazioni del tuo account dello store. | Renouvellement automatique chaque mois jusqu'à résiliation. Annulable à tout moment dans les réglages de votre compte de la boutique. | Verlängert sich monatlich automatisch bis zur Kündigung. Jederzeit in den Einstellungen deines Store-Kontos kündbar. | Renova-se automaticamente todos os meses até ser cancelado. Cancela quando quiseres nas definições da tua conta da loja. |
| `paywall.annual` | Yearly | Anual | Anual | Annuale | Annuel | Jährlich | Anual |
| `paywall.monthly` | Monthly | Lunar | Mensual | Mensile | Mensuel | Monatlich | Mensal |
| `paywall.perYear` | /year | /an | /año | /anno | /an | /Jahr | /ano |
| `paywall.save` | Save {pct}% | Economisești {pct}% | Ahorra un {pct}% | Risparmi il {pct}% | Économisez {pct}% | Spare {pct}% | Poupa {pct}% |
| `paywall.trial` | 7 days free, then {price}/year | 7 zile gratuit, apoi {price}/an | 7 días gratis, luego {price}/año | 7 giorni gratis, poi {price}/anno | 7 jours gratuits, puis {price}/an | 7 Tage kostenlos, dann {price}/Jahr | 7 dias grátis, depois {price}/ano |
| `paywall.webOnly` | Premium is available in the iOS and Android apps. | Premium este disponibil în aplicațiile iOS și Android. | Premium está disponible en las apps de iOS y Android. | Premium è disponibile nelle app iOS e Android. | Premium est disponible dans les applications iOS et Android. | Premium ist in den iOS- und Android-Apps verfügbar. | O Premium está disponível nas apps iOS e Android. |
| `leaderboard.consentTitle` | Join the leaderboard? | Intri în clasament? | ¿Unirte a la clasificación? | Entri in classifica? | Rejoindre le classement ? | Zur Rangliste hinzufügen? | Entrar na classificação? |
| `leaderboard.consentMsg` | Your name, sign and stats will be visible to other Stillnova users. You can use a nickname. | Numele, zodia și statisticile tale vor fi vizibile altor utilizatori Stillnova. Poți folosi un pseudonim. | Tu nombre, tu signo y tus estadísticas serán visibles para otros usuarios de Stillnova. Puedes usar un apodo. | Il tuo nome, il tuo segno e le tue statistiche saranno visibili agli altri utenti di Stillnova. Puoi usare un soprannome. | Votre nom, votre signe et vos statistiques seront visibles par les autres utilisateurs de Stillnova. Vous pouvez utiliser un pseudo. | Dein Name, dein Zeichen und deine Werte sind für andere Stillnova-Nutzer sichtbar. Du kannst einen Spitznamen verwenden. | O teu nome, signo e estatísticas ficarão visíveis para outros utilizadores da Stillnova. Podes usar uma alcunha. |
| `leaderboard.nickname` | Nickname | Pseudonim | Apodo | Soprannome | Pseudo | Spitzname | Alcunha |

### C.3 Clara offline fallbacks (`clara.fallbacks.0..2`)

| lang | 0 | 1 | 2 |
|---|---|---|---|
| en | I'm here with you. Take one slow breath with me: in for four, out for six. What's on your mind? | I can't reach my thoughts just now, but I'm still here. Try a slow exhale. Sometimes that's the whole practice. | Let's stay gentle. Even a single mindful breath counts. Tell me more when you're ready. |
| ro | Sunt aici cu tine. Respiră o dată lent împreună cu mine: inspiră patru timpi, expiră șase. Ce ai pe suflet? | Nu-mi pot aduna gândurile chiar acum, dar sunt tot aici. Încearcă o expirație lentă. Uneori asta e toată practica. | Să rămânem blânzi. Chiar și o singură respirație conștientă contează. Povestește-mi când ești gata. |
| es | Estoy aquí contigo. Respira despacio conmigo: inhala en cuatro, exhala en seis. ¿Qué tienes en la cabeza? | Ahora mismo no llego a mis pensamientos, pero sigo aquí. Prueba una exhalación lenta. A veces esa es toda la práctica. | Seamos amables. Incluso una sola respiración consciente cuenta. Cuéntame más cuando estés listo. |
| it | Sono qui con te. Fai un respiro lento con me: inspira per quattro, espira per sei. Cosa ti passa per la testa? | In questo momento non riesco a raggiungere i miei pensieri, ma sono ancora qui. Prova un'espirazione lenta. A volte è tutta la pratica. | Restiamo gentili. Anche un solo respiro consapevole conta. Raccontami di più quando sei pronto. |
| fr | Je suis là avec vous. Prenez une respiration lente avec moi : inspirez sur quatre, expirez sur six. Qu'avez-vous en tête ? | Je n'arrive pas à rassembler mes pensées pour l'instant, mais je suis toujours là. Essayez une expiration lente. Parfois, c'est toute la pratique. | Restons doux. Même une seule respiration consciente compte. Racontez-moi quand vous serez prêt. |
| de | Ich bin bei dir. Atme einmal langsam mit mir: vier Zähler ein, sechs aus. Was beschäftigt dich? | Ich komme gerade nicht an meine Gedanken, aber ich bin noch da. Versuch ein langsames Ausatmen. Manchmal ist das die ganze Übung. | Bleiben wir sanft. Schon ein einziger bewusster Atemzug zählt. Erzähl mir mehr, wenn du bereit bist. |
| pt | Estou aqui contigo. Respira devagar comigo: inspira em quatro, expira em seis. O que te vai na cabeça? | Não consigo chegar aos meus pensamentos agora, mas continuo aqui. Experimenta uma expiração lenta. Às vezes é essa toda a prática. | Vamos ser gentis. Até uma única respiração consciente conta. Conta-me mais quando estiveres pronto. |

### C.4 Guided meditation offline script (`guided.fallback.0..9`, `guided.goalFocus.<goal>`, `guided.goalLine`)

`guided.goalLine` = "Let this be your moment for {focus}." with `{focus}` from `guided.goalFocus.*`.

```ts
// en
guided: { /* merge */
  goalLine: 'Let this be your moment for {focus}.',
  goalFocus: {
    sleep: 'drifting toward deep, restful sleep and releasing the day',
    stress: 'releasing tension and finding calm, grounded safety',
    focus: 'clearing mental clutter and settling into steady focus',
    curiosity: 'gently exploring the present moment with open curiosity',
  },
  fallback: {
    0: 'Find a comfortable position, and gently let your eyes close.',
    1: 'Take a slow breath in through your nose… and a long breath out.',
    2: 'Feel the weight of your body settling, supported and safe.',
    3: 'There is nothing to do right now, and nowhere else to be.',
    4: 'Notice the gentle rhythm of your breath, without changing it.',
    5: 'If your mind wanders, that is okay. Softly return to the breath.',
    6: 'With each exhale, let a little more tension melt away.',
    7: 'Rest here, calm and whole, for a few more breaths.',
    8: 'When you are ready, slowly bring your awareness back to the room.',
    9: 'Carry this calm with you. You are grounded, and you are enough.',
  },
},
// ro
guided: {
  goalLine: 'Fie acesta momentul tău pentru {focus}.',
  goalFocus: {
    sleep: 'a aluneca spre un somn adânc și odihnitor, lăsând ziua în urmă',
    stress: 'a elibera tensiunea și a găsi calm și siguranță',
    focus: 'a limpezi mintea și a te așeza într-o concentrare stabilă',
    curiosity: 'a explora blând momentul prezent, cu o curiozitate deschisă',
  },
  fallback: {
    0: 'Găsește o poziție confortabilă și lasă-ți ochii să se închidă ușor.',
    1: 'Inspiră lent pe nas… și expiră prelung.',
    2: 'Simte cum greutatea corpului se așază, susținută și în siguranță.',
    3: 'Nu ai nimic de făcut acum și nicăieri altundeva de fost.',
    4: 'Observă ritmul blând al respirației, fără să-l schimbi.',
    5: 'Dacă mintea rătăcește, e în regulă. Revino ușor la respirație.',
    6: 'Cu fiecare expirație, lasă încă puțină tensiune să se topească.',
    7: 'Rămâi aici, calm și întreg, încă câteva respirații.',
    8: 'Când ești gata, adu-ți încet atenția înapoi în cameră.',
    9: 'Ia acest calm cu tine. Ești ancorat și ești de ajuns.',
  },
},
// es
guided: {
  goalLine: 'Que este sea tu momento para {focus}.',
  goalFocus: {
    sleep: 'deslizarte hacia un sueño profundo y reparador, soltando el día',
    stress: 'liberar la tensión y encontrar calma y seguridad',
    focus: 'despejar la mente y asentarte en una concentración estable',
    curiosity: 'explorar con suavidad el momento presente, con curiosidad abierta',
  },
  fallback: {
    0: 'Busca una postura cómoda y deja que tus ojos se cierren suavemente.',
    1: 'Inhala despacio por la nariz… y exhala largo.',
    2: 'Siente cómo el peso de tu cuerpo se asienta, sostenido y a salvo.',
    3: 'No hay nada que hacer ahora mismo, ni ningún otro lugar donde estar.',
    4: 'Observa el ritmo suave de tu respiración, sin cambiarlo.',
    5: 'Si tu mente se distrae, está bien. Vuelve con suavidad a la respiración.',
    6: 'Con cada exhalación, deja que un poco más de tensión se disuelva.',
    7: 'Descansa aquí, en calma y entero, unas respiraciones más.',
    8: 'Cuando estés listo, trae poco a poco tu atención de vuelta a la habitación.',
    9: 'Lleva esta calma contigo. Estás en tierra firme, y eres suficiente.',
  },
},
// it
guided: {
  goalLine: 'Che questo sia il tuo momento per {focus}.',
  goalFocus: {
    sleep: 'scivolare verso un sonno profondo e ristoratore, lasciando andare la giornata',
    stress: 'sciogliere la tensione e trovare calma e sicurezza',
    focus: 'liberare la mente e posarti in una concentrazione stabile',
    curiosity: 'esplorare con dolcezza il momento presente, con curiosità aperta',
  },
  fallback: {
    0: 'Trova una posizione comoda e lascia che gli occhi si chiudano dolcemente.',
    1: 'Inspira lentamente dal naso… ed espira a lungo.',
    2: 'Senti il peso del corpo che si posa, sostenuto e al sicuro.',
    3: "Non c'è niente da fare adesso, e nessun altro posto in cui essere.",
    4: 'Osserva il ritmo dolce del tuo respiro, senza cambiarlo.',
    5: 'Se la mente vaga, va bene così. Torna con dolcezza al respiro.',
    6: 'A ogni espirazione, lascia sciogliere un po\' di tensione in più.',
    7: 'Riposa qui, calmo e intero, per qualche altro respiro.',
    8: 'Quando sei pronto, riporta lentamente la tua attenzione nella stanza.',
    9: 'Porta questa calma con te. Sei radicato, e sei abbastanza.',
  },
},
// fr
guided: {
  goalLine: 'Que ce soit votre moment pour {focus}.',
  goalFocus: {
    sleep: 'glisser vers un sommeil profond et réparateur, en laissant la journée derrière vous',
    stress: 'relâcher la tension et trouver le calme et la sécurité',
    focus: "clarifier l'esprit et vous installer dans une concentration stable",
    curiosity: 'explorer doucement le moment présent, avec une curiosité ouverte',
  },
  fallback: {
    0: 'Trouvez une position confortable et laissez doucement vos yeux se fermer.',
    1: 'Inspirez lentement par le nez… et expirez longuement.',
    2: 'Sentez le poids de votre corps se poser, soutenu et en sécurité.',
    3: "Il n'y a rien à faire maintenant, et nulle part ailleurs où être.",
    4: 'Observez le rythme doux de votre respiration, sans le changer.',
    5: "Si votre esprit vagabonde, ce n'est pas grave. Revenez doucement au souffle.",
    6: 'À chaque expiration, laissez un peu plus de tension se dissoudre.',
    7: 'Reposez-vous ici, calme et entier, pour quelques respirations encore.',
    8: 'Quand vous êtes prêt, ramenez lentement votre attention dans la pièce.',
    9: 'Emportez ce calme avec vous. Vous êtes ancré, et vous êtes suffisant.',
  },
},
// de
guided: {
  goalLine: 'Lass dies dein Moment sein für {focus}.',
  goalFocus: {
    sleep: 'das Hinübergleiten in einen tiefen, erholsamen Schlaf und das Loslassen des Tages',
    stress: 'das Lösen von Anspannung und das Finden von Ruhe und Sicherheit',
    focus: 'das Klären des Kopfes und das Ankommen in einer stetigen Konzentration',
    curiosity: 'das sanfte Erkunden des gegenwärtigen Moments mit offener Neugier',
  },
  fallback: {
    0: 'Finde eine bequeme Position und lass die Augen sanft zufallen.',
    1: 'Atme langsam durch die Nase ein… und lang wieder aus.',
    2: 'Spür, wie sich das Gewicht deines Körpers setzt, getragen und sicher.',
    3: 'Es gibt jetzt nichts zu tun und keinen anderen Ort, an dem du sein musst.',
    4: 'Beobachte den sanften Rhythmus deines Atems, ohne ihn zu verändern.',
    5: 'Wenn deine Gedanken wandern, ist das in Ordnung. Kehr sanft zum Atem zurück.',
    6: 'Mit jedem Ausatmen darf ein wenig mehr Anspannung schmelzen.',
    7: 'Ruh hier, ruhig und ganz, noch ein paar Atemzüge lang.',
    8: 'Wenn du bereit bist, bring deine Aufmerksamkeit langsam zurück in den Raum.',
    9: 'Nimm diese Ruhe mit. Du bist geerdet, und du bist genug.',
  },
},
// pt
guided: {
  goalLine: 'Que este seja o teu momento para {focus}.',
  goalFocus: {
    sleep: 'deslizar para um sono profundo e reparador, deixando o dia para trás',
    stress: 'soltar a tensão e encontrar calma e segurança',
    focus: 'limpar a mente e assentar numa concentração estável',
    curiosity: 'explorar com suavidade o momento presente, com curiosidade aberta',
  },
  fallback: {
    0: 'Encontra uma posição confortável e deixa os olhos fecharem-se suavemente.',
    1: 'Inspira devagar pelo nariz… e expira longamente.',
    2: 'Sente o peso do teu corpo a assentar, apoiado e em segurança.',
    3: 'Não há nada para fazer agora, nem outro lugar onde estar.',
    4: 'Repara no ritmo suave da tua respiração, sem o mudar.',
    5: 'Se a mente divagar, não faz mal. Volta com suavidade à respiração.',
    6: 'A cada expiração, deixa um pouco mais de tensão derreter.',
    7: 'Descansa aqui, calmo e inteiro, por mais algumas respirações.',
    8: 'Quando estiveres pronto, traz lentamente a tua atenção de volta à sala.',
    9: 'Leva esta calma contigo. Estás ancorado, e és suficiente.',
  },
},
```

### C.5 Course and numerology offline fallbacks

`courses.fallback.{title,intro,practice,reflection}` (title uses `{n}`), `numerology.fallback.{headline,message,focus}` (headline uses `{n}`). Romanian and English already exist in code; drafts for the five new languages:

| key | es | it | fr | de | pt |
|---|---|---|---|---|---|
| courses.fallback.title | Día {n} | Giorno {n} | Jour {n} | Tag {n} | Dia {n} |
| courses.fallback.intro | Tómate hoy un momento de calma solo para ti. | Prenditi oggi un momento di quiete solo per te. | Prenez aujourd'hui un moment de calme rien que pour vous. | Nimm dir heute einen ruhigen Moment nur für dich. | Tira hoje um momento de calma só para ti. |
| courses.fallback.practice | Haz cinco respiraciones lentas, alargando un poco cada exhalación. | Fai cinque respiri lenti, allungando un po\' ogni espirazione. | Prenez cinq respirations lentes, en allongeant un peu chaque expiration. | Nimm fünf langsame Atemzüge und verlängere jedes Ausatmen ein wenig. | Faz cinco respirações lentas, prolongando um pouco cada expiração. |
| courses.fallback.reflection | ¿Qué se sintió un poco más ligero hoy? | Cosa è stato un po\' più leggero oggi? | Qu'est-ce qui a semblé un peu plus léger aujourd'hui ? | Was hat sich heute ein wenig leichter angefühlt? | O que pareceu um pouco mais leve hoje? |
| numerology.fallback.headline | Tu Día personal {n} | Il tuo Giorno personale {n} | Votre Jour personnel {n} | Dein Persönlicher Tag {n} | O teu Dia pessoal {n} |
| numerology.fallback.message | Hoy es un buen día para respirar con intención y dar un paso pequeño y firme. | Oggi è un buon giorno per respirare con intenzione e fare un passo piccolo e sicuro. | Aujourd'hui est un bon jour pour respirer avec intention et faire un petit pas sûr. | Heute ist ein guter Tag, um bewusst zu atmen und einen kleinen, sicheren Schritt zu gehen. | Hoje é um bom dia para respirares com intenção e dares um passo pequeno e firme. |
| numerology.fallback.focus | Un gesto de amabilidad hacia ti mismo. | Un gesto di gentilezza verso te stesso. | Un geste de bienveillance envers vous-même. | Eine kleine Freundlichkeit dir selbst gegenüber. | Um gesto de bondade para contigo. |

### C.6 Astrology interpretation text (`astro.*`), replacing `constants/astroText.ts`

Structure: `astro.planets.<Sun|Moon|…>` (display name), `astro.themes.<planet>`, `astro.signs.<sign>` (quality), `astro.houses.<1..12>`, `astro.aspects.<type>`, `astro.placement` = "{theme} is {quality}." style template, `astro.house` = "It shows up most in: {house}.", `astro.aspect` = "{a} & {b} {verb}.". Romanian values move from `astroText.ts` unchanged. English = the current values with the capitalized template. Drafts for the five new languages:

**Planet display names** (`astro.planets.*`)

| en | es | it | fr | de | pt |
|---|---|---|---|---|---|
| Sun | Sol | Sole | Soleil | Sonne | Sol |
| Moon | Luna | Luna | Lune | Mond | Lua |
| Mercury | Mercurio | Mercurio | Mercure | Merkur | Mercúrio |
| Venus | Venus | Venere | Vénus | Venus | Vénus |
| Mars | Marte | Marte | Mars | Mars | Marte |
| Jupiter | Júpiter | Giove | Jupiter | Jupiter | Júpiter |
| Saturn | Saturno | Saturno | Saturne | Saturn | Saturno |
| Uranus | Urano | Urano | Uranus | Uranus | Urano |
| Neptune | Neptuno | Nettuno | Neptune | Neptun | Neptuno |
| Pluto | Plutón | Plutone | Pluton | Pluto | Plutão |
| Ascendant | Ascendente | Ascendente | Ascendant | Aszendent | Ascendente |
| Midheaven | Medio Cielo | Medio Cielo | Milieu du Ciel | Medium Coeli | Meio do Céu |

(ro: Soare, Lună, Mercur, Venus, Marte, Jupiter, Saturn, Uranus, Neptun, Pluto, Ascendent, Mijlocul Cerului.)

**Planet themes** (`astro.themes.*`)

| planet | es | it | fr | de | pt |
|---|---|---|---|---|---|
| Sun | tu identidad esencial y tu vitalidad | la tua identità profonda e la tua vitalità | votre identité profonde et votre vitalité | deine Kernidentität und Vitalität | a tua identidade essencial e vitalidade |
| Moon | tus emociones, instintos y mundo interior | le tue emozioni, gli istinti e il mondo interiore | vos émotions, vos instincts et votre monde intérieur | deine Gefühle, Instinkte und innere Welt | as tuas emoções, instintos e mundo interior |
| Mercury | tu mente, tu pensamiento y tu comunicación | la tua mente, il pensiero e la comunicazione | votre esprit, votre pensée et votre communication | dein Denken, dein Verstand und deine Kommunikation | a tua mente, pensamento e comunicação |
| Venus | el amor, los valores y lo que encuentras bello | l'amore, i valori e ciò che trovi bello | l'amour, les valeurs et ce que vous trouvez beau | Liebe, Werte und das, was du schön findest | o amor, os valores e o que achas belo |
| Mars | tu impulso, tu energía y cómo actúas | la tua spinta, l'energia e il modo in cui agisci | votre élan, votre énergie et votre façon d'agir | dein Antrieb, deine Energie und wie du handelst | o teu impulso, energia e forma de agir |
| Jupiter | el crecimiento, la suerte y dónde te expandes | la crescita, la fortuna e dove ti espandi | la croissance, la chance et là où vous vous épanouissez | Wachstum, Glück und wo du dich entfaltest | o crescimento, a sorte e onde te expandes |
| Saturn | la disciplina, los límites y la estructura duradera | la disciplina, i limiti e la struttura duratura | la discipline, les limites et la structure durable | Disziplin, Grenzen und dauerhafte Struktur | a disciplina, os limites e a estrutura duradoura |
| Uranus | la originalidad, la libertad y el cambio repentino | l'originalità, la libertà e il cambiamento improvviso | l'originalité, la liberté et le changement soudain | Originalität, Freiheit und plötzlicher Wandel | a originalidade, a liberdade e a mudança súbita |
| Neptune | los sueños, la intuición y la imaginación | i sogni, l'intuizione e l'immaginazione | les rêves, l'intuition et l'imagination | Träume, Intuition und Vorstellungskraft | os sonhos, a intuição e a imaginação |
| Pluto | la transformación, la profundidad y el poder personal | la trasformazione, la profondità e il potere personale | la transformation, la profondeur et le pouvoir personnel | Wandlung, Tiefe und persönliche Kraft | a transformação, a profundidade e o poder pessoal |
| Ascendant | la forma en que te presentas al mundo | il modo in cui incontri il mondo e appari agli altri | la façon dont vous abordez le monde et dont on vous perçoit | die Art, wie du der Welt begegnest und wirkst | a forma como encaras o mundo e como és visto |
| Midheaven | tu papel público, tus ambiciones y tu dirección | il tuo ruolo pubblico, le ambizioni e la direzione | votre rôle public, vos ambitions et votre direction | deine öffentliche Rolle, Ambitionen und Richtung | o teu papel público, ambições e direção |

**Sign qualities** (`astro.signs.*`)

| sign | es | it | fr | de | pt |
|---|---|---|---|---|---|
| Aries | audaz, directo y rápido para empezar | audace, diretto e veloce a iniziare | audacieux, direct et prompt à commencer | mutig, direkt und schnell am Start | audaz, direto e rápido a começar |
| Taurus | estable, paciente y con los pies en la tierra | stabile, paziente e con i piedi per terra | stable, patient et ancré | beständig, geduldig und geerdet | estável, paciente e com os pés na terra |
| Gemini | curioso, versátil y comunicativo | curioso, versatile e loquace | curieux, polyvalent et bavard | neugierig, vielseitig und gesprächig | curioso, versátil e comunicativo |
| Cancer | afectuoso, sensible y protector | premuroso, sensibile e protettivo | attentionné, sensible et protecteur | fürsorglich, sensibel und beschützend | carinhoso, sensível e protetor |
| Leo | cálido, expresivo y orgulloso | caloroso, espressivo e orgoglioso | chaleureux, expressif et fier | warm, ausdrucksstark und stolz | caloroso, expressivo e orgulhoso |
| Virgo | preciso, práctico y servicial | preciso, pratico e disponibile | précis, pratique et serviable | genau, praktisch und hilfsbereit | preciso, prático e prestável |
| Libra | equilibrado, justo y orientado a las relaciones | equilibrato, giusto e orientato alle relazioni | équilibré, juste et tourné vers les relations | ausgeglichen, fair und beziehungsorientiert | equilibrado, justo e virado para as relações |
| Scorpio | intenso, profundo y de todo o nada | intenso, profondo e tutto o niente | intense, profond et tout ou rien | intensiv, tief und alles oder nichts | intenso, profundo e tudo ou nada |
| Sagittarius | aventurero, sincero y amante de la libertad | avventuroso, sincero e amante della libertà | aventureux, franc et épris de liberté | abenteuerlustig, ehrlich und freiheitsliebend | aventureiro, sincero e amante da liberdade |
| Capricorn | disciplinado, ambicioso y responsable | disciplinato, ambizioso e responsabile | discipliné, ambitieux et responsable | diszipliniert, ehrgeizig und verantwortungsvoll | disciplinado, ambicioso e responsável |
| Aquarius | independiente, ingenioso y orientado al futuro | indipendente, inventivo e proiettato al futuro | indépendant, inventif et tourné vers l'avenir | unabhängig, erfinderisch und zukunftsorientiert | independente, inventivo e virado para o futuro |
| Pisces | soñador, compasivo e imaginativo | sognatore, compassionevole e immaginativo | rêveur, compatissant et imaginatif | verträumt, mitfühlend und fantasievoll | sonhador, compassivo e imaginativo |

**Houses** (`astro.houses.1..12`)

| # | es | it | fr | de | pt |
|---|---|---|---|---|---|
| 1 | el yo y las primeras impresiones | il sé e le prime impressioni | le soi et les premières impressions | das Selbst und der erste Eindruck | o eu e as primeiras impressões |
| 2 | el dinero, los valores y la seguridad | denaro, valori e sicurezza | l'argent, les valeurs et la sécurité | Geld, Werte und Sicherheit | o dinheiro, os valores e a segurança |
| 3 | la comunicación y el aprendizaje | comunicazione e apprendimento | la communication et l'apprentissage | Kommunikation und Lernen | a comunicação e a aprendizagem |
| 4 | el hogar, la familia y las raíces | casa, famiglia e radici | le foyer, la famille et les racines | Zuhause, Familie und Wurzeln | o lar, a família e as raízes |
| 5 | la creatividad, el romance y el juego | creatività, romanticismo e gioco | la créativité, la romance et le jeu | Kreativität, Romantik und Spiel | a criatividade, o romance e a diversão |
| 6 | el trabajo, la salud y la rutina | lavoro, salute e routine | le travail, la santé et la routine | Arbeit, Gesundheit und Routine | o trabalho, a saúde e a rotina |
| 7 | las parejas y las relaciones | partnership e relazioni | les partenariats et les relations | Partnerschaften und Beziehungen | as parcerias e as relações |
| 8 | la intimidad, el cambio y los recursos compartidos | intimità, cambiamento e risorse condivise | l'intimité, le changement et les ressources partagées | Intimität, Wandel und geteilte Ressourcen | a intimidade, a mudança e os recursos partilhados |
| 9 | los viajes, las creencias y el sentido | viaggi, convinzioni e significato | les voyages, les croyances et le sens | Reisen, Überzeugungen und Sinn | as viagens, as crenças e o sentido |
| 10 | la carrera, el estatus y el propósito | carriera, status e scopo | la carrière, le statut et le but | Karriere, Status und Bestimmung | a carreira, o estatuto e o propósito |
| 11 | los amigos, los grupos y las esperanzas | amici, gruppi e speranze | les amis, les groupes et les espoirs | Freunde, Gruppen und Hoffnungen | os amigos, os grupos e as esperanças |
| 12 | la vida interior, el descanso y la liberación | la vita interiore, il riposo e il lasciar andare | la vie intérieure, le repos et le lâcher-prise | das Innenleben, Ruhe und Loslassen | a vida interior, o descanso e a libertação |

**Aspects** (`astro.aspects.*`, verb phrase after "{a} & {b}")

| type | es | it | fr | de | pt |
|---|---|---|---|---|---|
| conjunction | se funden y se intensifican mutuamente | si fondono e si intensificano a vicenda | se mêlent et s'intensifient mutuellement | verschmelzen und verstärken einander | fundem-se e intensificam-se mutuamente |
| sextile | se apoyan con oportunidades fáciles | si sostengono con opportunità facili | se soutiennent par des opportunités faciles | unterstützen einander mit leichten Gelegenheiten | apoiam-se com oportunidades fáceis |
| square | crean una tensión productiva que te empuja a crecer | creano una tensione produttiva che ti spinge a crescere | créent une tension productive qui vous pousse à grandir | erzeugen eine produktive Spannung, die dich wachsen lässt | criam uma tensão produtiva que te empurra a crescer |
| trine | fluyen juntos de forma natural y con facilidad | scorrono insieme in modo naturale e con facilità | s'accordent naturellement et avec aisance | fließen natürlich und mühelos zusammen | fluem juntos de forma natural e com facilidade |
| opposition | tiran en direcciones opuestas y piden equilibrio | tirano in direzioni opposte, chiedendo equilibrio | tirent dans des directions opposées et demandent de l'équilibre | ziehen in entgegengesetzte Richtungen und verlangen Balance | puxam em direções opostas, pedindo equilíbrio |

**Templates**

| key | es | it | fr | de | pt |
|---|---|---|---|---|---|
| astro.placement | {theme}: {quality}. | {theme}: {quality}. | {theme} : {quality}. | {theme}: {quality}. | {theme}: {quality}. |
| astro.house | Se manifiesta sobre todo en: {house}. | Si manifesta soprattutto in: {house}. | Cela s'exprime surtout dans : {house}. | Zeigt sich vor allem in: {house}. | Manifesta-se sobretudo em: {house}. |
| astro.aspect | {a} y {b} {verb}. | {a} e {b} {verb}. | {a} et {b} {verb}. | {a} und {b} {verb}. | {a} e {b} {verb}. |

(Using a colon template avoids gender/number agreement problems that "X is Y" creates in Romance languages; apply the same template to `en`/`ro` for consistency.)

### C.7 Destiny Matrix text (`arcana.*`, `matrix.positions.*`, `chakras.*`), replacing the `EnRo` tables in `destinyMatrix.ts`

**Arcana names** (`arcana.<1..22>.name`)

| # | en | es | it | fr | de | pt |
|---|---|---|---|---|---|---|
| 1 | The Magician | El Mago | Il Mago | Le Bateleur | Der Magier | O Mago |
| 2 | The High Priestess | La Sacerdotisa | La Papessa | La Papesse | Die Hohepriesterin | A Sacerdotisa |
| 3 | The Empress | La Emperatriz | L'Imperatrice | L'Impératrice | Die Herrscherin | A Imperatriz |
| 4 | The Emperor | El Emperador | L'Imperatore | L'Empereur | Der Herrscher | O Imperador |
| 5 | The Hierophant | El Sumo Sacerdote | Il Papa | Le Pape | Der Hierophant | O Hierofante |
| 6 | The Lovers | Los Enamorados | Gli Amanti | L'Amoureux | Die Liebenden | Os Enamorados |
| 7 | The Chariot | El Carro | Il Carro | Le Chariot | Der Wagen | O Carro |
| 8 | Justice | La Justicia | La Giustizia | La Justice | Die Gerechtigkeit | A Justiça |
| 9 | The Hermit | El Ermitaño | L'Eremita | L'Ermite | Der Eremit | O Eremita |
| 10 | Wheel of Fortune | La Rueda de la Fortuna | La Ruota della Fortuna | La Roue de Fortune | Das Rad des Schicksals | A Roda da Fortuna |
| 11 | Strength | La Fuerza | La Forza | La Force | Die Kraft | A Força |
| 12 | The Hanged Man | El Colgado | L'Appeso | Le Pendu | Der Gehängte | O Enforcado |
| 13 | Death | La Muerte | La Morte | La Mort | Der Tod | A Morte |
| 14 | Temperance | La Templanza | La Temperanza | Tempérance | Die Mäßigkeit | A Temperança |
| 15 | The Devil | El Diablo | Il Diavolo | Le Diable | Der Teufel | O Diabo |
| 16 | The Tower | La Torre | La Torre | La Maison Dieu | Der Turm | A Torre |
| 17 | The Star | La Estrella | La Stella | L'Étoile | Der Stern | A Estrela |
| 18 | The Moon | La Luna | La Luna | La Lune | Der Mond | A Lua |
| 19 | The Sun | El Sol | Il Sole | Le Soleil | Die Sonne | O Sol |
| 20 | Judgement | El Juicio | Il Giudizio | Le Jugement | Das Gericht | O Julgamento |
| 21 | The World | El Mundo | Il Mondo | Le Monde | Die Welt | O Mundo |
| 22 | The Fool | El Loco | Il Matto | Le Mat | Der Narr | O Louco |

**Arcana meanings** (`arcana.<n>.meaning`)

| # | es | it | fr | de | pt |
|---|---|---|---|---|---|
| 1 | Voluntad, iniciativa y el poder de materializar tus ideas. | Volontà, iniziativa e il potere di realizzare le tue idee. | Volonté, initiative et pouvoir de concrétiser vos idées. | Willenskraft, Initiative und die Kraft, deine Ideen zu verwirklichen. | Vontade, iniciativa e o poder de concretizar as tuas ideias. |
| 2 | Intuición, sabiduría interior y un saber sereno y paciente. | Intuizione, saggezza interiore e un sapere quieto e paziente. | Intuition, sagesse intérieure et savoir calme et patient. | Intuition, innere Weisheit und stilles, geduldiges Wissen. | Intuição, sabedoria interior e um saber sereno e paciente. |
| 3 | Creatividad, abundancia y un corazón cálido que cuida. | Creatività, abbondanza e un cuore caldo e premuroso. | Créativité, abondance et un cœur chaleureux et nourricier. | Kreativität, Fülle und ein warmes, nährendes Herz. | Criatividade, abundância e um coração caloroso e protetor. |
| 4 | Estructura, disciplina y una autoridad firme y con los pies en la tierra. | Struttura, disciplina e un'autorità solida e radicata. | Structure, discipline et autorité solide et ancrée. | Struktur, Disziplin und eine feste, geerdete Autorität. | Estrutura, disciplina e uma autoridade firme e assente. |
| 5 | Tradición, aprendizaje y guía espiritual. | Tradizione, apprendimento e guida spirituale. | Tradition, apprentissage et guidance spirituelle. | Tradition, Lernen und spirituelle Führung. | Tradição, aprendizagem e orientação espiritual. |
| 6 | Amor, decisiones con sentido y armonía en las relaciones. | Amore, scelte significative e armonia nelle relazioni. | Amour, choix qui comptent et harmonie dans les relations. | Liebe, bedeutsame Entscheidungen und Harmonie in Beziehungen. | Amor, escolhas com sentido e harmonia nas relações. |
| 7 | Impulso y victoria que llegan con enfoque y voluntad. | Slancio e vittoria che arrivano con concentrazione e volontà. | Élan et victoire qui viennent par la concentration et la volonté. | Antrieb und Sieg, die aus Fokus und Willen entstehen. | Impulso e vitória que chegam com foco e vontade. |
| 8 | Equilibrio, justicia y la ley de causa y efecto. | Equilibrio, giustizia e la legge di causa ed effetto. | Équilibre, justice et loi de cause à effet. | Gleichgewicht, Gerechtigkeit und das Gesetz von Ursache und Wirkung. | Equilíbrio, justiça e a lei da causa e do efeito. |
| 9 | Introspección, soledad y una guía interior profunda. | Introspezione, solitudine e una guida interiore profonda. | Introspection, solitude et guidance intérieure profonde. | Innenschau, Stille und tiefe innere Führung. | Introspeção, solidão e uma orientação interior profunda. |
| 10 | Ciclos, destino y el giro de la fortuna. | Cicli, destino e il volgere della fortuna. | Cycles, destin et retournement de fortune. | Zyklen, Schicksal und die Wendung des Glücks. | Ciclos, destino e a viragem da fortuna. |
| 11 | Valor, fuerza interior y una paciencia serena. | Coraggio, forza interiore e paziente dolcezza. | Courage, force intérieure et douce patience. | Mut, innere Stärke und sanfte Geduld. | Coragem, força interior e paciência serena. |
| 12 | Entrega, una nueva perspectiva y el poder de la pausa. | Resa, una nuova prospettiva e il potere della pausa. | Lâcher-prise, nouvelle perspective et pouvoir de la pause. | Hingabe, ein neuer Blick und die Kraft der Pause. | Entrega, uma nova perspetiva e o poder da pausa. |
| 13 | Transformación: finales que abren espacio al renacer. | Trasformazione: fini che fanno spazio alla rinascita. | Transformation : des fins qui font place à la renaissance. | Wandlung: Enden, die Raum für Neubeginn schaffen. | Transformação: fins que abrem espaço ao renascer. |
| 14 | Equilibrio, moderación y una sanación suave. | Equilibrio, moderazione e guarigione delicata. | Équilibre, modération et guérison en douceur. | Balance, Maß und sanfte Heilung. | Equilíbrio, moderação e uma cura suave. |
| 15 | Apego y deseo: una invitación a trabajar con la sombra. | Attaccamento e desiderio: un invito al lavoro sull'ombra. | Attachement et désir : une invitation au travail sur l'ombre. | Bindung und Verlangen: eine Einladung zur Schattenarbeit. | Apego e desejo: um convite ao trabalho com a sombra. |
| 16 | Un cambio repentino que rompe lo viejo y despierta lo nuevo. | Un cambiamento improvviso che rompe il vecchio e risveglia il nuovo. | Un changement soudain qui brise l'ancien et éveille le nouveau. | Plötzlicher Wandel, der Altes aufbricht und Neues weckt. | Uma mudança súbita que quebra o antigo e desperta o novo. |
| 17 | Esperanza, inspiración y una renovación serena. | Speranza, ispirazione e rinnovamento sereno. | Espoir, inspiration et renouveau serein. | Hoffnung, Inspiration und stille Erneuerung. | Esperança, inspiração e uma renovação serena. |
| 18 | Intuición, sueños y las profundidades del subconsciente. | Intuizione, sogni e le profondità del subconscio. | Intuition, rêves et profondeurs de l'inconscient. | Intuition, Träume und die Tiefen des Unterbewussten. | Intuição, sonhos e as profundezas do subconsciente. |
| 19 | Alegría, vitalidad, éxito y una claridad radiante. | Gioia, vitalità, successo e chiarezza radiosa. | Joie, vitalité, succès et clarté rayonnante. | Freude, Vitalität, Erfolg und strahlende Klarheit. | Alegria, vitalidade, sucesso e uma clareza radiante. |
| 20 | Despertar, reflexión sincera y un sentido de llamada. | Risveglio, riflessione sincera e senso di chiamata. | Éveil, réflexion honnête et sentiment d'appel. | Erwachen, ehrliche Reflexion und ein Gefühl von Berufung. | Despertar, reflexão sincera e um sentido de chamamento. |
| 21 | Plenitud, integridad y un logro consumado. | Compimento, interezza e realizzazione compiuta. | Accomplissement, plénitude et réussite achevée. | Vollendung, Ganzheit und erfüllte Leistung. | Plenitude, integridade e uma conquista consumada. |
| 22 | Libertad, nuevos comienzos y confianza en la espontaneidad. | Libertà, nuovi inizi e fiducia nella spontaneità. | Liberté, nouveaux départs et confiance en la spontanéité. | Freiheit, Neuanfänge und Vertrauen in die Spontaneität. | Liberdade, novos começos e confiança na espontaneidade. |

**Matrix positions** (`matrix.positions.<key>.{title,meaning}`)

| key | es | it | fr | de | pt |
|---|---|---|---|---|---|
| center | Energía esencial / Tu esencia: la energía central que moldea quién eres de verdad. | Energia essenziale / La tua essenza: l'energia centrale che modella chi sei davvero. | Énergie essentielle / Votre essence : l'énergie centrale qui façonne qui vous êtes vraiment. | Kernenergie / Dein Wesen: die zentrale Energie, die formt, wer du wirklich bist. | Energia essencial / A tua essência: a energia central que molda quem és de verdade. |
| character | Carácter / Cómo te presentas al mundo y expresas tu personalidad cada día. | Carattere / Come incontri il mondo ed esprimi la tua personalità ogni giorno. | Caractère / Comment vous abordez le monde et exprimez votre personnalité au quotidien. | Charakter / Wie du der Welt begegnest und deine Persönlichkeit im Alltag zeigst. | Caráter / Como encaras o mundo e expressas a tua personalidade no dia a dia. |
| innerTalents | Talentos interiores / Dones e influencias que dan forma a tu mundo interior. | Talenti interiori / Doni e influenze che plasmano il tuo mondo interiore. | Talents intérieurs / Dons et influences qui façonnent votre monde intérieur. | Innere Talente / Gaben und Einflüsse, die deine innere Welt prägen. | Talentos interiores / Dons e influências que moldam o teu mundo interior. |
| outerTalents | Talentos exteriores / Cómo se muestran tus dones en lo social y en el mundo. | Talenti esteriori / Come i tuoi doni si manifestano socialmente e nel mondo. | Talents extérieurs / Comment vos dons se manifestent socialement et dans le monde. | Äußere Talente / Wie sich deine Gaben im Sozialen und in der Welt zeigen. | Talentos exteriores / Como os teus dons se mostram socialmente e no mundo. |
| purpose | Propósito de vida / La lección y la dirección hacia las que estás aquí para crecer. | Scopo di vita / La lezione e la direzione verso cui sei qui per crescere. | But de vie / La leçon et la direction vers lesquelles vous êtes là pour grandir. | Lebensaufgabe / Die Lektion und Richtung, in die du hier wachsen sollst. | Propósito de vida / A lição e a direção para as quais estás aqui para crescer. |
| energyLine | Línea de energía / Un puente entre dos fuerzas de tu matriz que mezcla sus influencias. | Linea di energia / Un ponte tra due forze della tua matrice che ne fonde le influenze. | Ligne d'énergie / Un pont entre deux forces de votre matrice qui mêle leurs influences. | Energielinie / Eine Brücke zwischen zwei Kräften deiner Matrix, die ihre Einflüsse verbindet. | Linha de energia / Uma ponte entre duas forças da tua matriz que mistura as suas influências. |
| balance | Equilibrio interior / Un punto de tu cruz central que equilibra tu esencia con una energía exterior. | Equilibrio interiore / Un punto della tua croce centrale che bilancia l'essenza con un'energia esterna. | Équilibre intérieur / Un point de votre croix centrale qui équilibre votre essence avec une énergie extérieure. | Innere Balance / Ein Punkt deines zentralen Kreuzes, der dein Wesen mit einer äußeren Energie ausgleicht. | Equilíbrio interior / Um ponto da tua cruz central que equilibra a tua essência com uma energia exterior. |
| ancestral | Energía ancestral / Dones y lecciones transmitidos por tu línea familiar (materna o paterna). | Energia ancestrale / Doni e lezioni trasmessi lungo la tua linea familiare (materna o paterna). | Énergie ancestrale / Dons et leçons transmis par votre lignée familiale (maternelle ou paternelle). | Ahnenenergie / Gaben und Lektionen aus deiner Familienlinie (mütterlich oder väterlich). | Energia ancestral / Dons e lições transmitidos pela tua linha familiar (materna ou paterna). |
| relationships | Relaciones ❤️ / Tu línea del corazón: cómo amas, te vinculas y te relacionas. | Relazioni ❤️ / La tua linea del cuore: come ami, ti leghi e ti relazioni. | Relations ❤️ / Votre ligne du cœur : comment vous aimez, vous liez et entrez en relation. | Beziehungen ❤️ / Deine Herzlinie: wie du liebst, dich bindest und in Beziehung gehst. | Relações ❤️ / A tua linha do coração: como amas, te ligas e te relacionas. |
| money | Autorrealización 💰 / Tu línea del dinero y el éxito: cómo creas valor y abundancia. | Realizzazione 💰 / La tua linea del denaro e del successo: come crei valore e abbondanza. | Accomplissement 💰 / Votre ligne d'argent et de réussite : comment vous créez de la valeur et de l'abondance. | Selbstverwirklichung 💰 / Deine Geld- und Erfolgslinie: wie du Wert und Fülle erschaffst. | Realização pessoal 💰 / A tua linha do dinheiro e do sucesso: como crias valor e abundância. |

**Chakra themes** (`chakras.<key>.theme`; names are Sanskrit and stay)

| key | es | it | fr | de | pt |
|---|---|---|---|---|---|
| sahasrara | Misión | Missione | Mission | Mission | Missão |
| ajna | Destino | Destino | Destin | Schicksal | Destino |
| vishuddha | Suerte y palabra | Sorte e parola | Sort et parole | Schicksal und Wort | Sorte e palavra |
| anahata | Relaciones | Relazioni | Relations | Beziehungen | Relações |
| manipura | Estatus | Status | Statut | Status | Estatuto |
| svadhisthana | Familia y alegría | Famiglia e gioia | Famille et joie | Familie und Freude | Família e alegria |
| muladhara | Cuerpo y raíces | Corpo e radici | Corps et racines | Körper und Wurzeln | Corpo e raízes |

### C.8 Zodiac sign names per locale (`zodiac.<sign>`), optional but recommended

| sign | es | it | fr | de | pt |
|---|---|---|---|---|---|
| Aries | Aries | Ariete | Bélier | Widder | Carneiro |
| Taurus | Tauro | Toro | Taureau | Stier | Touro |
| Gemini | Géminis | Gemelli | Gémeaux | Zwillinge | Gémeos |
| Cancer | Cáncer | Cancro | Cancer | Krebs | Caranguejo |
| Leo | Leo | Leone | Lion | Löwe | Leão |
| Virgo | Virgo | Vergine | Vierge | Jungfrau | Virgem |
| Libra | Libra | Bilancia | Balance | Waage | Balança |
| Scorpio | Escorpio | Scorpione | Scorpion | Skorpion | Escorpião |
| Sagittarius | Sagitario | Sagittario | Sagittaire | Schütze | Sagitário |
| Capricorn | Capricornio | Capricorno | Capricorne | Steinbock | Capricórnio |
| Aquarius | Acuario | Acquario | Verseau | Wassermann | Aquário |
| Pisces | Piscis | Pesci | Poissons | Fische | Peixes |

With this key, `signName()` in `constants/localize.ts` becomes `t(\`zodiac.${sign.name}\`)` for every language (ro values: Berbec, Taur, Gemeni, Rac, Leu, Fecioară, Balanță, Scorpion, Săgetător, Capricorn, Vărsător, Pești; note the current `zodiac.ts` Romanian names lack diacritics: "Fecioara", "Balanta", "Sagetator", "Varsator", "Pesti").

---

*End of audit.*
