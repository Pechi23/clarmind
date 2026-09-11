// expo-speech wrapper that resolves and caches a natural female voice per locale.
// The pure selection logic lives in voiceSelect.ts (unit-tested); this file just
// enumerates the device voices once and speaks with the chosen identifier.
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { chooseVoice, VoiceLike } from './voiceSelect';
import { getVoiceGender } from './storage';
import { synthesizeGemini } from './tts';
import { wavDataUri } from './wav';

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
let cloudSound: Audio.Sound | null = null;
let gen = 0; // bumped on every stop/new speak so stale in-flight synths are discarded

/** Stop any speech (cloud audio or on-device) and invalidate in-flight requests. */
export const stopSpeaking = async (): Promise<void> => {
  gen++;
  Speech.stop();
  const s = cloudSound;
  cloudSound = null;
  if (s) { try { await s.stopAsync(); } catch {} try { await s.unloadAsync(); } catch {} }
};

const speakOnDevice = async (text: string, locale: string, opts: SpeakOptions) => {
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

/**
 * Speak text. Prefers Gemini neural TTS (natural, Siri-like) and falls back to
 * the on-device voice when cloud TTS is unavailable or fails.
 */
export const speakCalm = async (text: string, locale: string, opts: SpeakOptions = {}): Promise<void> => {
  await stopSpeaking();
  const my = gen; // this request's generation; if it changes, we were superseded
  try {
    const audio = await synthesizeGemini(text);
    if (my !== gen) return; // a newer speak/stop happened while we were fetching
    if (audio) {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: wavDataUri(audio.base64, audio.rate) },
        { shouldPlay: true }
      );
      if (my !== gen) { sound.unloadAsync().catch(() => {}); return; } // superseded during load
      cloudSound = sound;
      sound.setOnPlaybackStatusUpdate((st: any) => {
        if (st?.isLoaded && st.didJustFinish) {
          if (cloudSound === sound) cloudSound = null;
          sound.unloadAsync().catch(() => {});
          opts.onDone?.();
        }
      });
      return;
    }
  } catch {
    if (my !== gen) return;
    // fall through to on-device
  }
  if (my !== gen) return;
  await speakOnDevice(text, locale, opts);
};
