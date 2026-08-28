import { pickReflectionKey, isEvening, REFLECTION_KEYS } from '../reflectionLogic';

describe('isEvening', () => {
  it('is true at and after 20:00', () => {
    expect(isEvening(20)).toBe(true);
    expect(isEvening(23)).toBe(true);
  });
  it('is true after midnight until 4am', () => {
    expect(isEvening(1)).toBe(true);
    expect(isEvening(3)).toBe(true);
  });
  it('is false during the day', () => {
    expect(isEvening(9)).toBe(false);
    expect(isEvening(19)).toBe(false);
    expect(isEvening(4)).toBe(false);
  });
});

describe('pickReflectionKey', () => {
  it('is deterministic per date', () => {
    expect(pickReflectionKey('2026-08-24')).toBe(pickReflectionKey('2026-08-24'));
  });
  it('always returns a key from the pool', () => {
    for (let d = 1; d <= 28; d++) {
      const key = pickReflectionKey(`2026-08-${String(d).padStart(2, '0')}`);
      expect(REFLECTION_KEYS).toContain(key);
    }
  });
  it('varies across a month', () => {
    const keys = new Set(
      Array.from({ length: 28 }, (_, i) => pickReflectionKey(`2026-08-${String(i + 1).padStart(2, '0')}`))
    );
    expect(keys.size).toBeGreaterThan(1);
  });
});
