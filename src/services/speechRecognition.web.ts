// Web fallback for expo-speech-recognition (native-only) using the browser's
// Web Speech API (Chrome/Edge). Mirrors the small slice of the native API that
// ClaraScreen uses: ExpoSpeechRecognitionModule.{requestPermissionsAsync,start,stop}
// and useSpeechRecognitionEvent('result'|'end'|'error', cb).
import { useEffect } from 'react';

type Listener = (e: any) => void;
const listeners: Record<string, Set<Listener>> = {
  result: new Set(),
  end: new Set(),
  error: new Set(),
};
const emit = (event: string, payload: any) => listeners[event]?.forEach((l) => l(payload));

const SR: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

let recognition: any = null;

export const speechRecognitionAvailable = !!SR;

export const ExpoSpeechRecognitionModule = {
  async requestPermissionsAsync() {
    // The browser prompts for the mic when start() is called; report capability here.
    return { granted: !!SR };
  },
  start(opts: { lang?: string; interimResults?: boolean; continuous?: boolean } = {}) {
    if (!SR) { emit('error', { error: 'not-available' }); return; }
    try {
      recognition = new SR();
      recognition.lang = opts.lang ?? 'en-US';
      recognition.interimResults = opts.interimResults ?? true;
      recognition.continuous = opts.continuous ?? false;
      recognition.onresult = (ev: any) => {
        const transcript = Array.from(ev.results as ArrayLike<any>)
          .map((r: any) => r[0]?.transcript ?? '')
          .join('');
        emit('result', { results: [{ transcript }] });
      };
      recognition.onend = () => emit('end', {});
      recognition.onerror = (ev: any) => emit('error', { error: ev.error });
      recognition.start();
    } catch (e: any) {
      emit('error', { error: String(e) });
    }
  },
  stop() {
    try { recognition?.stop(); } catch {}
  },
};

export function useSpeechRecognitionEvent(event: string, cb: Listener) {
  // No dep array on purpose: re-subscribe each render so cb never goes stale.
  useEffect(() => {
    const set = listeners[event];
    if (!set) return;
    set.add(cb);
    return () => { set.delete(cb); };
  });
}
