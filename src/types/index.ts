import { ZodiacSign } from '../constants/zodiac';

export interface UserProfile {
  name: string;
  zodiacSign: ZodiacSign;
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
}

export interface MoodEntry {
  date: string;            // ISO timestamp
  mood: number;            // 1 (anxious) to 5 (calm)
  context: 'pre-session' | 'post-session' | 'general';
}
