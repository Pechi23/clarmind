// Current moon phase — pure, offline, anchored to the same reference full moon
// used by seasonalEvents.ts so the two always agree.

const SYNODIC = 29.530588853;
const KNOWN_FULL_MOON_MS = Date.UTC(2000, 0, 21, 4, 40);

export type MoonPhaseName =
  | 'new' | 'waxingCrescent' | 'firstQuarter' | 'waxingGibbous'
  | 'full' | 'waningGibbous' | 'lastQuarter' | 'waningCrescent';

export interface MoonPhase {
  phase: MoonPhaseName;
  emoji: string;
  illumination: number; // 0 (new) .. 1 (full)
  age: number;          // days since the last new moon (0 .. ~29.53)
}

const PHASES: { name: MoonPhaseName; emoji: string }[] = [
  { name: 'new', emoji: '🌑' },
  { name: 'waxingCrescent', emoji: '🌒' },
  { name: 'firstQuarter', emoji: '🌓' },
  { name: 'waxingGibbous', emoji: '🌔' },
  { name: 'full', emoji: '🌕' },
  { name: 'waningGibbous', emoji: '🌖' },
  { name: 'lastQuarter', emoji: '🌗' },
  { name: 'waningCrescent', emoji: '🌘' },
];

/** The moon phase for a given date. */
export const getMoonPhase = (date: Date = new Date()): MoonPhase => {
  const diffDays = (date.getTime() - KNOWN_FULL_MOON_MS) / 86400000;
  // Shift so the reference full moon (diff = 0) sits at age = SYNODIC/2.
  const age = (((diffDays + SYNODIC / 2) % SYNODIC) + SYNODIC) % SYNODIC;
  const fraction = age / SYNODIC; // 0 = new, 0.5 = full
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const idx = Math.round(fraction * 8) % 8; // nearest of the 8 canonical phases
  return { phase: PHASES[idx].name, emoji: PHASES[idx].emoji, illumination, age };
};
