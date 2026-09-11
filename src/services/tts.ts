// Cloud neural TTS via Gemini (much more natural than on-device voices).
// Goes through the same proxy as text (EXPO_PUBLIC_AI_PROXY_URL) with ?mode=tts,
// so the key never ships in the app. Returns base64 PCM + sample rate, or null
// (not configured, no access, or a network error) so callers fall back to
// on-device speech.
import { getVoiceGender } from './storage';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL;
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

// Gemini prebuilt voices. Kore = warm female, Charon = calm male.
const VOICE_NAME: Record<'female' | 'male', string> = { female: 'Kore', male: 'Charon' };

export const ttsAvailable = (): boolean => !!(PROXY_URL || API_KEY);

export interface TtsAudio { base64: string; rate: number; }

export const synthesizeGemini = async (text: string): Promise<TtsAudio | null> => {
  if (!ttsAvailable() || !text.trim()) return null;
  const gender = await getVoiceGender();
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME[gender] } } },
    },
  };
  const url = PROXY_URL
    ? `${PROXY_URL}${PROXY_URL.includes('?') ? '&' : '?'}mode=tts`
    : `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find((p: any) => p?.inlineData?.data)?.inlineData;
    if (!inline?.data) return null;
    const m = /rate=(\d+)/.exec(inline.mimeType ?? '');
    return { base64: inline.data, rate: m ? parseInt(m[1], 10) : 24000 };
  } catch {
    return null;
  }
};
