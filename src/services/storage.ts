import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile, DailyContent, MeditationSession, MoodEntry, StreakResult, ChatMessage,
  ReflectionEntry, CourseProgress,
} from '../types';
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
  CHAT_HISTORY: 'clarmind_chat_history',
  CLARA_COUNT: 'clarmind_clara_count', // { date, count }
  LANGUAGE: 'clarmind_language',
  REFLECTIONS: 'clarmind_reflections',
  COURSE_PROGRESS: 'clarmind_course_progress',
  GUIDE_SEEN: 'clarmind_guide_seen',
  CLARA_FAB_POS: 'clarmind_clara_fab_pos',
};

const CHAT_HISTORY_CAP = 40; // keep the most recent messages only

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
};

/** Merge birth details into the saved profile (for numerology). */
export const saveBirthDetails = async (birth: UserProfile['birth']): Promise<UserProfile | null> => {
  const profile = await getUserProfile();
  if (!profile) return null;
  const updated = { ...profile, birth };
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updated));
  return updated;
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

// Evening reflections
export const getReflections = async (): Promise<ReflectionEntry[]> => {
  const data = await AsyncStorage.getItem(KEYS.REFLECTIONS);
  return data ? JSON.parse(data) : [];
};

export const getReflectionForDate = async (date: string): Promise<ReflectionEntry | null> => {
  const all = await getReflections();
  return all.find((r) => r.date === date) ?? null;
};

export const saveReflection = async (entry: ReflectionEntry): Promise<void> => {
  const all = await getReflections();
  const idx = all.findIndex((r) => r.date === entry.date);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  await AsyncStorage.setItem(KEYS.REFLECTIONS, JSON.stringify(all.slice(-120)));
};

// Micro-course progress (one active course at a time)
export const getCourseProgress = async (): Promise<CourseProgress | null> => {
  const data = await AsyncStorage.getItem(KEYS.COURSE_PROGRESS);
  return data ? JSON.parse(data) : null;
};

export const startCourse = async (courseId: string): Promise<CourseProgress> => {
  const progress: CourseProgress = {
    courseId,
    startDate: new Date().toISOString().split('T')[0],
    completedDays: [],
  };
  await AsyncStorage.setItem(KEYS.COURSE_PROGRESS, JSON.stringify(progress));
  return progress;
};

export const markCourseDayComplete = async (day: number): Promise<CourseProgress | null> => {
  const progress = await getCourseProgress();
  if (!progress) return null;
  if (!progress.completedDays.includes(day)) progress.completedDays.push(day);
  await AsyncStorage.setItem(KEYS.COURSE_PROGRESS, JSON.stringify(progress));
  return progress;
};

export const leaveCourse = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.COURSE_PROGRESS);
};

// Language preference
export const getLanguage = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.LANGUAGE);
};

export const setLanguage = async (lang: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
};

// First-run guide / tour
export const getGuideSeen = async (): Promise<boolean> => {
  return (await AsyncStorage.getItem(KEYS.GUIDE_SEEN)) === 'true';
};

export const setGuideSeen = async (seen: boolean): Promise<void> => {
  await AsyncStorage.setItem(KEYS.GUIDE_SEEN, String(seen));
};

// Draggable Clara button position (persisted so it stays where the user put it)
export const getClaraFabPos = async (): Promise<{ x: number; y: number } | null> => {
  const raw = await AsyncStorage.getItem(KEYS.CLARA_FAB_POS);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const setClaraFabPos = async (pos: { x: number; y: number }): Promise<void> => {
  await AsyncStorage.setItem(KEYS.CLARA_FAB_POS, JSON.stringify(pos));
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

// Clara chat
export const getChatHistory = async (): Promise<ChatMessage[]> => {
  const data = await AsyncStorage.getItem(KEYS.CHAT_HISTORY);
  return data ? JSON.parse(data) : [];
};

export const saveChatHistory = async (messages: ChatMessage[]): Promise<void> => {
  const trimmed = messages.slice(-CHAT_HISTORY_CAP);
  await AsyncStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(trimmed));
};

export const clearChatHistory = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.CHAT_HISTORY);
};

/** Returns today's Clara message count (resets daily). */
export const getClaraCount = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const raw = await AsyncStorage.getItem(KEYS.CLARA_COUNT);
  if (!raw) return 0;
  const parsed: { date: string; count: number } = JSON.parse(raw);
  return parsed.date === today ? parsed.count : 0;
};

export const incrementClaraCount = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const count = (await getClaraCount()) + 1;
  await AsyncStorage.setItem(KEYS.CLARA_COUNT, JSON.stringify({ date: today, count }));
  return count;
};
