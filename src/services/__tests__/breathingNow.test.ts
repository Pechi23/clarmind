import { getBreathingNow, rhythmBase } from '../breathingNow';

const at = (h: number, m = 0) => new Date(2026, 8, 5, h, m, 0, 0);

describe('rhythmBase', () => {
  it('peaks are higher than the small-hours trough', () => {
    const trough = rhythmBase(at(3, 30));
    const morning = rhythmBase(at(8));
    const evening = rhythmBase(at(22));
    expect(morning).toBeGreaterThan(trough);
    expect(evening).toBeGreaterThan(trough);
  });

  it('never drops below the base minimum', () => {
    for (let h = 0; h < 24; h++) {
      expect(rhythmBase(at(h))).toBeGreaterThanOrEqual(900);
    }
  });
});

describe('getBreathingNow', () => {
  it('is stable within the same ~4s bucket', () => {
    const a = getBreathingNow(new Date(1_000_000_000_000));
    const b = getBreathingNow(new Date(1_000_000_000_000 + 3999));
    expect(a).toBe(b);
  });

  it('can change across buckets', () => {
    const a = getBreathingNow(new Date(1_000_000_000_000));
    const b = getBreathingNow(new Date(1_000_000_000_000 + 8000));
    // Different bucket -> different jitter (overwhelmingly likely to differ).
    expect(a).not.toBe(b);
  });

  it('stays in a believable range all day', () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const n = getBreathingNow(at(h, m));
        expect(n).toBeGreaterThan(500);
        expect(n).toBeLessThan(6000);
      }
    }
  });

  it('returns a whole number', () => {
    const n = getBreathingNow(at(9));
    expect(Number.isInteger(n)).toBe(true);
  });
});
