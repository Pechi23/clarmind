// AI-generated micro-course day content (Gemini), cached in AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CourseDef, CourseDayContent, COURSES } from '../constants/courses';
import { COURSE_LENGTH } from './courseLogic';
import { Language, languageName } from '../i18n/languages';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

const cacheKey = (courseId: string, day: number, lang: string) =>
  `clarmind_course_${courseId}_${day}_${lang}`;

const fallback = (course: CourseDef, day: number, lang: Language): CourseDayContent =>
  lang === 'ro'
    ? {
        title: `Ziua ${day}`,
        intro: 'Ia-ți un moment doar pentru tine astăzi.',
        practice: 'Respiră lent de cinci ori, prelungind fiecare expirație.',
        reflection: 'Ce a fost puțin mai ușor astăzi?',
      }
    : {
        title: `Day ${day}`,
        intro: 'Take a quiet moment just for yourself today.',
        practice: 'Take five slow breaths, making each exhale a little longer.',
        reflection: 'What felt a little lighter today?',
      };

/**
 * Returns day content for a course, generating via Gemini on first view and
 * caching it. Always resolves — falls back to a simple local day on any failure.
 */
export const getCourseDay = async (
  courseId: string,
  day: number,
  language: Language = 'en'
): Promise<CourseDayContent> => {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return fallback({ id: courseId } as CourseDef, day, language);

  const key = cacheKey(courseId, day, language);
  const cached = await AsyncStorage.getItem(key);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) return fallback(course, day, language);

  const prompt = `You are ClarMind, a calm mindfulness guide. This is Day ${day} of ${COURSE_LENGTH} in a gentle micro-course about ${course.theme}. Write today's short lesson.

Return ONLY a valid JSON object with exactly these fields:
{
  "title": "a short evocative title for day ${day} (max 5 words)",
  "intro": "2-3 warm sentences introducing today's focus",
  "practice": "one concrete practice or exercise for today (2-3 sentences)",
  "reflection": "one short reflective question to sit with today"
}

Write ALL field values in ${languageName(language)}. No markdown, no extra text — just the JSON.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1536, temperature: 0.8 },
      }),
    });
    if (!response.ok) return fallback(course, day, language);
    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(clean) as CourseDayContent;
    await AsyncStorage.setItem(key, JSON.stringify(parsed));
    return parsed;
  } catch {
    return fallback(course, day, language);
  }
};
