import { MeditationSession, MoodEntry } from '../types';

export interface WeekStats {
  sessions: number;
  minutes: number;
  activeDays: number;
  avgMood: number | null; // 1-5, one decimal, null if no check-ins
}

export interface WeeklyRecap {
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  minutesDelta: number;
  sessionsDelta: number;
  moodDelta: number | null; // null if either week has no mood data
}

const dayOffset = (dateStr: string, nowMs: number): number => {
  const d = new Date(dateStr + 'T00:00:00').getTime();
  const today = new Date(new Date(nowMs).toISOString().split('T')[0] + 'T00:00:00').getTime();
  return Math.round((today - d) / 86400000);
};

const avg = (nums: number[]): number | null =>
  nums.length === 0 ? null : Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;

/**
 * Splits sessions/moods into two rolling 7-day windows ending today:
 * "this week" = offsets 0..6, "last week" = offsets 7..13.
 * `nowIso` is injectable for deterministic tests.
 */
export const computeWeeklyRecap = (
  sessions: MeditationSession[],
  moods: MoodEntry[],
  nowIso: string = new Date().toISOString()
): WeeklyRecap => {
  const nowMs = new Date(nowIso).getTime();

  const bucketStats = (lo: number, hi: number): WeekStats => {
    const inWindow = sessions.filter((s) => {
      const off = dayOffset(s.date, nowMs);
      return off >= lo && off <= hi;
    });
    const moodVals = moods
      .filter((m) => {
        const off = dayOffset(m.date.split('T')[0], nowMs);
        return off >= lo && off <= hi;
      })
      .map((m) => m.mood);
    return {
      sessions: inWindow.length,
      minutes: inWindow.reduce((a, s) => a + s.durationMinutes, 0),
      activeDays: new Set(inWindow.map((s) => s.date)).size,
      avgMood: avg(moodVals),
    };
  };

  const thisWeek = bucketStats(0, 6);
  const lastWeek = bucketStats(7, 13);

  return {
    thisWeek,
    lastWeek,
    minutesDelta: thisWeek.minutes - lastWeek.minutes,
    sessionsDelta: thisWeek.sessions - lastWeek.sessions,
    moodDelta:
      thisWeek.avgMood !== null && lastWeek.avgMood !== null
        ? Math.round((thisWeek.avgMood - lastWeek.avgMood) * 10) / 10
        : null,
  };
};

/**
 * Monday (YYYY-MM-DD) of the week containing the given date — used as a
 * once-per-week key. Works entirely in UTC so it never drifts a day across
 * timezones (local-time construction + toISOString formatting is the classic
 * off-by-one trap).
 */
export const getMondayKey = (dateInput: string | Date = new Date()): string => {
  const base =
    typeof dateInput === 'string'
      ? new Date(dateInput + 'T00:00:00Z')
      : new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  const day = (base.getUTCDay() + 6) % 7; // 0 = Monday
  base.setUTCDate(base.getUTCDate() - day);
  return base.toISOString().split('T')[0];
};

/** Offline-safe reflection sentence derived purely from the numbers. */
export const buildFallbackReflection = (recap: WeeklyRecap): string => {
  const { thisWeek, minutesDelta } = recap;
  if (thisWeek.sessions === 0) {
    return 'A fresh week is a blank sky — light your first star today. ✨';
  }
  if (minutesDelta > 0) {
    return `You meditated ${minutesDelta} more minute${minutesDelta !== 1 ? 's' : ''} than last week. Your calm is compounding. 🌙`;
  }
  if (minutesDelta < 0) {
    return 'Gentle weeks matter too. Every breath you took still counts. 🌿';
  }
  return `${thisWeek.sessions} session${thisWeek.sessions !== 1 ? 's' : ''} of stillness this week. Steady and grounded. 🧘`;
};
