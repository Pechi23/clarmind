export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'firsts' | 'consistency' | 'volume' | 'mastery';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Firsts
  { id: 'first-breath',   name: 'First Breath',   emoji: '🌬️', description: 'Complete your first session',          category: 'firsts' },
  { id: 'mood-explorer',  name: 'Mood Explorer',  emoji: '😌', description: 'Log your first mood check-in',          category: 'firsts' },
  { id: 'sound-bather',   name: 'Sound Bather',   emoji: '🎧', description: 'Meditate with a soundscape',            category: 'firsts' },
  { id: 'night-owl',      name: 'Night Owl',      emoji: '🦉', description: 'Complete a session after 9 PM',         category: 'firsts' },
  // Consistency
  { id: 'streak-3',       name: 'Kindling',       emoji: '🕯️', description: 'Reach a 3-day streak',                  category: 'consistency' },
  { id: 'streak-7',       name: 'Steady Flame',   emoji: '🔥', description: 'Reach a 7-day streak',                  category: 'consistency' },
  { id: 'streak-30',      name: 'Eternal Fire',   emoji: '☀️', description: 'Reach a 30-day streak',                 category: 'consistency' },
  { id: 'streak-100',     name: 'Supernova',      emoji: '🌟', description: 'Reach a 100-day streak',                category: 'consistency' },
  // Volume
  { id: 'minutes-30',     name: 'Settling In',    emoji: '🌱', description: '30 total mindful minutes',              category: 'volume' },
  { id: 'minutes-100',    name: 'Deep Roots',     emoji: '🌿', description: '100 total mindful minutes',             category: 'volume' },
  { id: 'minutes-500',    name: 'Old Growth',     emoji: '🌳', description: '500 total mindful minutes',             category: 'volume' },
  { id: 'minutes-1000',   name: 'Sacred Forest',  emoji: '🌲', description: '1000 total mindful minutes',            category: 'volume' },
  // Mastery
  { id: 'all-patterns',   name: 'Pattern Master', emoji: '🧩', description: 'Try all 3 breathing patterns',          category: 'mastery' },
  { id: 'marathon',       name: 'Marathon Mind',  emoji: '🏔️', description: 'Complete a 20-minute session',          category: 'mastery' },
  { id: 'perfect-day',    name: 'Perfect Day',    emoji: '✨', description: 'Complete all 3 daily challenges',       category: 'mastery' },
  { id: 'level-10',       name: 'Inner Light',    emoji: '💡', description: 'Reach level 10',                        category: 'mastery' },
];

export interface LevelDef {
  level: number;
  rank: string;
  totalXp: number;
}

export const LEVELS: LevelDef[] = [
  { level: 1,  rank: 'Wandering Mind',    totalXp: 0 },
  { level: 2,  rank: 'Curious Mind',      totalXp: 100 },
  { level: 3,  rank: 'Waking Mind',       totalXp: 250 },
  { level: 4,  rank: 'Calm Seeker',       totalXp: 500 },
  { level: 5,  rank: 'Breath Apprentice', totalXp: 850 },
  { level: 6,  rank: 'Still Water',       totalXp: 1300 },
  { level: 7,  rank: 'Clear Sky',         totalXp: 1900 },
  { level: 8,  rank: 'Zen Apprentice',    totalXp: 2700 },
  { level: 9,  rank: 'Mind Gardener',     totalXp: 3700 },
  { level: 10, rank: 'Inner Light',       totalXp: 5000 },
  { level: 11, rank: 'Cosmic Calm',       totalXp: 6600 },
  { level: 12, rank: 'Clear Mind',        totalXp: 8500 },
];

// Levels 13+ are "Enlightened" with +2500 XP per level
export const ENLIGHTENED_STEP = 2500;

export const getLevelForXp = (xp: number): { level: number; rank: string; currentLevelXp: number; nextLevelXp: number } => {
  // Beyond the table
  const last = LEVELS[LEVELS.length - 1];
  if (xp >= last.totalXp + ENLIGHTENED_STEP) {
    const extra = Math.floor((xp - last.totalXp) / ENLIGHTENED_STEP);
    const level = last.level + extra;
    const currentLevelXp = last.totalXp + extra * ENLIGHTENED_STEP;
    return {
      level,
      rank: `Enlightened ${'I'.repeat(Math.min(extra, 10))}`,
      currentLevelXp,
      nextLevelXp: currentLevelXp + ENLIGHTENED_STEP,
    };
  }

  let current = LEVELS[0];
  let next = LEVELS[1] ?? null;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].totalXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? { level: current.level + 1, rank: 'Enlightened I', totalXp: current.totalXp + ENLIGHTENED_STEP };
      break;
    }
  }
  return {
    level: current.level,
    rank: current.rank,
    currentLevelXp: current.totalXp,
    nextLevelXp: next!.totalXp,
  };
};

// XP rewards
export const XP = {
  DAILY_OPEN: 10,
  READ_GUIDE: 15,
  PER_MINUTE: 10,
  CHALLENGE: 25,
  ALL_CHALLENGES_BONUS: 50,
  MOOD_CHECKIN: 5,
  STREAK_7_BONUS: 100,
};
