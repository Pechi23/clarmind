import { StreakResult } from '../types';

export const MAX_SHIELDS = 2;

/** Whole days from one YYYY-MM-DD to another (positive if `to` is later). */
export const daysBetween = (fromIso: string, toIso: string): number => {
  const from = new Date(fromIso + 'T00:00:00');
  const to = new Date(toIso + 'T00:00:00');
  return Math.round((to.getTime() - from.getTime()) / 86400000);
};

export interface StreakInput {
  prevStreak: number;
  prevShields: number;
  lastOpen: string | null; // YYYY-MM-DD of the previous open, null if first ever
  today: string;           // YYYY-MM-DD
  maxShields?: number;
}

/**
 * Pure streak + Stardust Shield computation. No storage I/O.
 *
 * Rules:
 * - First ever open -> streak 1.
 * - Same day reopen -> unchanged.
 * - Consecutive day (gap 1) -> streak + 1.
 * - Exactly one missed day (gap 2) with a shield -> consume shield, streak + 1.
 * - Otherwise -> streak resets to 1.
 * - Every 7th day of an ongoing streak earns a shield (capped at maxShields).
 */
export const computeStreakUpdate = (input: StreakInput): StreakResult => {
  const maxShields = input.maxShields ?? MAX_SHIELDS;
  let streak = input.prevStreak;
  let shields = input.prevShields;
  let shieldUsed = false;
  let shieldEarned = false;

  if (!input.lastOpen) {
    streak = 1;
  } else if (input.lastOpen !== input.today) {
    const gap = daysBetween(input.lastOpen, input.today);
    if (gap === 1) {
      streak += 1;
    } else if (gap === 2 && shields > 0) {
      shields -= 1;
      shieldUsed = true;
      streak += 1;
    } else {
      streak = 1;
    }
    if (streak > 0 && streak % 7 === 0 && shields < maxShields) {
      shields += 1;
      shieldEarned = true;
    }
  }

  return { streak, shields, shieldUsed, shieldEarned };
};
