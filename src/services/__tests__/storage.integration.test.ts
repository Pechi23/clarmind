import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveUserProfile, getUserProfile, clearUserProfile,
  saveMeditationSession, getMeditationSessions, getTotalMeditationMinutes,
  saveMoodEntry, getMoodEntries,
  updateStreak, getStreak, getShields,
  getReminderTime, setReminderTime,
  getChatHistory, saveChatHistory, clearChatHistory,
  getClaraCount, incrementClaraCount,
  getLastRecapWeek, setLastRecapWeek,
} from '../storage';
import { UserProfile, MeditationSession } from '../../types';

const profile: UserProfile = {
  name: 'Ana', zodiacSign: 'Pisces', goal: 'stress', onboardingComplete: true,
};

const session = (date: string, minutes: number): MeditationSession => ({
  date, durationMinutes: minutes, pattern: 'box', completedAt: `${date}T10:00:00Z`, soundscape: 'rain',
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('user profile', () => {
  it('round-trips a saved profile', async () => {
    await saveUserProfile(profile);
    expect(await getUserProfile()).toEqual(profile);
  });

  it('returns null when nothing saved', async () => {
    expect(await getUserProfile()).toBeNull();
  });

  it('clearUserProfile wipes all clarmind_* keys', async () => {
    await saveUserProfile(profile);
    await saveMeditationSession(session('2026-06-27', 10));
    await incrementClaraCount();
    await clearUserProfile();
    expect(await getUserProfile()).toBeNull();
    expect(await getMeditationSessions()).toEqual([]);
    expect(await getClaraCount()).toBe(0);
  });
});

describe('meditation sessions', () => {
  it('accumulates sessions and total minutes', async () => {
    await saveMeditationSession(session('2026-06-25', 5));
    await saveMeditationSession(session('2026-06-26', 10));
    expect((await getMeditationSessions())).toHaveLength(2);
    expect(await getTotalMeditationMinutes()).toBe(15);
  });
});

describe('mood entries', () => {
  it('stores mood check-ins', async () => {
    await saveMoodEntry({ date: '2026-06-27T10:00:00Z', mood: 4, context: 'post-session' });
    const entries = await getMoodEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].mood).toBe(4);
  });
});

describe('updateStreak persistence', () => {
  it('starts at 1 on first ever open', async () => {
    const r = await updateStreak();
    expect(r.streak).toBe(1);
    expect(await getStreak()).toBe(1);
  });

  it('is idempotent on the same day', async () => {
    await updateStreak();
    const second = await updateStreak();
    expect(second.streak).toBe(1); // same calendar day, no increment
  });

  it('persists shields earned at a milestone', async () => {
    // Seed a 6-day streak with yesterday as last open, then open "today".
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    await AsyncStorage.setItem('clarmind_streak', '6');
    await AsyncStorage.setItem('clarmind_last_open', yesterday);
    const r = await updateStreak();
    expect(r.streak).toBe(7);
    expect(r.shieldEarned).toBe(true);
    expect(await getShields()).toBe(1);
    expect(await AsyncStorage.getItem('clarmind_last_open')).toBe(today);
  });
});

describe('reminder time', () => {
  it('defaults to 09:00 and round-trips a custom time', async () => {
    expect(await getReminderTime()).toEqual({ hour: 9, minute: 0 });
    await setReminderTime({ hour: 21, minute: 30 });
    expect(await getReminderTime()).toEqual({ hour: 21, minute: 30 });
  });
});

describe('chat history', () => {
  it('round-trips and caps at 40 messages', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      text: `msg ${i}`,
      at: '2026-06-27T10:00:00Z',
    }));
    await saveChatHistory(many);
    const stored = await getChatHistory();
    expect(stored).toHaveLength(40);
    expect(stored[stored.length - 1].text).toBe('msg 49'); // keeps the newest
  });

  it('clears history', async () => {
    await saveChatHistory([{ role: 'user', text: 'hi', at: '2026-06-27T10:00:00Z' }]);
    await clearChatHistory();
    expect(await getChatHistory()).toEqual([]);
  });
});

describe('Clara daily count', () => {
  it('increments and resets by date', async () => {
    expect(await getClaraCount()).toBe(0);
    await incrementClaraCount();
    await incrementClaraCount();
    expect(await getClaraCount()).toBe(2);

    // Simulate a stale (yesterday) counter -> resets to 0 today.
    await AsyncStorage.setItem('clarmind_clara_count', JSON.stringify({ date: '2000-01-01', count: 99 }));
    expect(await getClaraCount()).toBe(0);
  });
});

describe('weekly recap week key', () => {
  it('round-trips the last shown week', async () => {
    expect(await getLastRecapWeek()).toBeNull();
    await setLastRecapWeek('2026-06-22');
    expect(await getLastRecapWeek()).toBe('2026-06-22');
  });
});
