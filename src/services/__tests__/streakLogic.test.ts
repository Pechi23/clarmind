import { computeStreakUpdate, daysBetween } from '../streakLogic';

describe('daysBetween', () => {
  it('counts consecutive days as 1', () => {
    expect(daysBetween('2026-06-25', '2026-06-26')).toBe(1);
  });
  it('counts a skipped day as 2', () => {
    expect(daysBetween('2026-06-24', '2026-06-26')).toBe(2);
  });
  it('handles month boundaries', () => {
    expect(daysBetween('2026-05-31', '2026-06-01')).toBe(1);
  });
  it('handles year boundaries', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('computeStreakUpdate', () => {
  it('first ever open starts streak at 1', () => {
    const r = computeStreakUpdate({ prevStreak: 0, prevShields: 0, lastOpen: null, today: '2026-06-26' });
    expect(r.streak).toBe(1);
    expect(r.shields).toBe(0);
  });

  it('same-day reopen does not change anything', () => {
    const r = computeStreakUpdate({ prevStreak: 5, prevShields: 1, lastOpen: '2026-06-26', today: '2026-06-26' });
    expect(r.streak).toBe(5);
    expect(r.shields).toBe(1);
    expect(r.shieldUsed).toBe(false);
    expect(r.shieldEarned).toBe(false);
  });

  it('consecutive day increments the streak', () => {
    const r = computeStreakUpdate({ prevStreak: 3, prevShields: 0, lastOpen: '2026-06-25', today: '2026-06-26' });
    expect(r.streak).toBe(4);
  });

  it('one missed day with a shield consumes it and keeps the streak alive', () => {
    const r = computeStreakUpdate({ prevStreak: 10, prevShields: 1, lastOpen: '2026-06-24', today: '2026-06-26' });
    expect(r.streak).toBe(11);
    expect(r.shields).toBe(0);
    expect(r.shieldUsed).toBe(true);
  });

  it('one missed day with NO shield resets the streak', () => {
    const r = computeStreakUpdate({ prevStreak: 10, prevShields: 0, lastOpen: '2026-06-24', today: '2026-06-26' });
    expect(r.streak).toBe(1);
    expect(r.shieldUsed).toBe(false);
  });

  it('two or more missed days always resets, even with shields', () => {
    const r = computeStreakUpdate({ prevStreak: 20, prevShields: 2, lastOpen: '2026-06-22', today: '2026-06-26' });
    expect(r.streak).toBe(1);
    expect(r.shields).toBe(2); // shields untouched
    expect(r.shieldUsed).toBe(false);
  });

  it('earns a shield exactly at the 7-day milestone', () => {
    const r = computeStreakUpdate({ prevStreak: 6, prevShields: 0, lastOpen: '2026-06-25', today: '2026-06-26' });
    expect(r.streak).toBe(7);
    expect(r.shields).toBe(1);
    expect(r.shieldEarned).toBe(true);
  });

  it('caps shields at the max (does not earn a 3rd)', () => {
    const r = computeStreakUpdate({ prevStreak: 13, prevShields: 2, lastOpen: '2026-06-25', today: '2026-06-26' });
    expect(r.streak).toBe(14); // 14 % 7 === 0
    expect(r.shields).toBe(2);
    expect(r.shieldEarned).toBe(false);
  });

  it('does not earn a shield on a non-multiple-of-7 day', () => {
    const r = computeStreakUpdate({ prevStreak: 7, prevShields: 1, lastOpen: '2026-06-25', today: '2026-06-26' });
    expect(r.streak).toBe(8);
    expect(r.shieldEarned).toBe(false);
  });

  it('a shield-saved day can itself land on a 7-milestone and earn a shield', () => {
    // prev 6, skip one day, shield saves -> streak 7 -> earns a shield back
    const r = computeStreakUpdate({ prevStreak: 6, prevShields: 1, lastOpen: '2026-06-24', today: '2026-06-26' });
    expect(r.streak).toBe(7);
    expect(r.shieldUsed).toBe(true);
    expect(r.shieldEarned).toBe(true);
    expect(r.shields).toBe(1); // -1 used, +1 earned
  });
});
