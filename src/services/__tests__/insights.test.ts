import { timeOfDay, activitySummary, fallbackInsightKey } from '../insights';
import { MeditationSession, MoodEntry } from '../../types';

const now = new Date(2026, 8, 14, 12, 0);
const iso = (daysBack: number, hour: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const sess = (daysBack: number, hour: number, min = 5): MeditationSession => ({
  date: iso(daysBack, hour).slice(0, 10),
  durationMinutes: min,
  pattern: 'box' as any,
  completedAt: iso(daysBack, hour),
});
const mood = (daysBack: number, m: number): MoodEntry => ({ date: iso(daysBack, 12), mood: m, context: 'post-session' });

describe('timeOfDay', () => {
  it('buckets hours', () => {
    expect(timeOfDay(iso(0, 8))).toBe('morning');
    expect(timeOfDay(iso(0, 14))).toBe('afternoon');
    expect(timeOfDay(iso(0, 20))).toBe('evening');
    expect(timeOfDay(iso(0, 2))).toBe('night');
    expect(timeOfDay('bad')).toBeNull();
  });
});

describe('activitySummary', () => {
  it('counts sessions, this-week, minutes and top time of day', () => {
    const s = activitySummary(
      [sess(0, 20, 10), sess(1, 20, 5), sess(10, 8, 5)],
      [mood(0, 4), mood(1, 5)],
      now
    );
    expect(s.totalSessions).toBe(3);
    expect(s.weekSessions).toBe(2); // the 10-days-ago one is outside the week
    expect(s.totalMinutes).toBe(20);
    expect(s.topTimeOfDay).toBe('evening'); // two evening vs one morning
    expect(s.avgMood).toBe(4.5);
  });

  it('handles no data', () => {
    const s = activitySummary([], [], now);
    expect(s.totalSessions).toBe(0);
    expect(s.topTimeOfDay).toBeNull();
    expect(s.avgMood).toBeNull();
    expect(s.text).toContain('Total sessions 0');
  });
});

describe('fallbackInsightKey', () => {
  const base = activitySummary([], [], now);
  it('start when no sessions', () => {
    expect(fallbackInsightKey(base)).toBe('insights.fbStart');
  });
  it('consistent with 3+ this week', () => {
    const s = activitySummary([sess(0, 8), sess(1, 8), sess(2, 8)], [], now);
    expect(fallbackInsightKey(s)).toBe('insights.fbConsistent');
  });
  it('calm when avg mood high', () => {
    const s = activitySummary([sess(9, 8)], [mood(9, 5)], now);
    expect(fallbackInsightKey(s)).toBe('insights.fbCalm');
  });
});
