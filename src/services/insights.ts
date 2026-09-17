// AI pattern insights — the "discover your mental patterns" idea. Summarizes the
// user's sessions + moods, then asks Gemini for 1–2 warm observations about their
// patterns. Cached once per ISO week (like the recap) so it doesn't burn quota on
// every Profile open. Pure summary/fallback logic is unit-tested.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeditationSession, MoodEntry } from '../types';
import { Language, languageName } from '../i18n/languages';
import { callGemini, hasAi } from './ai';
import { getMeditationSessions, getMoodEntries } from './storage';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export const timeOfDay = (iso: string): TimeOfDay | null => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const h = d.getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  if (h < 22) return 'evening';
  return 'night';
};

export interface ActivitySummary {
  totalSessions: number;
  weekSessions: number;
  totalMinutes: number;
  avgMood: number | null;
  weekAvgMood: number | null;
  topTimeOfDay: TimeOfDay | null;
  text: string; // compact English summary fed to the prompt
}

const daysAgo = (iso: string, now: Date): number => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? Infinity : (now.getTime() - d.getTime()) / 86400000;
};
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

/** Roll sessions + moods into a compact summary (pure). */
export const activitySummary = (
  sessions: MeditationSession[],
  moods: MoodEntry[],
  now: Date = new Date()
): ActivitySummary => {
  const weekSessions = sessions.filter((s) => daysAgo(s.date, now) <= 7).length;
  const totalMinutes = sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);

  const todCounts: Record<TimeOfDay, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const s of sessions) {
    const tod = timeOfDay(s.completedAt);
    if (tod) todCounts[tod]++;
  }
  const topTimeOfDay = sessions.length
    ? (Object.entries(todCounts).sort((a, b) => b[1] - a[1])[0][0] as TimeOfDay)
    : null;

  const moodVals = moods.map((m) => m.mood).filter((n) => typeof n === 'number');
  const weekMoodVals = moods.filter((m) => daysAgo(m.date, now) <= 7).map((m) => m.mood);
  const avgMood = mean(moodVals);
  const weekAvgMood = mean(weekMoodVals);

  const r1 = (n: number | null) => (n == null ? 'n/a' : n.toFixed(1));
  const text =
    `Total sessions ${sessions.length} (${weekSessions} this week), ${totalMinutes} minutes. ` +
    `Mood avg ${r1(avgMood)}/5 (this week ${r1(weekAvgMood)}). ` +
    `Most sessions in the ${topTimeOfDay ?? 'n/a'}.`;

  return { totalSessions: sessions.length, weekSessions, totalMinutes, avgMood, weekAvgMood, topTimeOfDay, text };
};

/** i18n key for a gentle generic insight when AI is unavailable (pure). */
export const fallbackInsightKey = (s: ActivitySummary): string => {
  if (s.totalSessions === 0) return 'insights.fbStart';
  if (s.weekSessions >= 3) return 'insights.fbConsistent';
  if (s.avgMood != null && s.avgMood >= 4) return 'insights.fbCalm';
  return 'insights.fbKeep';
};

const mondayKey = (now: Date): string => {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const CACHE_KEY = 'clarmind_insight';
export type InsightResult = { text: string } | { key: string };

/**
 * The week's insight: cached AI observation if already generated this ISO week,
 * else a fresh Gemini call, else a gentle generic fallback key. Always resolves.
 */
export const getWeeklyInsight = async (language: Language = 'en'): Promise<InsightResult> => {
  const now = new Date();
  const week = mondayKey(now);
  const [sessions, moods] = await Promise.all([getMeditationSessions(), getMoodEntries()]);
  const summary = activitySummary(sessions, moods, now);

  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.week === week && typeof cached.text === 'string') return { text: cached.text };
    }
  } catch {}

  if (summary.totalSessions === 0 || !hasAi()) return { key: fallbackInsightKey(summary) };

  try {
    const prompt =
      `You are Stillnova, a warm mindfulness companion. Based on this user's data, write 1–2 warm, ` +
      `specific observations about their patterns (when they seem calmest, what's working, a gentle nudge). ` +
      `Max 35 words, second person, no numbers, no lists, in ${languageName(language)}. Data: ${summary.text}`;
    const text = (await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    })).trim();
    if (text) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ week, text })).catch(() => {});
      return { text };
    }
  } catch {}

  return { key: fallbackInsightKey(summary) };
};
