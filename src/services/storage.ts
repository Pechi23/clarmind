import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyContent, MeditationSession, MoodEntry } from '../types';

const KEYS = {
  USER_PROFILE: 'clarmind_user_profile',
  DAILY_CONTENT: 'clarmind_daily_content',
  STREAK: 'clarmind_streak',
  LAST_OPEN: 'clarmind_last_open',
  MEDITATION_SESSIONS: 'clarmind_meditation_sessions',
  MOOD_ENTRIES: 'clarmind_mood_entries',
  NOTIFICATIONS_ENABLED: 'clarmind_notifications_enabled',
  REMINDER_TIME: 'clarmind_reminder_time',
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
};

export const clearUserProfile = async (): Promise<void> => {
  await AsyncStorage.multiRemove(Object.values(KEYS));
};

export const saveDailyContent = async (content: DailyContent): Promise<void> => {
  await AsyncStorage.setItem(KEYS.DAILY_CONTENT, JSON.stringify(content));
};

export const getDailyContent = async (): Promise<DailyContent | null> => {
  const data = await AsyncStorage.getItem(KEYS.DAILY_CONTENT);
  return data ? JSON.parse(data) : null;
};

export const getStreak = async (): Promise<number> => {
  const data = await AsyncStorage.getItem(KEYS.STREAK);
  return data ? parseInt(data, 10) : 0;
};

export const updateStreak = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const lastOpen = await AsyncStorage.getItem(KEYS.LAST_OPEN);
  let streak = await getStreak();

  if (lastOpen) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastOpen === yesterdayStr) {
      streak += 1;
    } else if (lastOpen !== today) {
      streak = 1;
    }
  } else {
    streak = 1;
  }

  await AsyncStorage.setItem(KEYS.STREAK, String(streak));
  await AsyncStorage.setItem(KEYS.LAST_OPEN, today);
  return streak;
};

// Meditation sessions
export const saveMeditationSession = async (session: MeditationSession): Promise<void> => {
  const sessions = await getMeditationSessions();
  sessions.push(session);
  await AsyncStorage.setItem(KEYS.MEDITATION_SESSIONS, JSON.stringify(sessions));
};

export const getMeditationSessions = async (): Promise<MeditationSession[]> => {
  const data = await AsyncStorage.getItem(KEYS.MEDITATION_SESSIONS);
  return data ? JSON.parse(data) : [];
};

export const getTotalMeditationMinutes = async (): Promise<number> => {
  const sessions = await getMeditationSessions();
  return Math.round(sessions.reduce((acc, s) => acc + s.durationMinutes, 0));
};

// Mood entries
export const saveMoodEntry = async (entry: MoodEntry): Promise<void> => {
  const entries = await getMoodEntries();
  entries.push(entry);
  await AsyncStorage.setItem(KEYS.MOOD_ENTRIES, JSON.stringify(entries));
};

export const getMoodEntries = async (): Promise<MoodEntry[]> => {
  const data = await AsyncStorage.getItem(KEYS.MOOD_ENTRIES);
  return data ? JSON.parse(data) : [];
};

// Notifications
export const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(KEYS.NOTIFICATIONS_ENABLED, String(enabled));
};

export const getNotificationsEnabled = async (): Promise<boolean> => {
  const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS_ENABLED);
  return data === 'true';
};
