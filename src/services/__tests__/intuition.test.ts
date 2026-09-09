import { INTUITION_SYMBOLS, pickTarget, accuracyPct, feedbackKey } from '../intuition';

describe('pickTarget', () => {
  it('stays within [0, n)', () => {
    for (let i = 0; i < 200; i++) {
      const t = pickTarget(4);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(4);
    }
  });
  it('is deterministic with an injected rng', () => {
    expect(pickTarget(4, () => 0)).toBe(0);
    expect(pickTarget(4, () => 0.99)).toBe(3);
    expect(pickTarget(4, () => 0.5)).toBe(2);
  });
});

describe('accuracyPct', () => {
  it('rounds to whole percent, 0 when nothing played', () => {
    expect(accuracyPct(0, 0)).toBe(0);
    expect(accuracyPct(1, 4)).toBe(25);
    expect(accuracyPct(1, 3)).toBe(33);
    expect(accuracyPct(3, 3)).toBe(100);
  });
});

describe('feedbackKey', () => {
  it('maps hit/miss to i18n keys', () => {
    expect(feedbackKey(true)).toBe('intuition.hit');
    expect(feedbackKey(false)).toBe('intuition.miss');
  });
});

describe('INTUITION_SYMBOLS', () => {
  it('has several distinct symbols', () => {
    expect(INTUITION_SYMBOLS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(INTUITION_SYMBOLS).size).toBe(INTUITION_SYMBOLS.length);
  });
});
