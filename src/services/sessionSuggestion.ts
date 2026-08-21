import { BreathingPatternId } from '../types';

export interface SessionSuggestion {
  patternId: BreathingPatternId;
  minutes: number;
  reasonKey: string; // i18n key under "suggestion."
}

const isNight = (hour: number) => hour >= 21 || hour < 5;

/**
 * Suggests a breathing pattern + duration from the user's most recent mood and
 * the time of day. Pure and testable; returns null when there's no strong
 * signal. `reasonKey` is an i18n key so the UI localizes the message.
 *
 * Priority: night wind-down > low mood (calm & longer) > high mood (light focus).
 */
export const suggestSession = (
  recentMood: number | null,
  hour: number
): SessionSuggestion | null => {
  if (isNight(hour)) {
    return { patternId: '478', minutes: 10, reasonKey: 'suggestion.night' };
  }
  if (recentMood !== null && recentMood <= 2) {
    return { patternId: 'deepCalm', minutes: 10, reasonKey: 'suggestion.lowMood' };
  }
  if (recentMood !== null && recentMood >= 4) {
    return { patternId: 'box', minutes: 5, reasonKey: 'suggestion.highMood' };
  }
  return null;
};
