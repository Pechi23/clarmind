// AI service — using Gemini REST API directly (works in React Native)
// Free tier: 1,500 requests/day — https://aistudio.google.com
// To switch to Claude later: replace fetch call with Anthropic SDK
import { ZodiacSign } from '../constants/zodiac';
import { DailyContent } from '../types';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export const generateDailyContent = async (
  name: string,
  zodiacSign: ZodiacSign
): Promise<DailyContent> => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `You are ClarMind, a calming mindfulness and wellness AI assistant. Generate personalized daily content for ${name}, whose zodiac sign is ${zodiacSign}. Today is ${today}.

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
