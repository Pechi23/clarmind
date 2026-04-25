import React, { useEffect, useState, useCallback } from 'react';
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
} from '../services/storage';
import GradientCard from '../components/GradientCard';
import {
  requestNotificationPermissions, scheduleDailyReminder, cancelAllReminders,
} from '../services/notifications';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { MeditationSession } from '../types';

interface Props {
  profile: UserProfile;
  onReset: () => void;
}

export default function ProfileScreen({ profile, onReset }: Props) {
  const [streak, setStreak] = useState(0);
  const [totalMin, setTotalMin] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [notifs, setNotifs] = useState(false);
  const [allSessions, setAllSessions] = useState<MeditationSession[]>([]);

  const zodiacInfo = ZODIAC_SIGNS.find((z) => z.name === profile.zodiacSign)!;

  const load = useCallback(async () => {
    const [s, m, sess, n] = await Promise.all([
      getStreak(),
      getTotalMeditationMinutes(),
      getMeditationSessions(),
      getNotificationsEnabled(),
    ]);
    setStreak(s);
    setTotalMin(m);
    setSessions(sess.length);
    setAllSessions(sess);
    setNotifs(n);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = () => {
    Alert.alert(
      'Reset everything?',
      'This will erase your profile, streak and all meditation history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
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
        Alert.alert('Permission needed', 'Please enable notifications in your device settings to receive daily reminders.');
        return;
      }
      await scheduleDailyReminder(9, 0);
    } else {
      await cancelAllReminders();
    }
    setNotifs(v);
    await setNotificationsEnabled(v);
  };

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>PROFILE</Text>

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
            {zodiacInfo.romanian} · {zodiacInfo.element}
          </Text>
          <Text style={styles.headerDate}>{zodiacInfo.dateRange}</Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <GradientCard style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>day streak</Text>
          </GradientCard>
          <GradientCard style={styles.statCard}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={styles.statValue}>{totalMin}</Text>
            <Text style={styles.statLabel}>minutes</Text>
          </GradientCard>
          <GradientCard style={styles.statCard}>
            <Text style={styles.statEmoji}>✨</Text>
            <Text style={styles.statValue}>{sessions}</Text>
            <Text style={styles.statLabel}>sessions</Text>
          </GradientCard>
        </View>

        {/* Activity heatmap */}
        <Text style={styles.sectionLabel}>Last 30 days</Text>
        <View style={styles.heatmapWrap}>
          <ActivityHeatmap sessions={allSessions} />
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>Settings</Text>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Daily reminder</Text>
            <Text style={styles.settingSub}>Notify me to take a mindful moment</Text>
          </View>
          <Switch
            value={notifs}
            onValueChange={toggleNotifs}
            trackColor={{ false: '#3a3a5e', true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Reset */}
        <TouchableOpacity onPress={handleReset} activeOpacity={0.85} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset onboarding</Text>
        </TouchableOpacity>

        <Text style={styles.appVersion}>ClarMind · v1.0.0</Text>
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
  resetButton: {
    backgroundColor: 'rgba(253,164,175,0.1)', borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(253,164,175,0.25)',
  },
  resetText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.accentWarm },
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
