import { getMoonPhase } from '../moonPhase';

const SYNODIC = 29.530588853;
const KNOWN_FULL = Date.UTC(2000, 0, 21, 4, 40);

describe('getMoonPhase', () => {
  it('reports full at the reference full moon', () => {
    const m = getMoonPhase(new Date(KNOWN_FULL));
    expect(m.phase).toBe('full');
    expect(m.illumination).toBeGreaterThan(0.99);
  });

  it('reports new ~half a cycle from full', () => {
    const newMoon = new Date(KNOWN_FULL - (SYNODIC / 2) * 86400000);
    const m = getMoonPhase(newMoon);
    expect(m.phase).toBe('new');
    expect(m.illumination).toBeLessThan(0.01);
  });

  it('reports a quarter ~a quarter-cycle from full', () => {
    const q = new Date(KNOWN_FULL - (SYNODIC / 4) * 86400000);
    const m = getMoonPhase(q);
    // A quarter before full is First Quarter (waxing).
    expect(m.phase).toBe('firstQuarter');
    expect(m.illumination).toBeGreaterThan(0.45);
    expect(m.illumination).toBeLessThan(0.55);
  });

  it('keeps illumination within [0,1] and age within [0, SYNODIC)', () => {
    for (let d = 0; d < 30; d += 0.37) {
      const m = getMoonPhase(new Date(KNOWN_FULL + d * 86400000));
      expect(m.illumination).toBeGreaterThanOrEqual(0);
      expect(m.illumination).toBeLessThanOrEqual(1);
      expect(m.age).toBeGreaterThanOrEqual(0);
      expect(m.age).toBeLessThan(SYNODIC);
    }
  });

  it('cycles back to full after one synodic month', () => {
    const nextFull = new Date(KNOWN_FULL + SYNODIC * 86400000);
    expect(getMoonPhase(nextFull).phase).toBe('full');
  });

  it('is deterministic for a given instant', () => {
    const t = new Date(2026, 8, 5, 21, 0);
    expect(getMoonPhase(t)).toEqual(getMoonPhase(t));
  });

  it('waxes then wanes across a cycle', () => {
    const waxing = getMoonPhase(new Date(KNOWN_FULL - 3 * 86400000)); // before full
    const waning = getMoonPhase(new Date(KNOWN_FULL + 3 * 86400000)); // after full
    expect(['waxingGibbous', 'waxingCrescent', 'firstQuarter']).toContain(waxing.phase);
    expect(['waningGibbous', 'waningCrescent', 'lastQuarter']).toContain(waning.phase);
  });
});
