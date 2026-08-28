import {
  daysBetweenDates, unlockedDay, isDayUnlocked, isCourseComplete, COURSE_LENGTH,
} from '../courseLogic';

describe('daysBetweenDates', () => {
  it('counts whole days', () => {
    expect(daysBetweenDates('2026-08-24', '2026-08-24')).toBe(0);
    expect(daysBetweenDates('2026-08-24', '2026-08-25')).toBe(1);
    expect(daysBetweenDates('2026-08-24', '2026-08-31')).toBe(7);
  });
  it('handles month boundaries', () => {
    expect(daysBetweenDates('2026-08-31', '2026-09-01')).toBe(1);
  });
});

describe('unlockedDay', () => {
  it('day 1 on the start date', () => {
    expect(unlockedDay('2026-08-24', '2026-08-24')).toBe(1);
  });
  it('advances one day per calendar day', () => {
    expect(unlockedDay('2026-08-24', '2026-08-25')).toBe(2);
    expect(unlockedDay('2026-08-24', '2026-08-27')).toBe(4);
  });
  it('caps at the course length', () => {
    expect(unlockedDay('2026-08-24', '2026-09-30')).toBe(COURSE_LENGTH);
  });
  it('never returns less than 1', () => {
    expect(unlockedDay('2026-08-24', '2026-08-24')).toBeGreaterThanOrEqual(1);
  });
});

describe('isDayUnlocked', () => {
  it('locks days beyond the unlocked point', () => {
    expect(isDayUnlocked(3, '2026-08-24', '2026-08-25')).toBe(false); // only day 2 unlocked
    expect(isDayUnlocked(2, '2026-08-24', '2026-08-25')).toBe(true);
  });
});

describe('isCourseComplete', () => {
  it('needs all 7 days', () => {
    expect(isCourseComplete([1, 2, 3, 4, 5, 6])).toBe(false);
    expect(isCourseComplete([1, 2, 3, 4, 5, 6, 7])).toBe(true);
  });
  it('ignores out-of-range and duplicate days', () => {
    expect(isCourseComplete([1, 2, 3, 4, 5, 6, 7, 7, 99])).toBe(true);
    expect(isCourseComplete([0, 8, 9])).toBe(false);
  });
});
