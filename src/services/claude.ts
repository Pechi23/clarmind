// AI service — using Gemini REST API directly (works in React Native)
// Free tier: 1,500 requests/day — https://aistudio.google.com
// To switch to Claude later: replace fetch call with Anthropic SDK
import { ZodiacSign } from '../constants/zodiac';
import { DailyContent, UserGoal } from '../types';
import { WeeklyRecap, buildFallbackReflection } from './weeklyRecapLogic';

const GOAL_CONTEXT: Record<UserGoal, string> = {
  sleep: 'Their main goal is sleeping better — lean toward rest, winding down, and releasing the day.',
  stress: 'Their main goal is managing stress — lean toward grounding, breathing room, and perspective.',
  focus: 'Their main goal is sharpening focus — lean toward clarity, single-tasking, and mental energy.',
  curiosity: 'They are exploring mindfulness out of curiosity — keep it inviting, varied, and light.',
};

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export const generateDailyContent = async (
  name: string,
  zodiacSign: ZodiacSign,
  goal?: UserGoal
): Promise<DailyContent> => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `You are ClarMind, a calming mindfulness and wellness AI assistant. Generate personalized daily content for ${name}, whose zodiac sign is ${zodiacSign}. Today is ${today}.
${goal ? GOAL_CONTEXT[goal] : ''}

Return ONLY a valid JSON object with exactly these fields:
{
  "quote": "an inspiring quote (real or original) about clarity, peace, or growth",
  "quoteAuthor": "the author name, or 'ClarMind' if original",
  "zodiacMessage": "2-3 sentences of personalized zodiac insight for ${zodiacSign} today — focus on emotional wellbeing, clarity, and growth",
  "stressTip": "one practical, specific tip to handle stress today (2-3 sentences)",
  "mindfulnessTask": "one simple mindfulness task they can do in under 5 minutes today",
  "affirmation": "a short powerful personal affirmation (1 sentence, starting with 'I am' or 'I have' or 'I choose')"
}

Keep the tone warm, calm, and encouraging. No markdown, no extra text — just the JSON.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 600, temperature: 0.8 },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit reached (429). Wait 1 minute and try again.');
    }
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(clean);

  return {
    ...parsed,
    generatedAt: new Date().toISOString().split('T')[0],
  };
};

/**
 * One warm sentence reflecting on the user's week. Always resolves — falls back
 * to a locally-derived sentence if the network/API is unavailable, so the recap
 * card never blocks or shows an error.
 */
export const generateWeeklyReflection = async (
  name: string,
  recap: WeeklyRecap
): Promise<string> => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  const fallback = buildFallbackReflection(recap);
  if (!apiKey) return fallback;

  const { thisWeek, lastWeek, minutesDelta, moodDelta } = recap;
  const prompt = `You are ClarMind, a warm mindfulness companion. Write ONE short encouraging sentence (max 22 words) for ${name} reflecting on their meditation week. Be specific and genuine, not generic. No quotes, no markdown — just the sentence.

This week: ${thisWeek.sessions} sessions, ${thisWeek.minutes} minutes, ${thisWeek.activeDays} active days${thisWeek.avgMood !== null ? `, average mood ${thisWeek.avgMood}/5` : ''}.
Last week: ${lastWeek.sessions} sessions, ${lastWeek.minutes} minutes.
Change in minutes: ${minutesDelta >= 0 ? '+' : ''}${minutesDelta}${moodDelta !== null ? `. Mood change: ${moodDelta >= 0 ? '+' : ''}${moodDelta}` : ''}.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 60, temperature: 0.9 },
      }),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    return clean.length > 0 ? clean : fallback;
  } catch {
    return fallback;
  }
};
