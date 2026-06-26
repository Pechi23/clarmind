import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getStreak } from './storage';
import { getXp } from './gamification';
import { getLevelForXp } from '../constants/achievements';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_MESSAGES = [
  '🌙 The stars are aligning for your daily moment of calm.',
  '✨ One breath at a time. Open ClarMind.',
  '🧘 A clear mind awaits. Take 5 minutes for yourself.',
  '🌬️ Ready to breathe? Your daily reset is here.',
  '🌌 Pause. Reset. Bloom. Your daily ClarMind is ready.',
];

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false; // notifications not supported via expo-notifications on web
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }

  if (Platform.OS === 'android' && final === 'granted') {
    await Notifications.setNotificationChannelAsync('clarmind-daily', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      lightColor: '#a78bfa',
    });
  }

  return final === 'granted';
};

const buildPersonalizedMessage = async (): Promise<string> => {
  const [streak, xp] = await Promise.all([getStreak(), getXp()]);
  const { rank } = getLevelForXp(xp);
  const personalized = [
    streak >= 2 ? `🔥 Day ${streak + 1} is waiting, ${rank}. Keep the flame alive.` : null,
    streak >= 2 ? `🛡️ Don't let your ${streak}-day streak fade — two mindful minutes is all it takes.` : null,
    `🌌 A new star is waiting in your sky, ${rank}.`,
  ].filter(Boolean) as string[];
  const pool = [...personalized, ...REMINDER_MESSAGES];
  return pool[Math.floor(Math.random() * pool.length)];
};

export const scheduleDailyReminder = async (hour = 9, minute = 0): Promise<void> => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const message = await buildPersonalizedMessage();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ClarMind',
      body: message,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as Notifications.DailyTriggerInput,
  });
};

export const cancelAllReminders = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};
