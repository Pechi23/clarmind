import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyContent, MeditationSession, MoodEntry, StreakResult } from '../types';
import { computeStreakUpdate } from './streakLogic';

const KEYS = {
  USER_PROFILE: 'clarmind_user_profile',
  DAILY_CONTENT: 'clarmind_daily_content',
  STREAK: 'clarmind_streak',
  LAST_OPEN: 'clarmind_last_open',
  MEDITATION_SESSIONS: 'clarmind_meditation_sessions',
  MOOD_ENTRIES: 'clarmind_mood_entries',
  NOTIFICATIONS_ENABLED: 'clarmind_notifications_enabled',
  REMINDER_TIME: 'clarmind_reminder_time',
  SHIELDS: 'clarmind_shields',
  LAST_RECAP_WEEK: 'clarmind_last_recap_week',
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
};

export const clearUserProfile = async (): Promise<void> => {
  // Wipe everything ClarMind stored, including gamification keys owned by other modules
  const allKeys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(allKeys.filter((k) => k.startsWith('clarmind_')));
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

export const getShields = async (): Promise<number> => {
  const v = await AsyncStorage.getItem(KEYS.SHIELDS);
  return v ? parseInt(v, 10) : 0;
};

/**
 * Daily streak update with Stardust Shields. Reads current state, delegates the
 * math to the pure `computeStreakUpdate`, persists the result.
 */
export const updateStreak = async (): Promise<StreakResult> => {
  const today = new Date().toISOString().split('T')[0];
  const [lastOpen, prevStreak, prevShields] = await Promise.all([
    AsyncStorage.getItem(KEYS.LAST_OPEN),
    getStreak(),
    getShields(),
  ]);

  const result = computeStreakUpdate({ prevStreak, prevShields, lastOpen, today });

  await AsyncStorage.setItem(KEYS.STREAK, String(result.streak));
  await AsyncStorage.setItem(KEYS.SHIELDS, String(result.shields));
  await AsyncStorage.setItem(KEYS.LAST_OPEN, today);
  return result;
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
export interface ReminderTime { hour: number; minute: number }

export const setReminderTime = async (time: ReminderTime): Promise<void> => {
  await AsyncStorage.setItem(KEYS.REMINDER_TIME, JSON.stringify(time));
};

export const getReminderTime = async (): Promise<ReminderTime> => {
  const v = await AsyncStorage.getItem(KEYS.REMINDER_TIME);
  return v ? JSON.parse(v) : { hour: 9, minute: 0 };
};

export const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(KEYS.NOTIFICATIONS_ENABLED, String(enabled));
};

export const getNotificationsEnabled = async (): Promise<boolean> => {
  const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS_ENABLED);
  return data === 'true';
};

// Weekly recap — remember which week's recap we've already shown
export const getLastRecapWeek = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.LAST_RECAP_WEEK);
};

export const setLastRecapWeek = async (weekKey: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.LAST_RECAP_WEEK, weekKey);
};
