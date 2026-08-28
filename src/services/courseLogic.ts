// Pure logic for 7-day micro-courses. One day unlocks per calendar day.

export const COURSE_LENGTH = 7;

/** Whole days from one YYYY-MM-DD to another. */
export const daysBetweenDates = (fromIso: string, toIso: string): number =>
  Math.round(
    (Date.parse(toIso + 'T00:00:00Z') - Date.parse(fromIso + 'T00:00:00Z')) / 86400000
  );

/**
 * The highest day number (1..7) the user may open, given the start date.
 * Day 1 is available immediately; each later day unlocks on its calendar day.
 */
export const unlockedDay = (startDate: string, today: string): number => {
  const elapsed = daysBetweenDates(startDate, today);
  return Math.min(COURSE_LENGTH, Math.max(1, elapsed + 1));
};

export const isDayUnlocked = (day: number, startDate: string, today: string): boolean =>
  day >= 1 && day <= unlockedDay(startDate, today);

export const isCourseComplete = (completedDays: number[]): boolean =>
  completedDays.filter((d) => d >= 1 && d <= COURSE_LENGTH).length >= COURSE_LENGTH;
