import { ZODIAC_SIGNS, ZodiacSign } from '../constants/zodiac';

export interface LeaderboardUser {
  id: string;
  name: string;
  zodiac: ZodiacSign;
  streak: number;
  totalMinutes: number;
  xp: number;
  isCurrentUser?: boolean;
}

// Sample names shown only when NO real leaderboard backend is configured
// (dev/demo). An international mix rather than one nationality. In a shipped
// build the real backend is set, so these never appear (see LeaderboardScreen).
const SAMPLE_NAMES = [
  'Aria', 'Mateo', 'Yuki', 'Noah', 'Luna', 'Amara', 'Liam', 'Sofia',
  'Kai', 'Nina', 'Omar', 'Elena', 'Leo', 'Aisha', 'Hugo', 'Mia',
  'Ravi', 'Clara',
];

// Seeded pseudo-random for consistent daily values
const seedRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const todaySeed = (): number => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

export const generateSampleUsers = (count = 14): LeaderboardUser[] => {
  const seed = todaySeed();
  return SAMPLE_NAMES.slice(0, count).map((name, i) => {
    const r1 = seedRandom(seed + i * 7);
    const r2 = seedRandom(seed + i * 13);
    const r3 = seedRandom(seed + i * 19);
    const zodiacIdx = Math.floor(r3 * ZODIAC_SIGNS.length);
    return {
      id: `fake-${i}`,
      name,
      zodiac: ZODIAC_SIGNS[zodiacIdx].name,
      streak: Math.max(1, Math.floor(r1 * 80) + (i < 5 ? 30 : 0)),
      totalMinutes: Math.floor(r2 * 1500) + (i < 3 ? 800 : 100),
      xp: Math.floor(r1 * 4000) + Math.floor(r2 * 2000) + (i < 4 ? 1500 : 200),
    };
  });
};

export const buildLeaderboard = (
  currentUser: LeaderboardUser,
  sortBy: 'streak' | 'totalMinutes' | 'xp'
): LeaderboardUser[] => {
  const samples = generateSampleUsers();
  const all = [...samples, currentUser];
  return all.sort((a, b) => b[sortBy] - a[sortBy]);
};
