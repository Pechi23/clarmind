import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS, AchievementDef, XP, getLevelForXp } from '../constants/achievements';
import { getMeditationSessions, getMoodEntries, getStreak } from './storage';
import { BREATHING_PATTERNS } from './../constants/breathing';
import { pickDailyChallengeDefs } from './challengeLogic';

const KEYS = {
  XP_TOTAL: 'clarmind_xp_total',
  UNLOCKED: 'clarmind_achievements_unlocked',
  CHALLENGES: 'clarmind_challenges', // per-day completion state
  LAST_DAILY_XP: 'clarmind_last_daily_xp',
  GUIDE_READ: 'clarmind_guide_read', // date of last "read full guide" award
};

const todayStr = () => new Date().toISOString().split('T')[0];

// ---------- XP ----------

export const getXp = async (): Promise<number> => {
  const v = await AsyncStorage.getItem(KEYS.XP_TOTAL);
  return v ? parseInt(v, 10) : 0;
};

export const addXp = async (amount: number): Promise<number> => {
  const current = await getXp();
  const next = current + amount;
  await AsyncStorage.setItem(KEYS.XP_TOTAL, String(next));
  return next;
};

/** Awards daily-open XP once per day. Returns XP awarded (0 if already claimed). */
export const claimDailyOpenXp = async (): Promise<number> => {
  const last = await AsyncStorage.getItem(KEYS.LAST_DAILY_XP);
  if (last === todayStr()) return 0;
  await AsyncStorage.setItem(KEYS.LAST_DAILY_XP, todayStr());
  await addXp(XP.DAILY_OPEN);
  return XP.DAILY_OPEN;
};

/** Awards guide-read XP once per day. Returns XP awarded (0 if already claimed). */
export const claimGuideReadXp = async (): Promise<number> => {
  const last = await AsyncStorage.getItem(KEYS.GUIDE_READ);
  if (last === todayStr()) return 0;
  await AsyncStorage.setItem(KEYS.GUIDE_READ, todayStr());
  await addXp(XP.READ_GUIDE);
  return XP.READ_GUIDE;
};

// ---------- Achievements ----------

export const getUnlockedAchievements = async (): Promise<string[]> => {
  const v = await AsyncStorage.getItem(KEYS.UNLOCKED);
  return v ? JSON.parse(v) : [];
};

/**
 * Re-evaluates all achievement conditions against current stats.
 * Returns newly unlocked achievements (for celebration UI).
 */
export const checkAchievements = async (): Promise<AchievementDef[]> => {
  const [unlocked, sessions, moods, streak, xp, challenges] = await Promise.all([
    getUnlockedAchievements(),
    getMeditationSessions(),
    getMoodEntries(),
    getStreak(),
    getXp(),
    getTodayChallenges(),
  ]);

  const totalMinutes = sessions.reduce((a, s) => a + s.durationMinutes, 0);
  const patternsTried = new Set(sessions.map((s) => s.pattern));
  const { level } = getLevelForXp(xp);
  const hasNightSession = sessions.some((s) => {
    const h = new Date(s.completedAt).getHours();
    return h >= 21 || h < 5;
  });
  const allChallengesDone = challenges.length > 0 && challenges.every((c) => c.done);

  const conditions: Record<string, boolean> = {
    'first-breath': sessions.length >= 1,
    'mood-explorer': moods.length >= 1,
    'sound-bather': sessions.some((s) => s.soundscape && s.soundscape !== 'silence'),
    'night-owl': hasNightSession,
    'streak-3': streak >= 3,
    'streak-7': streak >= 7,
    'streak-30': streak >= 30,
    'streak-100': streak >= 100,
    'minutes-30': totalMinutes >= 30,
    'minutes-100': totalMinutes >= 100,
    'minutes-500': totalMinutes >= 500,
    'minutes-1000': totalMinutes >= 1000,
    'all-patterns': patternsTried.size >= BREATHING_PATTERNS.length,
    'marathon': sessions.some((s) => s.durationMinutes >= 20),
    'perfect-day': allChallengesDone,
    'level-10': level >= 10,
  };

  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => conditions[a.id] && !unlocked.includes(a.id)
  );

  if (newlyUnlocked.length > 0) {
    const updated = [...unlocked, ...newlyUnlocked.map((a) => a.id)];
    await AsyncStorage.setItem(KEYS.UNLOCKED, JSON.stringify(updated));
  }

  return newlyUnlocked;
};

// ---------- Daily challenges ----------

export interface DailyChallenge {
  id: string;
  text: string;
  emoji: string;
  done: boolean;
}

export const getTodayChallenges = async (): Promise<DailyChallenge[]> => {
  const today = todayStr();
  const defs = pickDailyChallengeDefs(today, 3);

  const raw = await AsyncStorage.getItem(KEYS.CHALLENGES);
  const stored: { date: string; done: string[] } = raw
    ? JSON.parse(raw)
    : { date: today, done: [] };
  const done = stored.date === today ? stored.done : [];

  return defs.map((d) => ({ ...d, done: done.includes(d.id) }));
};

/**
 * Marks a challenge done (if it's one of today's and not already done).
 * Returns XP awarded, including the all-3 bonus when applicable.
 */
export const completeChallenge = async (challengeId: string): Promise<number> => {
  const today = todayStr();
  const challenges = await getTodayChallenges();
  const target = challenges.find((c) => c.id === challengeId);
  if (!target || target.done) return 0;

  const doneIds = challenges.filter((c) => c.done).map((c) => c.id);
  doneIds.push(challengeId);
  await AsyncStorage.setItem(KEYS.CHALLENGES, JSON.stringify({ date: today, done: doneIds }));

  let earned = XP.CHALLENGE;
  if (doneIds.length === challenges.length) {
    earned += XP.ALL_CHALLENGES_BONUS;
  }
  await addXp(earned);
  return earned;
};

/** Auto-completes any challenges satisfied by a finished session. Returns total XP from them. */
export const applySessionToChallenges = async (
  durationMinutes: number,
  patternId: string,
  usedSoundscape: boolean
): Promise<number> => {
  const challenges = await getTodayChallenges();
  const sessions = await getMeditationSessions();
  const todaySessions = sessions.filter((s) => s.date === todayStr());
  const hour = new Date().getHours();

  let total = 0;
  for (const c of challenges) {
    if (c.done) continue;
    const satisfied =
      (c.id === 'session-5min' && durationMinutes >= 5) ||
      (c.id === 'session-10min' && durationMinutes >= 10) ||
      (c.id === 'pattern-478' && patternId === '478') ||
      (c.id === 'pattern-box' && patternId === 'box') ||
      (c.id === 'morning' && hour < 12) ||
      (c.id === 'two-sessions' && todaySessions.length >= 2) ||
      (c.id === 'soundscape' && usedSoundscape);
    if (satisfied) {
      total += await completeChallenge(c.id);
    }
  }
  return total;
};
