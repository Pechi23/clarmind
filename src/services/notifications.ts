import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getStreak } from './storage';
import { getXp } from './gamification';
import { getLevelForXp } from '../constants/achievements';
import { translate } from '../i18n';
import { rankName } from '../constants/localize';

const CHANNEL_ID = 'clarmind-daily';

// expo-notifications is native-only; setting a handler on web logs warnings.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false; // notifications not supported via expo-notifications on web
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }

  if (Platform.OS === 'android' && final === 'granted') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: translate('notifications.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      lightColor: '#a78bfa',
    });
  }

  return final === 'granted';
};

// Build a localized reminder body. Reschedule on each app open (see
// AppNavigator) so it rotates and follows the current language, since the DAILY
// trigger otherwise repeats one fixed sentence forever.
const buildPersonalizedMessage = async (): Promise<string> => {
  const [streak, xp] = await Promise.all([getStreak(), getXp()]);
  const rank = rankName(getLevelForXp(xp).level, translate);
  const personalized = [
    streak >= 2 ? translate('notifications.streakNext', { next: streak + 1, rank }) : null,
    streak >= 2 ? translate('notifications.streakSave', { streak }) : null,
    translate('notifications.newStar', { rank }),
  ].filter(Boolean) as string[];
  const generic = [0, 1, 2, 3, 4].map((i) => translate(`notifications.generic.${i}`));
  const pool = [...personalized, ...generic];
  return pool[Math.floor(Math.random() * pool.length)];
};

export const scheduleDailyReminder = async (hour = 9, minute = 0): Promise<void> => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const message = await buildPersonalizedMessage();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Stillnova',
      body: message,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID, // Android: land in our channel, not "Miscellaneous"
    } as Notifications.DailyTriggerInput,
  });
};

export const cancelAllReminders = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};
