// Voice/text mood check-in — the brainstorm's "emotion scanner", done sensibly:
// the user says (or types) how they feel, Gemini infers a 1–5 mood, replies warmly,
// and suggests a breathing pattern. (No fragile voice-emotion ML; speech→text→AI.)
import { Language, languageName } from '../i18n/languages';
import { BreathingPatternId } from '../types';
import { callGemini, hasAi } from './ai';

export interface MoodScan {
  mood: number;                     // 1 (anxious) .. 5 (calm)
  reply: string;                    // one warm empathetic sentence ('' = fallback)
  pattern: BreathingPatternId | ''; // suggested breathing pattern, or '' if none
}

const VALID: BreathingPatternId[] = ['box', '478', 'deepCalm'];

/** Parse the model's JSON defensively (pure). */
export const parseMoodResponse = (raw: string): MoodScan => {
  const clean = String(raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let d: any = {};
  try { d = JSON.parse(clean); } catch {}
  const n = Number(d?.mood);
  const mood = Math.min(5, Math.max(1, Math.round(Number.isFinite(n) ? n : 3)));
  const reply = typeof d?.reply === 'string' ? d.reply.trim() : '';
  const pattern = VALID.includes(d?.pattern) ? (d.pattern as BreathingPatternId) : '';
  return { mood, reply, pattern };
};

/** Analyze how the user feels. Always resolves; a blank reply means "use fallback". */
export const analyzeMood = async (text: string, language: Language = 'en'): Promise<MoodScan> => {
  const fallback: MoodScan = { mood: 3, reply: '', pattern: '' };
  if (!text.trim() || !hasAi()) return fallback;
  const prompt =
    `A person describes how they feel: "${text.trim()}". ` +
    `Reply ONLY with JSON: {"mood": <1-5, 1=anxious/tense, 5=calm/content>, ` +
    `"reply": "one warm, empathetic sentence in ${languageName(language)}", ` +
    `"pattern": "box" | "478" | "deepCalm"} — recommend 478 for stress or trouble sleeping, ` +
    `deepCalm for relaxation, box for focus. No extra text.`;
  try {
    const raw = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.6 },
    });
    const r = parseMoodResponse(raw);
    return r.reply ? r : fallback;
  } catch {
    return fallback;
  }
};
