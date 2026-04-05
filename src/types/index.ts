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
  generatedAt: string; // ISO date string YYYY-MM-DD
}
