/**
 * Numerology engine (pure, testable). Pythagorean system.
 *
 * References / method (documented for maintainers):
 * - Life Path (Drumul Vieții / "cifra destinului"): reduce the day, month and
 *   year to single digits (keeping master numbers 11/22/33), sum them, reduce
 *   again keeping master numbers.
 * - Expression / Destiny (from the full name): Pythagorean letter→number map,
 *   sum all letters, reduce (keep master).
 * - Soul Urge (vowels) and Personality (consonants): same map, subset of letters.
 * - Personal Year/Month/Day (the daily cycle): birth day+month combined with the
 *   current date; always reduced to a single digit 1–9 (no master numbers).
 *
 * Numerology is offered for reflection and entertainment only.
 */

export const MASTER_NUMBERS = [11, 22, 33];

const sumDigits = (n: number): number =>
  String(Math.abs(n)).split('').reduce((a, c) => a + Number(c), 0);

/** Reduce to a single digit. When keepMaster, stop at 11/22/33. */
export const reduceNumber = (n: number, keepMaster = true): number => {
  let x = Math.abs(n);
  while (x > 9 && !(keepMaster && MASTER_NUMBERS.includes(x))) {
    x = sumDigits(x);
  }
  return x;
};

// Pythagorean letter values A=1..I=9, J=1..R=9, S=1..Z=8.
const LETTER_VALUES: Record<string, number> = {};
'ABCDEFGHI'.split('').forEach((c, i) => (LETTER_VALUES[c] = i + 1));
'JKLMNOPQR'.split('').forEach((c, i) => (LETTER_VALUES[c] = i + 1));
'STUVWXYZ'.split('').forEach((c, i) => (LETTER_VALUES[c] = i + 1));

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Normalize a name to A–Z, folding Romanian and other diacritics. */
export const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(COMBINING_MARKS, '') // strip combining marks (ă→a, â→a, î→i, ș→s…)
    .replace(/[şș]/g, 's').replace(/[ŞȘ]/g, 'S') // ş/ș
    .replace(/[ţț]/g, 't').replace(/[ŢȚ]/g, 'T') // ţ/ț
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

const sumLetters = (letters: string): number =>
  letters.split('').reduce((acc, c) => acc + (LETTER_VALUES[c] ?? 0), 0);

export interface BirthDate { year: number; month: number; day: number }

export const parseDob = (iso: string): BirthDate => {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
};

/** Life Path number (the primary "destiny" number) from the birth date. */
export const lifePathNumber = (dob: BirthDate): number => {
  const m = reduceNumber(dob.month);
  const d = reduceNumber(dob.day);
  const y = reduceNumber(sumDigits(dob.year));
  return reduceNumber(m + d + y);
};

/** Expression / Destiny number from the full name (first + last). */
export const expressionNumber = (fullName: string): number =>
  reduceNumber(sumLetters(normalizeName(fullName)));

/** Soul Urge (heart's desire) — vowels only. */
export const soulUrgeNumber = (fullName: string): number => {
  const vowels = normalizeName(fullName).split('').filter((c) => VOWELS.has(c)).join('');
  return reduceNumber(sumLetters(vowels));
};

/** Personality number — consonants only. */
export const personalityNumber = (fullName: string): number => {
  const cons = normalizeName(fullName).split('').filter((c) => !VOWELS.has(c)).join('');
  return reduceNumber(sumLetters(cons));
};

/** Personal Year for the given calendar year (single digit 1–9). */
export const personalYearNumber = (dob: BirthDate, year: number): number =>
  reduceNumber(reduceNumber(dob.day, false) + reduceNumber(dob.month, false) + reduceNumber(sumDigits(year), false), false);

/** Personal Day number for a specific date (the daily numerology, 1–9). */
export const personalDayNumber = (dob: BirthDate, on: { year: number; month: number; day: number }): number => {
  const py = personalYearNumber(dob, on.year);
  const pm = reduceNumber(py + reduceNumber(on.month, false), false);
  return reduceNumber(pm + reduceNumber(on.day, false), false);
};

export interface NumerologyProfile {
  lifePath: number;
  expression: number;
  soulUrge: number;
  personality: number;
}

export const computeNumerology = (dob: BirthDate, fullName: string): NumerologyProfile => ({
  lifePath: lifePathNumber(dob),
  expression: expressionNumber(fullName),
  soulUrge: soulUrgeNumber(fullName),
  personality: personalityNumber(fullName),
});
