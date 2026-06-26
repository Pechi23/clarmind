import { getRuns, countConstellations } from '../skyLogic';
import { MeditationSession } from '../../types';

const session = (date: string): MeditationSession => ({
  date,
  durationMinutes: 5,
  pattern: 'box',
  completedAt: `${date}T10:00:00.000Z`,
});

describe('getRuns', () => {
  it('returns no runs for no sessions', () => {
    expect(getRuns([])).toEqual([]);
  });

  it('treats consecutive days as one run', () => {
    const runs = getRuns([session('2026-06-24'), session('2026-06-25'), session('2026-06-26')]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toHaveLength(3);
  });

  it('splits non-consecutive days into separate runs', () => {
    const runs = getRuns([session('2026-06-24'), session('2026-06-26')]);
    expect(runs).toHaveLength(2);
  });

  it('collapses multiple sessions on the same day into one entry', () => {
    const runs = getRuns([session('2026-06-26'), session('2026-06-26'), session('2026-06-26')]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toHaveLength(1);
  });

  it('sorts unsorted input before grouping', () => {
    const runs = getRuns([session('2026-06-26'), session('2026-06-24'), session('2026-06-25')]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual(['2026-06-24', '2026-06-25', '2026-06-26']);
  });
});

describe('countConstellations', () => {
  it('is 0 below 7 consecutive days', () => {
    const days = Array.from({ length: 6 }, (_, i) => session(`2026-06-${String(20 + i).padStart(2, '0')}`));
    expect(countConstellations(days)).toBe(0);
  });

  it('forms exactly 1 at 7 consecutive days', () => {
    const days = Array.from({ length: 7 }, (_, i) => session(`2026-06-${String(20 + i).padStart(2, '0')}`));
    expect(countConstellations(days)).toBe(1);
  });

  it('forms 2 at 14 consecutive days', () => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date('2026-06-01T00:00:00');
      d.setDate(d.getDate() + i);
      return session(d.toISOString().split('T')[0]);
    });
    expect(countConstellations(days)).toBe(2);
  });

  it('does not count across a broken streak', () => {
    // two separate 4-day runs = 8 sessions but 0 constellations
    const runA = Array.from({ length: 4 }, (_, i) => session(`2026-06-0${1 + i}`));
    const runB = Array.from({ length: 4 }, (_, i) => session(`2026-06-1${i}`));
    expect(countConstellations([...runA, ...runB])).toBe(0);
  });
});
