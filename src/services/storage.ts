import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyContent } from '../types';

const KEYS = {
  USER_PROFILE: 'clarmind_user_profile',
  DAILY_CONTENT: 'clarmind_daily_content',
  STREAK: 'clarmind_streak',
  LAST_OPEN: 'clarmind_last_open',
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
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
