// Daily "Cosmic Energy" reading — a date-seeded 1–10 gauge for the user's zodiac
// sign, with three facets. Deterministic per day per sign (no backend), matching
// the app's seeded-determinism pattern (see leaderboard.ts / gamification.ts).
import { ZODIAC_SIGNS } from '../constants/zodiac';

export type FacetKey = 'vitality' | 'clarity' | 'harmony';
export type EnergyTier = 'low' | 'moderate' | 'high' | 'peak';

export interface EnergyFacet {
  key: FacetKey;
  score: number; // 1–10
}

export interface CosmicEnergy {
  overall: number; // 1–10
  tier: EnergyTier;
  facets: EnergyFacet[]; // vitality, clarity, harmony
}

export const FACET_ORDER: FacetKey[] = ['vitality', 'clarity', 'harmony'];

const frac = (x: number) => x - Math.floor(x);
const seedRandom = (seed: number) => frac(Math.sin(seed) * 10000);

/** YYYYMMDD numeric seed — stable for a whole calendar day. */
export const dateSeed = (date: Date = new Date()): number =>
  date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

const signIndex = (sign: string): number => {
  const i = ZODIAC_SIGNS.findIndex((z) => z.name === sign);
  return i < 0 ? 0 : i;
};

const to1to10 = (r: number): number => 1 + Math.floor(r * 10); // maps [0,1) -> 1..10

const tierFor = (overall: number): EnergyTier =>
  overall >= 9 ? 'peak' : overall >= 7 ? 'high' : overall >= 4 ? 'moderate' : 'low';

/** The day's cosmic-energy reading for a zodiac sign. */
export const getCosmicEnergy = (sign: string, date: Date = new Date()): CosmicEnergy => {
  const base = dateSeed(date) + signIndex(sign) * 97;
  const vitality = to1to10(seedRandom(base + 3));
  const clarity = to1to10(seedRandom(base + 11));
  const harmony = to1to10(seedRandom(base + 23));
  const overall = Math.max(1, Math.min(10, Math.round((vitality + clarity + harmony) / 3)));
  return {
    overall,
    tier: tierFor(overall),
    facets: [
      { key: 'vitality', score: vitality },
      { key: 'clarity', score: clarity },
      { key: 'harmony', score: harmony },
    ],
  };
};
