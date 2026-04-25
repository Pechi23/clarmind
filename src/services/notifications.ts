import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

export const scheduleDailyReminder = async (hour = 9, minute = 0): Promise<void> => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const message = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];

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
