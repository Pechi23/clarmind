import {
  computeWeeklyRecap, getMondayKey, buildFallbackReflection,
} from '../weeklyRecapLogic';
import { MeditationSession, MoodEntry } from '../../types';

const NOW = '2026-06-27T12:00:00.000Z'; // a Saturday

const session = (date: string, minutes = 5): MeditationSession => ({
  date,
  durationMinutes: minutes,
  pattern: 'box',
  completedAt: `${date}T10:00:00.000Z`,
});

const mood = (date: string, value: number): MoodEntry => ({
  date: `${date}T10:00:00.000Z`,
  mood: value,
  context: 'post-session',
});

describe('computeWeeklyRecap', () => {
  it('returns zeroed stats with no data', () => {
    const r = computeWeeklyRecap([], [], NOW);
    expect(r.thisWeek.sessions).toBe(0);
    expect(r.thisWeek.minutes).toBe(0);
    expect(r.thisWeek.avgMood).toBeNull();
    expect(r.moodDelta).toBeNull();
  });

  it('buckets sessions into the correct 7-day window', () => {
    const r = computeWeeklyRecap(
      [
        session('2026-06-27', 10), // today, this week
        session('2026-06-23', 5),  // this week
        session('2026-06-20', 8),  // last week (7 days ago)
        session('2026-06-14', 3),  // 13 days ago, last week
        session('2026-06-13', 99), // 14 days ago, OUT of both windows
      ],
      [],
      NOW
    );
    expect(r.thisWeek.sessions).toBe(2);
    expect(r.thisWeek.minutes).toBe(15);
    expect(r.lastWeek.sessions).toBe(2);
    expect(r.lastWeek.minutes).toBe(11);
  });

  it('computes minutes and sessions deltas', () => {
    const r = computeWeeklyRecap(
      [session('2026-06-27', 20), session('2026-06-20', 5)],
      [],
      NOW
    );
    expect(r.minutesDelta).toBe(15);
    expect(r.sessionsDelta).toBe(0);
  });

  it('counts active days, collapsing multiple same-day sessions', () => {
    const r = computeWeeklyRecap(
      [session('2026-06-27'), session('2026-06-27'), session('2026-06-26')],
      [],
      NOW
    );
    expect(r.thisWeek.sessions).toBe(3);
    expect(r.thisWeek.activeDays).toBe(2);
  });

  it('averages mood within a window and rounds to one decimal', () => {
    const r = computeWeeklyRecap(
      [],
      [mood('2026-06-27', 5), mood('2026-06-26', 4), mood('2026-06-25', 4)],
      NOW
    );
    expect(r.thisWeek.avgMood).toBeCloseTo(4.3, 1);
  });

  it('computes mood delta only when both weeks have data', () => {
    const withBoth = computeWeeklyRecap(
      [],
      [mood('2026-06-27', 5), mood('2026-06-20', 3)],
      NOW
    );
    expect(withBoth.moodDelta).toBeCloseTo(2, 1);

    const onlyThis = computeWeeklyRecap([], [mood('2026-06-27', 5)], NOW);
    expect(onlyThis.moodDelta).toBeNull();
  });
});

describe('getMondayKey', () => {
  it('maps any day to that week Monday', () => {
    expect(getMondayKey('2026-06-27')).toBe('2026-06-22'); // Sat -> Mon
    expect(getMondayKey('2026-06-22')).toBe('2026-06-22'); // Mon -> itself
    expect(getMondayKey('2026-06-28')).toBe('2026-06-22'); // Sun -> prior Mon
  });

  it('changes across a week boundary', () => {
    expect(getMondayKey('2026-06-29')).toBe('2026-06-29'); // next Monday
    expect(getMondayKey('2026-06-29')).not.toBe(getMondayKey('2026-06-28'));
  });
});

describe('buildFallbackReflection', () => {
  it('nudges when there were no sessions', () => {
    const r = computeWeeklyRecap([], [], NOW);
    expect(buildFallbackReflection(r)).toMatch(/first star/i);
  });

  it('celebrates an increase in minutes', () => {
    const r = computeWeeklyRecap([session('2026-06-27', 20)], [], NOW);
    expect(buildFallbackReflection(r)).toMatch(/more minute/i);
  });

  it('is gentle on a decrease', () => {
    const r = computeWeeklyRecap(
      [session('2026-06-27', 2), session('2026-06-20', 30)],
      [],
      NOW
    );
    expect(buildFallbackReflection(r)).toMatch(/gentle weeks/i);
  });
});
