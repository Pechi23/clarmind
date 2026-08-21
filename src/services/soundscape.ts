// Soundscape player using expo-av.
// Ambient loops are generated procedurally and BUNDLED locally (assets/sounds),
// so they play offline and don't depend on any third-party CDN.
// Regenerate with: node scripts/generate-sounds.js
import { Audio } from 'expo-av';

export interface Soundscape {
  id: string;
  name: string;
  emoji: string;
  source: number | null; // require()'d asset module, or null for silence
}

export const SOUNDSCAPES: Soundscape[] = [
  { id: 'silence', name: 'Silence',     emoji: '🤫', source: null },
  { id: 'rain',    name: 'Gentle Rain', emoji: '🌧️', source: require('../../assets/sounds/rain.wav') },
  { id: 'forest',  name: 'Forest',      emoji: '🌲', source: require('../../assets/sounds/forest.wav') },
  { id: 'ocean',   name: 'Ocean Waves', emoji: '🌊', source: require('../../assets/sounds/ocean.wav') },
  { id: 'space',   name: 'Deep Space',  emoji: '🌌', source: require('../../assets/sounds/space.wav') },
];

const BELL_START = require('../../assets/sounds/bell-start.wav');
const BELL_END = require('../../assets/sounds/bell-end.wav');

let currentSound: Audio.Sound | null = null;

/** Plays a one-shot meditation bell that unloads itself when finished. */
export const playChime = async (which: 'start' | 'end'): Promise<void> => {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      which === 'start' ? BELL_START : BELL_END,
      { volume: 0.6, shouldPlay: true }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch {
    // non-fatal
  }
};

export const playSoundscape = async (soundscape: Soundscape): Promise<void> => {
  await stopSoundscape();
  if (soundscape.source == null) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const { sound } = await Audio.Sound.createAsync(
      soundscape.source,
      { isLooping: true, volume: 0.5, shouldPlay: true }
    );
    currentSound = sound;
  } catch (e) {
    // ignore — soundscape failure shouldn't break meditation
    console.warn('Soundscape failed:', e);
  }
};

export const stopSoundscape = async (): Promise<void> => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
  }
};

/** Gently fades the current soundscape to silence over `ms`, then stops it. */
export const fadeOutSoundscape = async (ms = 4000): Promise<void> => {
  const sound = currentSound;
  if (!sound) return;
  const steps = 12;
  const interval = ms / steps;
  try {
    for (let i = steps - 1; i >= 0; i--) {
      await new Promise((r) => setTimeout(r, interval));
      // Guard against the sound being replaced/stopped mid-fade.
      if (currentSound !== sound) return;
      await sound.setVolumeAsync((0.5 * i) / steps).catch(() => {});
    }
  } finally {
    if (currentSound === sound) await stopSoundscape();
  }
};

export const setSoundscapeVolume = async (vol: number): Promise<void> => {
  if (currentSound) {
    try { await currentSound.setVolumeAsync(vol); } catch {}
  }
};
