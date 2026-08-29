import { ZodiacSign } from '../constants/zodiac';

export type UserGoal = 'sleep' | 'stress' | 'focus' | 'curiosity';

export type Gender = 'female' | 'male' | 'other';

/** Birth details used for numerology + the Destiny Matrix (and an astrological touch). */
export interface BirthDetails {
  firstName: string;
  lastName: string;
  gender: Gender;
  dob: string;       // YYYY-MM-DD (used by numerology + matrix)
  hour: number;      // 0-23 (astrological flavor only)
  minute: number;    // 0-59
  place: string;     // free text, astrological flavor only
}

export interface UserProfile {
  name: string;
  zodiacSign: ZodiacSign;
  goal?: UserGoal;
  birth?: BirthDetails;
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

export interface CourseProgress {
  courseId: string;
  startDate: string;       // YYYY-MM-DD
  completedDays: number[]; // 1..7
}
