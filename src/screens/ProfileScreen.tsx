import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { ZODIAC_SIGNS } from '../constants/zodiac';
import { UserProfile } from '../types';
import {
  getStreak, getTotalMeditationMinutes, getMeditationSessions,
  clearUserProfile, setNotificationsEnabled, getNotificationsEnabled,
  getReminderTime, setReminderTime, ReminderTime,
} from '../services/storage';
import GradientCard from '../components/GradientCard';
import {
  requestNotificationPermissions, scheduleDailyReminder, cancelAllReminders,
} from '../services/notifications';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { MeditationSession } from '../types';
import { getXp, getUnlockedAchievements } from '../services/gamification';
import { ACHIEVEMENTS, getLevelForXp } from '../constants/achievements';
import { useI18n } from '../i18n';
import { signName, elementName, achievementName, achievementDesc, rankName } from '../constants/localize';

interface Props {
  profile: UserProfile;
  onReset: () => void;
}

export default function ProfileScreen({ profile, onReset }: Props) {
  const { t, language, setLanguage } = useI18n();
  const [streak, setStreak] = useState(0);
  const [totalMin, setTotalMin] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [notifs, setNotifs] = useState(false);
  const [allSessions, setAllSessions] = useState<MeditationSession[]>([]);
  const [xp, setXp] = useState(0);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [reminderTime, setReminderTimeState] = useState<ReminderTime>({ hour: 9, minute: 0 });

  const REMINDER_PRESETS: ReminderTime[] = [
    { hour: 7, minute: 0 },
    { hour: 9, minute: 0 },
    { hour: 12, minute: 30 },
    { hour: 18, minute: 0 },
    { hour: 21, minute: 30 },
  ];

  const formatTime = (rt: ReminderTime) =>
    `${String(rt.hour).padStart(2, '0')}:${String(rt.minute).padStart(2, '0')}`;

  const zodiacInfo = ZODIAC_SIGNS.find((z) => z.name === profile.zodiacSign)!;

  const load = useCallback(async () => {
    const [s, m, sess, n, totalXp, unlocked, rTime] = await Promise.all([
      getStreak(),
      getTotalMeditationMinutes(),
      getMeditationSessions(),
      getNotificationsEnabled(),
      getXp(),
      getUnlockedAchievements(),
      getReminderTime(),
    ]);
    setStreak(s);
    setTotalMin(m);
    setSessions(sess.length);
    setAllSessions(sess);
    setNotifs(n);
    setXp(totalXp);
    setUnlockedIds(unlocked);
    setReminderTimeState(rTime);
  }, []);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const levelInfo = getLevelForXp(xp);
  const levelProgress = Math.min(
    1,
    (xp - levelInfo.currentLevelXp) / Math.max(1, levelInfo.nextLevelXp - levelInfo.currentLevelXp)
  );

  const handleReset = () => {
    Alert.alert(
      t('profile.resetTitle'),
      t('profile.resetMessage'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.reset'),
          style: 'destructive',
          onPress: async () => {
            await clearUserProfile();
            onReset();
          },
        },
      ]
    );
  };

  const toggleNotifs = async (v: boolean) => {
    if (v) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(t('profile.permissionTitle'), t('profile.permissionMsg'));
        return;
      }
      await scheduleDailyReminder(reminderTime.hour, reminderTime.minute);
    } else {
      await cancelAllReminders();
    }
    setNotifs(v);
    await setNotificationsEnabled(v);
  };

  const pickReminderTime = async (rt: ReminderTime) => {
    setReminderTimeState(rt);
    await setReminderTime(rt);
    if (notifs) {
      await scheduleDailyReminder(rt.hour, rt.minute);
    }
  };

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{t('profile.kicker')}</Text>

        {/* Header card */}
        <LinearGradient
          colors={[zodiacInfo.color + '33', zodiacInfo.color + '0a']}
          style={styles.headerCard}
        >
          <View style={[styles.bigAvatar, { borderColor: zodiacInfo.color }]}>
            <Text style={styles.bigAvatarEmoji}>{zodiacInfo.emoji}</Text>
          </View>
          <Text style={styles.headerName}>{profile.name}</Text>
          <Text style={[styles.headerZodiac, { color: zodiacInfo.color }]}>
            {signName(zodiacInfo, language)} · {elementName(zodiacInfo.element, t)}
          </Text>
          <Text style={styles.headerDate}>{zodiacInfo.dateRange}</Text>
        </LinearGradient>

        {/* Level & XP */}
        <GradientCard colors={['rgba(167,139,250,0.2)', 'rgba(124,58,237,0.06)']} style={{ marginBottom: SPACING.lg }}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelRank}>{rankName(levelInfo.level, t)}</Text>
              <Text style={styles.levelNumber}>{t('profile.level', { n: levelInfo.level })}</Text>
            </View>
            <Text style={styles.levelXp}>{t('profile.xp', { xp })}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(levelProgress * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {t('profile.toNextLevel', { xp: levelInfo.nextLevelXp - xp })}
          </Text>
        </GradientCard>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <GradientCard style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>{t('profile.dayStreak')}</Text>
          </GradientCard>
          <GradientCard style={styles.statCard}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={styles.statValue}>{totalMin}</Text>
            <Text style={styles.statLabel}>{t('profile.minutesStat')}</Text>
          </GradientCard>
          <GradientCard style={styles.statCard}>
            <Text style={styles.statEmoji}>✨</Text>
            <Text style={styles.statValue}>{sessions}</Text>
            <Text style={styles.statLabel}>{t('profile.sessions')}</Text>
          </GradientCard>
        </View>

        {/* Achievements */}
        <Text style={styles.sectionLabel}>
          {t('profile.achievements')} · {unlockedIds.length}/{ACHIEVEMENTS.length}
        </Text>
        <View style={styles.badgeGrid}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.includes(a.id);
            return (
              <View key={a.id} style={[styles.badgeCell, !unlocked && styles.badgeCellLocked]}>
                <Text style={[styles.badgeEmoji, !unlocked && styles.badgeEmojiLocked]}>
                  {unlocked ? a.emoji : '🔒'}
                </Text>
                <Text style={[styles.badgeName, !unlocked && styles.badgeNameLocked]} numberOfLines={1}>
                  {achievementName(a.id, t)}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {achievementDesc(a.id, t)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Activity heatmap */}
        <Text style={styles.sectionLabel}>{t('profile.last30')}</Text>
        <View style={styles.heatmapWrap}>
          <ActivityHeatmap sessions={allSessions} />
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>{t('profile.settings')}</Text>

        {/* Language */}
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>{t('profile.language')}</Text>
          </View>
          <View style={styles.langToggle}>
            {(['en', 'ro'] as const).map((lng) => (
              <TouchableOpacity
                key={lng}
                onPress={() => setLanguage(lng)}
                style={[styles.langChip, language === lng && styles.langChipActive]}
              >
                <Text style={[styles.langChipText, language === lng && styles.langChipTextActive]}>
                  {lng === 'en' ? 'EN' : 'RO'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>{t('profile.dailyReminder')}</Text>
            <Text style={styles.settingSub}>{t('profile.reminderSub')}</Text>
          </View>
          <Switch
            value={notifs}
            onValueChange={toggleNotifs}
            trackColor={{ false: '#3a3a5e', true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>

        {notifs && (
          <View style={styles.reminderTimeWrap}>
            <Text style={styles.reminderTimeLabel}>{t('profile.remindAt')}</Text>
            <View style={styles.timeChipRow}>
              {REMINDER_PRESETS.map((rt) => {
                const selected = rt.hour === reminderTime.hour && rt.minute === reminderTime.minute;
                return (
                  <TouchableOpacity
                    key={formatTime(rt)}
                    onPress={() => pickReminderTime(rt)}
                    activeOpacity={0.85}
                    style={[styles.timeChip, selected && styles.timeChipSelected]}
                  >
                    <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                      {formatTime(rt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Reset */}
        <TouchableOpacity onPress={handleReset} activeOpacity={0.85} style={styles.resetButton}>
          <Text style={styles.resetText}>{t('profile.reset')}</Text>
        </TouchableOpacity>

        <Text style={styles.appVersion}>ClarMind · v1.4.0</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingTop: 70, paddingBottom: 100 },
  kicker: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary,
    letterSpacing: 3, marginBottom: SPACING.md,
  },
  headerCard: {
    alignItems: 'center', borderRadius: RADIUS.lg,
    padding: SPACING.xl, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  bigAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  bigAvatarEmoji: { fontSize: 38 },
  headerName: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, marginBottom: 4 },
  headerZodiac: { fontFamily: FONTS.semiBold, fontSize: 15, marginBottom: 4 },
  headerDate: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textDim },
  statsGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  statCard: { flex: 1, alignItems: 'center' },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statValue: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim },
  sectionLabel: {
    fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.sm,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  settingTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  settingSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textDim, marginTop: 2 },
  langToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.full, padding: 3, gap: 2,
  },
  langChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full },
  langChipActive: { backgroundColor: 'rgba(167,139,250,0.25)' },
  langChipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textMuted },
  langChipTextActive: { color: COLORS.primaryLight },
  reminderTimeWrap: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: -SPACING.sm, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  reminderTimeLabel: {
    fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.sm,
  },
  timeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  timeChipSelected: {
    backgroundColor: 'rgba(167,139,250,0.2)', borderColor: COLORS.primary,
  },
  timeChipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textMuted },
  timeChipTextSelected: { color: COLORS.primaryLight },
  resetButton: {
    backgroundColor: 'rgba(253,164,175,0.1)', borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(253,164,175,0.25)',
  },
  resetText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.accentWarm },
  levelHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: SPACING.md,
  },
  levelRank: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
  levelNumber: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primaryLight, marginTop: 2 },
  levelXp: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  progressTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%', borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  progressLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  badgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  badgeCell: {
    width: '31%', flexGrow: 1,
    backgroundColor: 'rgba(252,211,77,0.08)',
    borderWidth: 1, borderColor: 'rgba(252,211,77,0.25)',
    borderRadius: RADIUS.md, padding: SPACING.sm,
    alignItems: 'center', gap: 2,
  },
  badgeCellLocked: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.07)',
  },
  badgeEmoji: { fontSize: 24 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeName: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.text, textAlign: 'center' },
  badgeNameLocked: { color: COLORS.textDim },
  badgeDesc: {
    fontFamily: FONTS.regular, fontSize: 9, color: COLORS.textDim,
    textAlign: 'center', lineHeight: 12,
  },
  heatmapWrap: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  appVersion: {
    textAlign: 'center', fontFamily: FONTS.regular, fontSize: 11,
    color: COLORS.textDim, marginTop: SPACING.xl,
  },
});
