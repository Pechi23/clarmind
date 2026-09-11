// expo-speech wrapper that resolves and caches a natural female voice per locale.
// The pure selection logic lives in voiceSelect.ts (unit-tested); this file just
// enumerates the device voices once and speaks with the chosen identifier.
import * as Speech from 'expo-speech';
import { chooseVoice, VoiceLike } from './voiceSelect';
import { getVoiceGender } from './storage';

const cache: Record<string, string | undefined> = {};
let voicesPromise: Promise<Speech.Voice[]> | null = null;

/** Resolve the best voice identifier for a locale + the user's gender preference (cached). */
export const getVoiceId = async (locale: string): Promise<string | undefined> => {
  const gender = await getVoiceGender();
  const key = `${locale}|${gender}`;
  if (key in cache) return cache[key];
  try {
    if (!voicesPromise) voicesPromise = Speech.getAvailableVoicesAsync();
    const voices = (await voicesPromise) as unknown as VoiceLike[];
    const id = chooseVoice(voices, locale, gender);
    cache[key] = id;
    return id;
  } catch {
    cache[key] = undefined;
    return undefined;
  }
};

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
}

/**
 * Speak with a calm, natural female voice. Pitch defaults to 1.0 (a raised pitch
 * is what makes TTS sound robotic) and rate slightly slow.
 */
export const speakCalm = async (text: string, locale: string, opts: SpeakOptions = {}): Promise<void> => {
  const voice = await getVoiceId(locale);
  Speech.speak(text, {
    language: locale,
    ...(voice ? { voice } : {}),
    rate: opts.rate ?? 0.92,
    pitch: opts.pitch ?? 1.0,
    onDone: opts.onDone,
    onStopped: opts.onStopped,
    onError: opts.onError,
  });
};
