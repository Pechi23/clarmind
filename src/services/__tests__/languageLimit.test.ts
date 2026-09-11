import {
  checkLanguageChange,
  pruneHistory,
  MAX_CHANGES_PER_DAY,
  COOLDOWN_MS,
} from '../languageLimit';

const T0 = new Date('2026-09-11T12:00:00').getTime();

describe('checkLanguageChange', () => {
  it('allows the first change of the day', () => {
    const r = checkLanguageChange([], T0);
    expect(r.allowed).toBe(true);
    expect(r.usedToday).toBe(0);
    expect(r.remaining).toBe(MAX_CHANGES_PER_DAY);
  });

  it('allows the second change back to back (no cooldown)', () => {
    const r = checkLanguageChange([T0 - 1 * 60 * 1000], T0); // 1 change, 1 min ago
    expect(r.allowed).toBe(true);
    expect(r.usedToday).toBe(1);
  });

  it('blocks the third change while still in cooldown', () => {
    const r = checkLanguageChange([T0 - 30 * 60 * 1000, T0 - 5 * 60 * 1000], T0); // 2 today, last 5 min ago
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('cooldown');
    expect(r.waitMs).toBe(COOLDOWN_MS - 5 * 60 * 1000);
  });

  it('allows the third change once the cooldown has passed', () => {
    const r = checkLanguageChange([T0 - 40 * 60 * 1000, T0 - 20 * 60 * 1000], T0); // 2 today, last 20 min ago
    expect(r.allowed).toBe(true);
    expect(r.usedToday).toBe(2);
  });

  it('blocks after the daily maximum, even past cooldown', () => {
    const history = [
      T0 - 60 * 60 * 1000,
      T0 - 40 * 60 * 1000,
      T0 - 20 * 60 * 1000,
    ]; // 3 today, all older than cooldown
    const r = checkLanguageChange(history, T0);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('daily');
    expect(r.remaining).toBe(0);
  });

  it("doesn't count yesterday's changes toward today's cap", () => {
    const yesterday = new Date('2026-09-10T12:00:00').getTime();
    const history = [yesterday, yesterday - 1000, yesterday - 2000];
    const r = checkLanguageChange(history, T0);
    expect(r.usedToday).toBe(0);
    expect(r.allowed).toBe(true);
  });
});

describe('pruneHistory', () => {
  it('keeps only today and drops older days', () => {
    const yesterday = new Date('2026-09-10T23:59:00').getTime();
    const pruned = pruneHistory([yesterday, T0 - 1000, T0], T0);
    expect(pruned).toEqual([T0 - 1000, T0]);
  });
});
