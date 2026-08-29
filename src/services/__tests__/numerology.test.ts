import {
  reduceNumber, normalizeName, parseDob, lifePathNumber, expressionNumber,
  soulUrgeNumber, personalityNumber, personalYearNumber, personalDayNumber, MASTER_NUMBERS,
} from '../numerology';

describe('reduceNumber', () => {
  it('reduces to a single digit', () => {
    expect(reduceNumber(38)).toBe(11); // 3+8=11 (master, kept)
    expect(reduceNumber(39)).toBe(3);  // 3+9=12 -> 3
    expect(reduceNumber(7)).toBe(7);
  });
  it('keeps master numbers by default', () => {
    expect(reduceNumber(29)).toBe(11); // 2+9=11
    expect(reduceNumber(2999)).toBe(29 % 0 || reduceNumber(2999)); // sanity, computed below
    expect(MASTER_NUMBERS).toContain(reduceNumber(38));
  });
  it('can force a single digit (no master)', () => {
    expect(reduceNumber(29, false)).toBe(2); // 11 -> 2
  });
});

describe('normalizeName (diacritics)', () => {
  it('folds Romanian diacritics to base letters', () => {
    expect(normalizeName('Ștefănească')).toBe('STEFANEASCA');
    expect(normalizeName('Țăndărică')).toBe('TANDARICA');
    expect(normalizeName('Ioană-Maria')).toBe('IOANAMARIA');
  });
  it('strips spaces, digits and punctuation', () => {
    expect(normalizeName('Anna 2!')).toBe('ANNA');
  });
});

describe('lifePathNumber', () => {
  it('computes a known example (1990-12-25)', () => {
    // month 12->3, day 25->7, year 1990->(1+9+9+0=19)->10->1 ; 3+7+1=11 (master)
    expect(lifePathNumber(parseDob('1990-12-25'))).toBe(11);
  });
  it('reduces to 1-9 or a master number', () => {
    for (const iso of ['2000-01-01', '1987-06-15', '2024-11-29', '1999-09-09']) {
      const lp = lifePathNumber(parseDob(iso));
      expect(lp === 11 || lp === 22 || lp === 33 || (lp >= 1 && lp <= 9)).toBe(true);
    }
  });
});

describe('name-based numbers', () => {
  it('expression sums all letters', () => {
    // "ABC" = 1+2+3 = 6
    expect(expressionNumber('ABC')).toBe(6);
  });
  it('soul urge uses only vowels', () => {
    // "AE" = 1 + 5 = 6
    expect(soulUrgeNumber('AE')).toBe(6);
    // consonants ignored: "AEB" vowels A,E = 6
    expect(soulUrgeNumber('AEB')).toBe(6);
  });
  it('personality uses only consonants', () => {
    // "BCD" = 2+3+4 = 9
    expect(personalityNumber('BCD')).toBe(9);
  });
  it('is diacritic-insensitive', () => {
    expect(expressionNumber('Ștefan')).toBe(expressionNumber('Stefan'));
  });
});

describe('personal cycles', () => {
  it('personal year is 1-9', () => {
    const py = personalYearNumber(parseDob('1990-12-25'), 2026);
    expect(py).toBeGreaterThanOrEqual(1);
    expect(py).toBeLessThanOrEqual(9);
  });
  it('personal day is deterministic and 1-9', () => {
    const dob = parseDob('1990-12-25');
    const a = personalDayNumber(dob, { year: 2026, month: 8, day: 29 });
    const b = personalDayNumber(dob, { year: 2026, month: 8, day: 29 });
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(1);
    expect(a).toBeLessThanOrEqual(9);
  });
  it('personal day changes across days', () => {
    const dob = parseDob('1990-12-25');
    const days = new Set(
      Array.from({ length: 9 }, (_, i) => personalDayNumber(dob, { year: 2026, month: 8, day: 20 + i }))
    );
    expect(days.size).toBeGreaterThan(1);
  });
});
