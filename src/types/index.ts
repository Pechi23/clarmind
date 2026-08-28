import { ZodiacSign } from '../constants/zodiac';

export type UserGoal = 'sleep' | 'stress' | 'focus' | 'curiosity';

export interface UserProfile {
  name: string;
  zodiacSign: ZodiacSign;
  goal?: UserGoal;
  onboardingComplete: boolean;
}

export interface DailyContent {
  quote: string;
  quoteAuthor: string;
  zodiacMessage: string;
  stressTip: string;
  mindfulnessTask: string;
  affirmation: string;
  generatedAt: string;
}

export type BreathingPatternId = 'box' | '478' | 'deepCalm';

export interface MeditationSession {
  date: string;            // ISO date YYYY-MM-DD
  durationMinutes: number;
  pattern: BreathingPatternId;
  completedAt: string;     // ISO timestamp
  soundscape?: string;     // soundscape id, 'silence' if none
}

export interface StreakResult {
  streak: number;
  shields: number;
  shieldUsed: boolean;     // a shield was consumed for a missed day this open
  shieldEarned: boolean;   // a new shield was earned this open
}

export interface MoodEntry {
  date: string;            // ISO timestamp
  mood: number;            // 1 (anxious) to 5 (calm)
  context: 'pre-session' | 'post-session' | 'general';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  at: string;              // ISO timestamp
}

export interface ReflectionEntry {
  date: string;            // YYYY-MM-DD
  questionKey: string;     // i18n key of the prompt shown
  answer: string;
}
