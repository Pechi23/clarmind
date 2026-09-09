import { buildMoodTrend } from '../moodTrend';
import { MoodEntry } from '../../types';

const now = new Date(2026, 8, 14, 12, 0); // 2026-09-14
const at = (daysAgo: number, mood: number): MoodEntry => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return { date: d.toISOString(), mood, context: 'post-session' };
};

describe('buildMoodTrend', () => {
  it('returns one point per day, oldest to newest', () => {
    const t = buildMoodTrend([], 14, now);
    expect(t.points).toHaveLength(14);
    expect(t.points[13].day).toBe('2026-09-14'); // today is last
    expect(t.points[0].day).toBe('2026-09-01');
  });

  it('averages multiple entries in a day', () => {
    const t = buildMoodTrend([at(0, 2), at(0, 4)], 14, now);
    expect(t.points[13].avg).toBe(3);
    expect(t.points[13].count).toBe(2);
  });

  it('leaves days without entries null', () => {
    const t = buildMoodTrend([at(0, 5)], 14, now);
    expect(t.points[13].avg).toBe(5);
    expect(t.points[12].avg).toBeNull();
  });

  it('computes overall average over days that have data only', () => {
    const t = buildMoodTrend([at(0, 4), at(5, 2)], 14, now);
    expect(t.overallAvg).toBe(3);
  });

  it('delta is positive when mood improves over the window', () => {
    const entries = [at(10, 1), at(8, 2), at(3, 4), at(1, 5)];
    const t = buildMoodTrend(entries, 14, now);
    expect(t.delta).toBeGreaterThan(0);
  });

  it('delta is null with too few data points', () => {
    const t = buildMoodTrend([at(0, 3), at(1, 4)], 14, now);
    expect(t.delta).toBeNull();
  });

  it('ignores invalid dates and non-numeric moods', () => {
    const bad: any[] = [{ date: 'nope', mood: 3, context: 'general' }, { date: now.toISOString(), mood: 'x', context: 'general' }];
    const t = buildMoodTrend(bad as MoodEntry[], 14, now);
    expect(t.overallAvg).toBeNull();
  });
});
