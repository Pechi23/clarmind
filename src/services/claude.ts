import Anthropic from '@anthropic-ai/sdk';
import { ZodiacSign } from '../constants/zodiac';
import { DailyContent } from '../types';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

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

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const parsed = JSON.parse(text.trim());

  return {
    ...parsed,
    generatedAt: new Date().toISOString().split('T')[0],
  };
};
