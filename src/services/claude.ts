// AI service — currently using Google Gemini (free tier: 1500 req/day)
// To switch to Claude: replace with Anthropic SDK and EXPO_PUBLIC_ANTHROPIC_API_KEY
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodiacSign } from '../constants/zodiac';
import { DailyContent } from '../types';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '');

export const generateDailyContent = async (
  name: string,
  zodiacSign: ZodiacSign
): Promise<DailyContent> => {
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

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the JSON
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(clean);

  return {
    ...parsed,
    generatedAt: new Date().toISOString().split('T')[0],
  };
};
