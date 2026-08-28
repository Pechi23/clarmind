import { getSeasonalEvent, isFullMoon, daysToFullMoon } from '../seasonalEvents';

const localDate = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

describe('getSeasonalEvent — fixed calendar days', () => {
  it('returns New Year on Jan 1', () => {
    expect(getSeasonalEvent(localDate(2026, 1, 1))?.id).toBe('newYear');
  });
  it("returns New Year's Eve on Dec 31", () => {
    expect(getSeasonalEvent(localDate(2026, 12, 31))?.id).toBe('newYearEve');
  });
  it('returns winter solstice on Dec 21', () => {
    expect(getSeasonalEvent(localDate(2026, 12, 21))?.id).toBe('winterSolstice');
  });
  it('returns summer solstice on Jun 21', () => {
    expect(getSeasonalEvent(localDate(2026, 6, 21))?.id).toBe('summerSolstice');
  });
  it('returns equinoxes on their days', () => {
    expect(getSeasonalEvent(localDate(2026, 3, 20))?.id).toBe('springEquinox');
    expect(getSeasonalEvent(localDate(2026, 9, 22))?.id).toBe('autumnEquinox');
  });
  it('exposes an emoji and i18n key paths', () => {
    const e = getSeasonalEvent(localDate(2026, 1, 1))!;
    expect(e.emoji).toBe('✨');
    expect(e.titleKey).toBe('seasonal.newYear.title');
    expect(e.messageKey).toBe('seasonal.newYear.message');
  });
});

describe('lunar calculation', () => {
  // Real 2026 full moons (UTC noon avoids TZ edge flips).
  const realFullMoons = ['2026-01-03', '2026-02-01', '2026-03-03', '2026-05-01', '2026-08-28'];
  it('flags real full moons', () => {
    for (const s of realFullMoons) {
      expect(isFullMoon(new Date(s + 'T12:00:00Z'))).toBe(true);
    }
  });
  it('rejects a near-new-moon date', () => {
    expect(isFullMoon(new Date('2026-06-15T12:00:00Z'))).toBe(false);
  });
  it('daysToFullMoon is always within half a synodic month', () => {
    for (let i = 0; i < 60; i++) {
      const dt = new Date('2026-01-01T00:00:00Z');
      dt.setDate(dt.getDate() + i);
      expect(daysToFullMoon(dt)).toBeLessThanOrEqual(14.77);
      expect(daysToFullMoon(dt)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getSeasonalEvent — ordinary day', () => {
  it('returns null on a plain non-full-moon day', () => {
    expect(getSeasonalEvent(new Date('2026-06-15T12:00:00Z'))).toBeNull();
  });
});
