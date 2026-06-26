export interface ChallengeDef {
  id: string;
  text: string;
  emoji: string;
}

export const CHALLENGE_POOL: ChallengeDef[] = [
  { id: 'session-5min',   text: 'Complete a 5-minute session',      emoji: '⏱️' },
  { id: 'pattern-478',    text: 'Try the 4-7-8 pattern',            emoji: '😴' },
  { id: 'pattern-box',    text: 'Do a Box Breathing session',       emoji: '📦' },
  { id: 'mood-checkin',   text: 'Log your mood after a session',    emoji: '😌' },
  { id: 'read-guide',     text: 'Read your full daily guide',       emoji: '📖' },
  { id: 'morning',        text: 'Meditate before noon',             emoji: '🌅' },
  { id: 'two-sessions',   text: 'Complete 2 sessions today',        emoji: '✌️' },
  { id: 'session-10min',  text: 'Complete a 10-minute session',     emoji: '🧘' },
  { id: 'soundscape',     text: 'Meditate with a soundscape',       emoji: '🎧' },
];

/** Deterministic distinct index picker (LCG). Same seed -> same indices. */
export const seededShuffleIndices = (seed: number, length: number, count: number): number[] => {
  const picked: number[] = [];
  let s = seed;
  let guard = 0;
  while (picked.length < count && guard++ < length * 10) {
    s = (s * 9301 + 49297) % 233280;
    const idx = Math.floor((s / 233280) * length);
    if (!picked.includes(idx)) picked.push(idx);
  }
  return picked;
};

/** The 3 challenges for a given YYYY-MM-DD, deterministic per date. */
export const pickDailyChallengeDefs = (dateStr: string, count = 3): ChallengeDef[] => {
  const seed = parseInt(dateStr.replace(/-/g, ''), 10);
  return seededShuffleIndices(seed, CHALLENGE_POOL.length, count).map((i) => CHALLENGE_POOL[i]);
};
