import { computeDestinyMatrix, reduceArcana, arcanaName } from '../destinyMatrix';
import { parseDob } from '../numerology';

describe('reduceArcana', () => {
  it('keeps 1-22 as-is', () => {
    expect(reduceArcana(1)).toBe(1);
    expect(reduceArcana(22)).toBe(22);
  });
  it('wraps values above 22', () => {
    expect(reduceArcana(23)).toBe(1);
    expect(reduceArcana(34)).toBe(12);
    expect(reduceArcana(44)).toBe(22);
    expect(reduceArcana(45)).toBe(1);
  });
});

describe('computeDestinyMatrix (hand-computed 1990-12-25)', () => {
  const m = computeDestinyMatrix(parseDob('1990-12-25'));
  // A=day25->3, B=month12->12, C=year(1+9+9+0=19)->19, D=3+12+19=34->12, E=46->2
  it('matches the derived octagram values', () => {
    expect(m.day).toBe(3);
    expect(m.month).toBe(12);
    expect(m.year).toBe(19);
    expect(m.purpose).toBe(12);
    expect(m.center).toBe(2);
    expect(m.topLeft).toBe(15);    // 3+12=15
    expect(m.topRight).toBe(9);    // 12+19=31->9
    expect(m.bottomRight).toBe(9); // 19+12=31->9
    expect(m.bottomLeft).toBe(15); // 12+3=15
  });
});

describe('destiny matrix invariants', () => {
  it('every point is within 1-22 for many dates', () => {
    for (const iso of ['2000-01-01', '1987-06-15', '2024-11-29', '1955-03-31', '2001-10-10']) {
      const m = computeDestinyMatrix(parseDob(iso));
      Object.values(m).forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(22);
      });
    }
  });
});

describe('arcanaName', () => {
  it('returns localized arcana names', () => {
    expect(arcanaName(19, 'en')).toBe('The Sun');
    expect(arcanaName(19, 'ro')).toBe('Soarele');
    expect(arcanaName(22, 'ro')).toBe('Nebunul');
  });
});
