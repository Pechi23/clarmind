// Daily numerology reading (Gemini), blending the person's core numbers, their
// Personal Day, zodiac, and birth details. Cached per day + language.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BirthDetails } from '../types';
import { ZodiacSign } from '../constants/zodiac';
import { parseDob, computeNumerology, personalDayNumber } from './numerology';
import { computeDestinyMatrix } from './destinyMatrix';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

export interface NumerologyReading {
  personalDay: number;
  headline: string;   // short vibe for today
  message: string;    // 2-4 sentence daily guidance
  focus: string;      // one practical focus for today
  generatedAt: string;
}

const cacheKey = (date: string, lang: string) => `clarmind_numerology_${date}_${lang}`;

const fallback = (personalDay: number, lang: 'en' | 'ro'): NumerologyReading => ({
  personalDay,
  headline: lang === 'ro' ? `Ziua ta personală ${personalDay}` : `Your Personal Day ${personalDay}`,
  message:
    lang === 'ro'
      ? 'Astăzi este o zi bună pentru a respira conștient și a face un pas mic, dar sigur.'
      : 'Today is a good day to breathe with intention and take one small, steady step.',
  focus: lang === 'ro' ? 'Un gest de bunătate față de tine.' : 'One act of kindness toward yourself.',
  generatedAt: new Date().toISOString().split('T')[0],
});

export const getNumerologyReading = async (
  birth: BirthDetails,
  zodiac: ZodiacSign,
  language: 'en' | 'ro' = 'en'
): Promise<NumerologyReading> => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dob = parseDob(birth.dob);
  const nums = computeNumerology(dob, `${birth.firstName} ${birth.lastName}`);
  const matrix = computeDestinyMatrix(dob);
  const personalDay = personalDayNumber(dob, {
    year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate(),
  });

  const key = cacheKey(dateStr, language);
  const cached = await AsyncStorage.getItem(key);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) return fallback(personalDay, language);

  const prompt = `You are ClarMind, a warm numerology + wellness guide. Write today's personal numerology reading for ${birth.firstName}.

Their numbers:
- Life Path (destiny number): ${nums.lifePath}
- Expression: ${nums.expression}, Soul Urge: ${nums.soulUrge}, Personality: ${nums.personality}
- Personal Day today: ${personalDay}
- Zodiac sign: ${zodiac}
- Destiny Matrix core (center) arcana: ${matrix.center}, purpose arcana: ${matrix.purpose}
- Born ${birth.dob} at ${String(birth.hour).padStart(2, '0')}:${String(birth.minute).padStart(2, '0')} in ${birth.place || 'unknown place'}.

Blend numerology with a light astrological touch. Warm, encouraging, specific to the Personal Day ${personalDay}. Return ONLY a JSON object:
{
  "headline": "a short evocative title for today (max 5 words)",
  "message": "2-4 warm sentences of daily guidance tied to Personal Day ${personalDay}",
  "focus": "one concrete, practical focus for today (one short sentence)"
}
${language === 'ro' ? 'Write ALL values in Romanian.' : 'Write all values in English.'} No markdown, just the JSON.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.85 },
      }),
    });
    if (!response.ok) return fallback(personalDay, language);
    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(clean);
    const reading: NumerologyReading = { personalDay, generatedAt: dateStr, ...parsed };
    await AsyncStorage.setItem(key, JSON.stringify(reading));
    return reading;
  } catch {
    return fallback(personalDay, language);
  }
};
