import { ZODIAC_SIGNS, ZodiacSign } from '../constants/zodiac';

export interface LeaderboardUser {
  id: string;
  name: string;
  zodiac: ZodiacSign;
  streak: number;
  totalMinutes: number;
  isCurrentUser?: boolean;
}

const FAKE_NAMES = [
  'Andrei', 'Maria', 'Stefan', 'Ioana', 'Luna', 'Alex', 'Cristina',
  'David', 'Sofia', 'Mihai', 'Elena', 'Vlad', 'Ana', 'Radu', 'Diana',
  'Lia', 'Tudor', 'Bianca',
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

export const generateFakeUsers = (count = 14): LeaderboardUser[] => {
  const seed = todaySeed();
  return FAKE_NAMES.slice(0, count).map((name, i) => {
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
    };
  });
};

export const buildLeaderboard = (
  currentUser: LeaderboardUser,
  sortBy: 'streak' | 'totalMinutes'
): LeaderboardUser[] => {
  const fakes = generateFakeUsers();
  const all = [...fakes, currentUser];
  return all.sort((a, b) => b[sortBy] - a[sortBy]);
};
