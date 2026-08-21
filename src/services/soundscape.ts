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

let currentSound: Audio.Sound | null = null;

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

export const setSoundscapeVolume = async (vol: number): Promise<void> => {
  if (currentSound) {
    try { await currentSound.setVolumeAsync(vol); } catch {}
  }
};
