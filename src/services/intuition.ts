// "Sense the card" — a light intuition mini-game. The app hides one of a few
// cosmic symbols; the player follows their gut and picks. Pure, seedable logic
// here; the playful UI lives in IntuitionGame.tsx. It's for fun, not a skill claim.

export const INTUITION_SYMBOLS = ['☀️', '🌙', '⭐', '🪐'] as const;

/** Pick the hidden target index in [0, n). `rng` injectable for tests. */
export const pickTarget = (n: number, rng: () => number = Math.random): number =>
  Math.min(n - 1, Math.max(0, Math.floor(rng() * n)));

/** Whole-percent accuracy; 0 when nothing played yet. */
export const accuracyPct = (hits: number, total: number): number =>
  total > 0 ? Math.round((hits / total) * 100) : 0;

/** i18n key for the reveal message. */
export const feedbackKey = (hit: boolean): string =>
  hit ? 'intuition.hit' : 'intuition.miss';
