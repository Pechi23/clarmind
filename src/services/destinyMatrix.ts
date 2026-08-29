/**
 * Destiny Matrix (Matrița Destinului) — the 8-point octagram + center computed
 * from the birth date, using the 22 Major Arcana (values 1–22).
 *
 * Method (documented): the octagram is two overlapping squares.
 *   A (left)   = day
 *   B (top)    = month
 *   C (right)  = sum of the year's digits
 *   D (bottom) = A + B + C           (purpose / "comet")
 *   E (center) = A + B + C + D        (comfort zone / core energy — most important)
 * Diagonal (secondary square) corners:
 *   AB (top-left) = A + B
 *   BC (top-right) = B + C
 *   CD (bottom-right) = C + D
 *   DA (bottom-left) = D + A
 * Every value is reduced into the 1–22 arcana range.
 *
 * This is an esoteric model provided for reflection/entertainment only.
 */
import { BirthDate } from './numerology';

/** Map any positive integer into the 1–22 arcana range. */
export const reduceArcana = (n: number): number => ((Math.abs(n) - 1) % 22) + 1;

const sumDigits = (n: number): number =>
  String(Math.abs(n)).split('').reduce((a, c) => a + Number(c), 0);

export interface DestinyMatrix {
  day: number;       // A
  month: number;     // B
  year: number;      // C
  purpose: number;   // D
  center: number;    // E
  topLeft: number;   // AB
  topRight: number;  // BC
  bottomRight: number; // CD
  bottomLeft: number;  // DA
}

export const computeDestinyMatrix = (dob: BirthDate): DestinyMatrix => {
  const A = reduceArcana(dob.day);
  const B = reduceArcana(dob.month);
  const C = reduceArcana(sumDigits(dob.year));
  const D = reduceArcana(A + B + C);
  const E = reduceArcana(A + B + C + D);
  return {
    day: A,
    month: B,
    year: C,
    purpose: D,
    center: E,
    topLeft: reduceArcana(A + B),
    topRight: reduceArcana(B + C),
    bottomRight: reduceArcana(C + D),
    bottomLeft: reduceArcana(D + A),
  };
};

/** The 22 Major Arcana names, indexed 1–22 (English + Romanian). */
export const ARCANA_NAMES: Record<number, { en: string; ro: string }> = {
  1: { en: 'The Magician', ro: 'Magicianul' },
  2: { en: 'The High Priestess', ro: 'Marea Preoteasă' },
  3: { en: 'The Empress', ro: 'Împărăteasa' },
  4: { en: 'The Emperor', ro: 'Împăratul' },
  5: { en: 'The Hierophant', ro: 'Hierofantul' },
  6: { en: 'The Lovers', ro: 'Îndrăgostiții' },
  7: { en: 'The Chariot', ro: 'Carul' },
  8: { en: 'Justice', ro: 'Dreptatea' },
  9: { en: 'The Hermit', ro: 'Sihastrul' },
  10: { en: 'Wheel of Fortune', ro: 'Roata Norocului' },
  11: { en: 'Strength', ro: 'Puterea' },
  12: { en: 'The Hanged Man', ro: 'Spânzuratul' },
  13: { en: 'Death', ro: 'Moartea' },
  14: { en: 'Temperance', ro: 'Cumpătarea' },
  15: { en: 'The Devil', ro: 'Diavolul' },
  16: { en: 'The Tower', ro: 'Turnul' },
  17: { en: 'The Star', ro: 'Steaua' },
  18: { en: 'The Moon', ro: 'Luna' },
  19: { en: 'The Sun', ro: 'Soarele' },
  20: { en: 'Judgement', ro: 'Judecata' },
  21: { en: 'The World', ro: 'Lumea' },
  22: { en: 'The Fool', ro: 'Nebunul' },
};

export const arcanaName = (n: number, language: 'en' | 'ro'): string =>
  ARCANA_NAMES[n]?.[language] ?? String(n);
