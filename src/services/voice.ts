// expo-speech wrapper that resolves and caches a natural female voice per locale.
// The pure selection logic lives in voiceSelect.ts (unit-tested); this file just
// enumerates the device voices once and speaks with the chosen identifier.
import * as Speech from 'expo-speech';
import { chooseVoice, VoiceLike } from './voiceSelect';

const cache: Record<string, string | undefined> = {};
let voicesPromise: Promise<Speech.Voice[]> | null = null;

/** Resolve the best female voice identifier for a locale (cached). */
export const getFemaleVoiceId = async (locale: string): Promise<string | undefined> => {
  if (locale in cache) return cache[locale];
  try {
    if (!voicesPromise) voicesPromise = Speech.getAvailableVoicesAsync();
    const voices = (await voicesPromise) as unknown as VoiceLike[];
    const id = chooseVoice(voices, locale);
    cache[locale] = id;
    return id;
  } catch {
    cache[locale] = undefined;
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
  const voice = await getFemaleVoiceId(locale);
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
