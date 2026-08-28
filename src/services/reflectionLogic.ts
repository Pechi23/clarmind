// Evening reflection: a gentle nightly journaling prompt.
// Date-seeded so everyone gets a stable question per day (works offline).

export const REFLECTION_KEYS = [
  'reflection.questions.release',
  'reflection.questions.wentWell',
  'reflection.questions.grateful',
  'reflection.questions.emotion',
  'reflection.questions.lighter',
  'reflection.questions.calm',
  'reflection.questions.kind',
  'reflection.questions.canWait',
];

/** Evening starts at 20:00 local time. */
export const isEvening = (hour: number = new Date().getHours()): boolean => hour >= 20 || hour < 4;

/** Deterministic question key for a given YYYY-MM-DD. */
export const pickReflectionKey = (dateStr: string): string => {
  const seed = parseInt(dateStr.replace(/-/g, ''), 10);
  // LCG step for a well-spread index.
  const idx = Math.abs((seed * 9301 + 49297) % 233280) % REFLECTION_KEYS.length;
  return REFLECTION_KEYS[idx];
};
