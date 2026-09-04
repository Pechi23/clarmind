import { getCosmicEnergy, dateSeed, FACET_ORDER, dominantFacet, guidanceKey } from '../cosmicEnergy';

const day = new Date(2026, 8, 5); // 2026-09-05

describe('getCosmicEnergy', () => {
  it('is deterministic for the same sign and date', () => {
    const a = getCosmicEnergy('Leo', day);
    const b = getCosmicEnergy('Leo', day);
    expect(a).toEqual(b);
  });

  it('varies by sign', () => {
    const leo = getCosmicEnergy('Leo', day);
    const aries = getCosmicEnergy('Aries', day);
    // Overwhelmingly likely to differ across the full reading.
    expect(JSON.stringify(leo)).not.toBe(JSON.stringify(aries));
  });

  it('varies by day', () => {
    const d1 = getCosmicEnergy('Leo', new Date(2026, 8, 5));
    const d2 = getCosmicEnergy('Leo', new Date(2026, 8, 6));
    expect(JSON.stringify(d1)).not.toBe(JSON.stringify(d2));
  });

  it('keeps every score within 1..10', () => {
    // Sweep many signs/days to exercise the range.
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    for (const s of signs) {
      for (let d = 1; d <= 28; d++) {
        const e = getCosmicEnergy(s, new Date(2026, 5, d));
        expect(e.overall).toBeGreaterThanOrEqual(1);
        expect(e.overall).toBeLessThanOrEqual(10);
        expect(e.facets).toHaveLength(3);
        for (const f of e.facets) {
          expect(f.score).toBeGreaterThanOrEqual(1);
          expect(f.score).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('returns facets in the canonical order', () => {
    const e = getCosmicEnergy('Virgo', day);
    expect(e.facets.map((f) => f.key)).toEqual(FACET_ORDER);
  });

  it('overall matches the rounded mean of the facets', () => {
    const e = getCosmicEnergy('Scorpio', day);
    const mean = (e.facets[0].score + e.facets[1].score + e.facets[2].score) / 3;
    expect(e.overall).toBe(Math.max(1, Math.min(10, Math.round(mean))));
  });

  it('assigns the tier consistently with the overall score', () => {
    const e = getCosmicEnergy('Pisces', day);
    const expected =
      e.overall >= 9 ? 'peak' : e.overall >= 7 ? 'high' : e.overall >= 4 ? 'moderate' : 'low';
    expect(e.tier).toBe(expected);
  });

  it('falls back gracefully for an unknown sign', () => {
    const e = getCosmicEnergy('NotASign', day);
    expect(e.overall).toBeGreaterThanOrEqual(1);
    expect(e.overall).toBeLessThanOrEqual(10);
  });
});

describe('dominantFacet', () => {
  it('returns the highest-scoring facet key', () => {
    const e = getCosmicEnergy('Leo', day);
    const top = e.facets.reduce((a, b) => (b.score > a.score ? b : a));
    expect(dominantFacet(e)).toBe(top.key);
  });
});

describe('guidanceKey', () => {
  it('points at the dominant facet with a 0/1 variant', () => {
    const e = getCosmicEnergy('Leo', day);
    const key = guidanceKey(e, 'Leo', day);
    expect(key).toMatch(/^cosmic\.guide\.(vitality|clarity|harmony)\.[01]$/);
    expect(key).toContain(`.${dominantFacet(e)}.`);
  });
  it('is deterministic for the same sign and date', () => {
    const e = getCosmicEnergy('Virgo', day);
    expect(guidanceKey(e, 'Virgo', day)).toBe(guidanceKey(e, 'Virgo', day));
  });
});

describe('dateSeed', () => {
  it('encodes the date as YYYYMMDD', () => {
    expect(dateSeed(new Date(2026, 8, 5))).toBe(20260905);
  });
  it('changes from one day to the next', () => {
    expect(dateSeed(new Date(2026, 8, 5))).not.toBe(dateSeed(new Date(2026, 8, 6)));
  });
});
