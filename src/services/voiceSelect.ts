// Pure voice-picking logic (no expo-speech import, so it's unit-testable).
// Given the device's available TTS voices, choose the most natural FEMALE voice
// for a locale: strong female-name hints (reliable on iOS), a penalty for known
// male voices, and a preference for higher-quality / more natural engines.

export interface VoiceLike {
  identifier: string;
  name?: string;
  language?: string;
  quality?: string; // 'Default' | 'Enhanced'
}

// Known female TTS voice names/identifiers across iOS and common Android engines.
const FEMALE_HINTS = [
  'female',
  // iOS
  'samantha', 'karen', 'moira', 'tessa', 'fiona', 'victoria', 'allison', 'ava',
  'susan', 'zoe', 'serena', 'kate', 'anna', 'alice', 'amelie', 'amélie', 'paulina',
  'luciana', 'joana', 'catherine', 'nora', 'ellen', 'milena', 'yuna', 'sara',
  'laura', 'carmit', 'damayanti', 'mariska', 'sinji', 'lekha', 'kanya', 'nicky',
  // Google/Samsung sometimes expose gendered codes
  'wavenet-c', 'wavenet-e', 'wavenet-f',
];
const MALE_HINTS = [
  'male',
  'fred', 'daniel', 'thomas', 'xander', 'aaron', 'arthur', 'oliver', 'rishi',
  'gordon', 'diego', 'jorge', 'juan', 'luca', 'maged', 'yuri', 'reed', 'rocko',
  'wavenet-a', 'wavenet-b', 'wavenet-d',
];

const includesAny = (hay: string, needles: string[]) => needles.some((n) => hay.includes(n));

/** Higher is better. Female hints dominate; quality/naturalness break ties. */
export const scoreVoice = (v: VoiceLike, locale: string): number => {
  const lang = locale.toLowerCase();
  const base = lang.split('-')[0];
  const vlang = (v.language ?? '').toLowerCase();
  if (!vlang.startsWith(base)) return -Infinity; // wrong language — never pick
  const id = (v.identifier ?? '').toLowerCase();
  const nm = (v.name ?? '').toLowerCase();
  const text = `${id} ${nm}`;

  let s = 0;
  if (includesAny(text, FEMALE_HINTS)) s += 100;
  if (includesAny(text, MALE_HINTS)) s -= 100;
  if ((v.quality ?? '').toLowerCase() === 'enhanced') s += 25;
  if (text.includes('network')) s += 12; // Android network voices are more natural
  if (text.includes('premium') || text.includes('neural') || text.includes('wavenet')) s += 15;
  if (vlang === lang) s += 8; // exact region match (en-US over en-GB)
  return s;
};

/**
 * Pick the best female-sounding voice identifier for a locale, or undefined to
 * let the platform default apply. When no voice scores positively (e.g. Android
 * can't reveal gender), fall back to the highest-quality same-language voice.
 */
export const chooseVoice = (voices: VoiceLike[], locale: string): string | undefined => {
  const base = locale.toLowerCase().split('-')[0];
  const candidates = voices.filter((v) => (v.language ?? '').toLowerCase().startsWith(base));
  if (!candidates.length) return undefined;
  const ranked = [...candidates].sort((a, b) => scoreVoice(b, locale) - scoreVoice(a, locale));
  const best = ranked[0];
  return best ? best.identifier : undefined;
};
