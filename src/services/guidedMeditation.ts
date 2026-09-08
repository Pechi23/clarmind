// AI-guided voice meditation (premium). The AI writes a spoken meditation script;
// the app reads it aloud slowly with expo-speech (see GuidedMeditationScreen).
// Pure parts (voices, fallback, parsing) are unit-tested; the AI call has an
// offline fallback so playback never blocks.
import { UserGoal } from '../types';
import { Language, languageName } from '../i18n/languages';
import { callGemini, hasAi } from './ai';

/** A calm voice "avatar" the user can pick. rate/pitch tune expo-speech. */
export interface MeditationVoice {
  id: string;
  name: string;
  emoji: string;
  rate: number;  // slower = calmer (expo-speech: 1.0 is normal)
  pitch: number;
}

export const MEDITATION_VOICES: MeditationVoice[] = [
  { id: 'luna', name: 'Luna', emoji: '🌙', rate: 0.72, pitch: 1.05 },
  { id: 'sol', name: 'Sol', emoji: '☀️', rate: 0.78, pitch: 0.95 },
  { id: 'aria', name: 'Aria', emoji: '🕊️', rate: 0.7, pitch: 1.12 },
  { id: 'terra', name: 'Terra', emoji: '🌿', rate: 0.75, pitch: 0.9 },
];

export const TTS_LOCALE: Record<Language, string> = {
  en: 'en-US', ro: 'ro-RO', it: 'it-IT', fr: 'fr-FR', es: 'es-ES',
};

/** One spoken line plus the silent pause that follows it (breathing room). */
export interface MeditationSegment {
  text: string;
  pauseMs: number;
}

export type MeditationLength = 3 | 5 | 10;

// Roughly how many spoken lines fit a given length (the rest is silence/breathing).
const LINES_FOR: Record<MeditationLength, number> = { 3: 8, 5: 12, 10: 20 };

const GOAL_FOCUS: Record<UserGoal, string> = {
  sleep: 'drifting toward deep, restful sleep — releasing the day',
  stress: 'releasing tension and finding calm, grounded safety',
  focus: 'clearing mental clutter and settling into steady focus',
  curiosity: 'gently exploring the present moment with open curiosity',
};

/** Clamp a pause to a sane range (2–14s) so a bad AI value can't stall playback. */
const clampPause = (s: number): number => Math.round(Math.min(14, Math.max(2, s)) * 1000);

/**
 * Parse the AI JSON into segments. Accepts { segments: [{ say, pause }] } and is
 * defensive about missing/typed-wrong fields. Returns [] if nothing usable.
 */
export const parseMeditation = (raw: string): MeditationSegment[] => {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let data: any;
  try { data = JSON.parse(clean); } catch { return []; }
  const arr = Array.isArray(data) ? data : data?.segments;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((s: any) => ({
      text: String(s?.say ?? s?.text ?? '').trim(),
      pauseMs: clampPause(Number(s?.pause ?? s?.pauseSec ?? 6)),
    }))
    .filter((s: MeditationSegment) => s.text.length > 0);
};

/** A calm, offline meditation — used when AI is unavailable or returns nothing. */
export const buildFallbackMeditation = (
  goal: UserGoal,
  minutes: MeditationLength
): MeditationSegment[] => {
  const base: MeditationSegment[] = [
    { text: 'Find a comfortable position, and gently let your eyes close.', pauseMs: 6000 },
    { text: 'Take a slow breath in through your nose… and a long breath out.', pauseMs: 8000 },
    { text: 'Feel the weight of your body settling, supported and safe.', pauseMs: 7000 },
    { text: 'There is nothing to do right now, and nowhere else to be.', pauseMs: 8000 },
    { text: 'Notice the gentle rhythm of your breath, without changing it.', pauseMs: 9000 },
    { text: 'If your mind wanders, that is okay — softly return to the breath.', pauseMs: 9000 },
    { text: 'With each exhale, let a little more tension melt away.', pauseMs: 9000 },
    { text: 'Rest here, calm and whole, for a few more breaths.', pauseMs: 10000 },
    { text: 'When you are ready, slowly bring your awareness back to the room.', pauseMs: 6000 },
    { text: 'Carry this calm with you. You are grounded, and you are enough.', pauseMs: 4000 },
  ];
  const goalLine: MeditationSegment = {
    text: `Let this be your moment for ${GOAL_FOCUS[goal]}.`,
    pauseMs: 8000,
  };
  const withGoal = [base[0], base[1], goalLine, ...base.slice(2)];
  return withGoal.slice(0, LINES_FOR[minutes]);
};

/**
 * Generate a guided-meditation script via AI, personalised to goal + length +
 * language. Always resolves — falls back to a calm offline script on any failure.
 */
export const generateGuidedMeditation = async (
  goal: UserGoal,
  minutes: MeditationLength,
  language: Language = 'en'
): Promise<MeditationSegment[]> => {
  if (!hasAi()) return buildFallbackMeditation(goal, minutes);

  const lines = LINES_FOR[minutes];
  const prompt = `You are a calm meditation guide. Write a spoken guided meditation of about ${minutes} minutes, focused on ${GOAL_FOCUS[goal]}.
Return ONLY valid JSON: {"segments":[{"say":"a short spoken line","pause":8}, ...]}
Rules:
- About ${lines} short segments. Each "say" is ONE gentle sentence to be read aloud (max ~18 words).
- "pause" is the seconds of silence AFTER the line (breathing room), between 4 and 12.
- Warm, slow, second-person ("you"). No numbers, no markdown, no titles, no headings.
- Write every "say" value in ${languageName(language)}.`;

  try {
    const text = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    });
    const segments = parseMeditation(text);
    return segments.length >= 3 ? segments : buildFallbackMeditation(goal, minutes);
  } catch {
    return buildFallbackMeditation(goal, minutes);
  }
};
