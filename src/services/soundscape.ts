// Soundscape player using expo-av
// Uses free CC0 / public-domain ambient loops hosted on a CDN.
// Replace with your own bundled assets (require('../../assets/sounds/rain.mp3')) for offline support.
import { Audio } from 'expo-av';

export interface Soundscape {
  id: string;
  name: string;
  emoji: string;
  url: string;
}

export const SOUNDSCAPES: Soundscape[] = [
  { id: 'silence', name: 'Silence',     emoji: '🤫', url: '' },
  { id: 'rain',    name: 'Gentle Rain', emoji: '🌧️', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2c9a6b4b29.mp3' },
  { id: 'forest',  name: 'Forest',      emoji: '🌲', url: 'https://cdn.pixabay.com/audio/2024/05/23/audio_8b5dc6f1e0.mp3' },
  { id: 'ocean',   name: 'Ocean Waves', emoji: '🌊', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8497b1d057.mp3' },
  { id: 'space',   name: 'Deep Space',  emoji: '🌌', url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_b8a3c1bf6e.mp3' },
];

let currentSound: Audio.Sound | null = null;

export const playSoundscape = async (soundscape: Soundscape): Promise<void> => {
  await stopSoundscape();
  if (!soundscape.url) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const { sound } = await Audio.Sound.createAsync(
      { uri: soundscape.url },
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
