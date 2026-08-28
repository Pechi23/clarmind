// Calendar/lunar-driven special moments. Pure and testable — no backend.
// Each active event surfaces a themed banner (and could gate a special badge).

export interface SeasonalEvent {
  id: string;
  emoji: string;
  titleKey: string;   // i18n key under "seasonal."
  messageKey: string;
}

// Synodic month and a reference full moon (2000-01-21 04:40 UTC).
const SYNODIC = 29.530588853;
const KNOWN_FULL_MOON_MS = Date.UTC(2000, 0, 21, 4, 40);

/** Distance in days to the nearest full moon (0 = exactly full). */
export const daysToFullMoon = (date: Date = new Date()): number => {
  const diff = (date.getTime() - KNOWN_FULL_MOON_MS) / 86400000;
  const mod = ((diff % SYNODIC) + SYNODIC) % SYNODIC;
  return Math.min(mod, SYNODIC - mod);
};

/** True within ~a day of a full moon. */
export const isFullMoon = (date: Date = new Date()): boolean => daysToFullMoon(date) < 1;

const ev = (id: string, emoji: string): SeasonalEvent => ({
  id,
  emoji,
  titleKey: `seasonal.${id}.title`,
  messageKey: `seasonal.${id}.message`,
});

/**
 * Returns the active seasonal event for a date, or null. Fixed calendar days
 * take priority over the full moon (they're rarer). Northern-hemisphere dates.
 */
export const getSeasonalEvent = (date: Date = new Date()): SeasonalEvent | null => {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  if (m === 1 && d === 1) return ev('newYear', '✨');
  if (m === 12 && d === 31) return ev('newYearEve', '🎆');
  if (m === 12 && d === 21) return ev('winterSolstice', '❄️');
  if (m === 6 && d === 21) return ev('summerSolstice', '☀️');
  if (m === 3 && d === 20) return ev('springEquinox', '🌸');
  if (m === 9 && d === 22) return ev('autumnEquinox', '🍂');
  if (isFullMoon(date)) return ev('fullMoon', '🌕');
  return null;
};
