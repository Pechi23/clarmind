import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Modal, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { getUsageInfo, getPremiumOverride, setPremiumOverride, UsageInfo } from '../services/entitlements';
import { ACHIEVEMENTS, getLevelForXp, AchievementDef } from '../constants/achievements';
import { useI18n, LANGUAGES } from '../i18n';
import { signName, elementName, achievementName, achievementDesc, rankName } from '../constants/localize';
import { useContentBottomPadding } from '../constants/layout';
import ShareCardModal from '../components/ShareCardModal';

interface Props {
  profile: UserProfile;
  onReset: () => void;
}

export default function ProfileScreen({ profile, onReset }: Props) {
  const { t, language, setLanguage } = useI18n();
  const bottomPad = useContentBottomPadding();
  const [streak, setStreak] = useState(0);
  const [totalMin, setTotalMin] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [notifs, setNotifs] = useState(false);
  const [allSessions, setAllSessions] = useState<MeditationSession[]>([]);
  const [xp, setXp] = useState(0);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [reminderTime, setReminderTimeState] = useState<ReminderTime>({ hour: 9, minute: 0 });
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedAch, setSelectedAch] = useState<AchievementDef | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [premium, setPremium] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    setUsage(await getUsageInfo());
    setPremium(await getPremiumOverride());
  }, []);

  const togglePremium = async (v: boolean) => {
    await setPremiumOverride(v);
    setPremium(v);
    setUsage(await getUsageInfo());
  };

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
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.kicker}>{t('profile.kicker')}</Text>
          <TouchableOpacity onPress={() => setSettingsOpen(true)} hitSlop={12} style={styles.gearBtn}>
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

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

        {/* Share progress */}
        <TouchableOpacity onPress={() => setShareOpen(true)} activeOpacity={0.85} style={styles.shareButton}>
          <LinearGradient colors={GRADIENTS.button} style={styles.shareGradient}>
            <Text style={styles.shareButtonText}>📤  {t('share.button')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* AI usage */}
        {usage && (
          <>
            <Text style={styles.sectionLabel}>{t('profile.usageTitle')}</Text>
            <GradientCard colors={['rgba(125,211,252,0.14)', 'rgba(59,130,246,0.05)']} style={{ marginBottom: SPACING.lg }}>
              <View style={styles.usageRow}>
                <Text style={styles.usageValue}>{usage.used}<Text style={styles.usageLimit}> / {usage.limit}</Text></Text>
                <View style={[styles.planPill, usage.premium ? styles.planPremium : styles.planFree]}>
                  <Text style={[styles.planText, usage.premium && { color: '#fcd34d' }]}>
                    {usage.premium ? t('profile.planPremium') : t('profile.planFree')}
                  </Text>
                </View>
              </View>
              <View style={styles.usageTrack}>
                <View style={[styles.usageFill, { width: `${Math.min(100, Math.round((usage.used / usage.limit) * 100))}%` }]} />
              </View>
              <Text style={styles.usageSub}>{t('profile.usageRemaining', { n: usage.remaining })}</Text>
            </GradientCard>
          </>
        )}

        {/* Achievements */}
        <Text style={styles.sectionLabel}>
          {t('profile.achievements')} · {unlockedIds.length}/{ACHIEVEMENTS.length}
        </Text>
        <View style={styles.badgeGrid}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.includes(a.id);
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedAch(a)}
                activeOpacity={0.8}
                style={[styles.badgeCell, !unlocked && styles.badgeCellLocked]}
              >
                <Text style={[styles.badgeEmoji, !unlocked && styles.badgeEmojiLocked]}>
                  {unlocked ? a.emoji : '🔒'}
                </Text>
                <Text style={[styles.badgeName, !unlocked && styles.badgeNameLocked]} numberOfLines={1}>
                  {achievementName(a.id, t)}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {achievementDesc(a.id, t)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Activity heatmap */}
        <Text style={styles.sectionLabel}>{t('profile.last30')}</Text>
        <View style={styles.heatmapWrap}>
          <ActivityHeatmap sessions={allSessions} />
        </View>

        <Text style={styles.appVersion}>ClarMind · v1.6.0</Text>
      </ScrollView>

      {/* Settings — separate screen */}
      <Modal visible={settingsOpen} animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <LinearGradient colors={GRADIENTS.background} style={styles.container}>
          <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={() => setSettingsOpen(false)} hitSlop={12}>
              <Text style={styles.settingsClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>{t('profile.settings')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={styles.settingsScroll} showsVerticalScrollIndicator={false}>

        {/* Language */}
        <View style={styles.langSettingWrap}>
          <Text style={styles.settingTitle}>{t('profile.language')}</Text>
          <View style={styles.langChipRow}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLanguage(l.code)}
                style={[styles.langChip2, language === l.code && styles.langChipActive]}
              >
                <Text style={styles.langChipFlag}>{l.flag}</Text>
                <Text style={[styles.langChipText, language === l.code && styles.langChipTextActive]}>
                  {l.label}
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

        {/* Premium testing unlock */}
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>{t('profile.premiumTest')}</Text>
            <Text style={styles.settingSub}>{t('profile.premiumTestSub')}</Text>
          </View>
          <Switch
            value={premium}
            onValueChange={togglePremium}
            trackColor={{ false: '#3a3a5e', true: '#fcd34d' }}
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
              {(() => {
                const isCustom = !REMINDER_PRESETS.some((rt) => rt.hour === reminderTime.hour && rt.minute === reminderTime.minute);
                return (
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.85}
                    style={[styles.timeChip, isCustom && styles.timeChipSelected]}
                  >
                    <Text style={[styles.timeChipText, isCustom && styles.timeChipTextSelected]}>
                      🕐 {isCustom ? formatTime(reminderTime) : t('profile.customTime')}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
            {showTimePicker && (
              <DateTimePicker
                value={(() => { const d = new Date(); d.setHours(reminderTime.hour, reminderTime.minute, 0, 0); return d; })()}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  if (Platform.OS === 'android') setShowTimePicker(false);
                  if (e.type === 'set' && d) pickReminderTime({ hour: d.getHours(), minute: d.getMinutes() });
                }}
              />
            )}
            {Platform.OS === 'ios' && showTimePicker && (
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.pickerDoneBtn}>
                <Text style={styles.pickerDoneText}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reset */}
        <TouchableOpacity onPress={handleReset} activeOpacity={0.85} style={styles.resetButton}>
          <Text style={styles.resetText}>{t('profile.reset')}</Text>
        </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Modal>

      <ShareCardModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        profile={profile}
        level={levelInfo.level}
        streak={streak}
        minutes={totalMin}
        stars={sessions}
      />

      {/* Achievement detail */}
      <Modal visible={!!selectedAch} transparent animationType="fade" onRequestClose={() => setSelectedAch(null)}>
        <TouchableOpacity style={styles.achOverlay} activeOpacity={1} onPress={() => setSelectedAch(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.achCard} onPress={() => {}}>
            {selectedAch && (() => {
              const unlocked = unlockedIds.includes(selectedAch.id);
              return (
                <>
                  <View style={[styles.achEmojiRing, !unlocked && styles.achEmojiRingLocked]}>
                    <Text style={styles.achEmoji}>{unlocked ? selectedAch.emoji : '🔒'}</Text>
                  </View>
                  <View style={[styles.achStatus, unlocked ? styles.achStatusOn : styles.achStatusOff]}>
                    <Text style={[styles.achStatusText, unlocked ? styles.achStatusTextOn : styles.achStatusTextOff]}>
                      {unlocked ? t('profile.badgeUnlocked') : t('profile.badgeLocked')}
                    </Text>
                  </View>
                  <Text style={styles.achName}>{achievementName(selectedAch.id, t)}</Text>
                  <Text style={styles.achDesc}>{achievementDesc(selectedAch.id, t)}</Text>
                  {!unlocked && <Text style={styles.achHint}>{t('profile.badgeLockedHint')}</Text>}
                  <TouchableOpacity onPress={() => setSelectedAch(null)} activeOpacity={0.85} style={styles.achClose}>
                    <Text style={styles.achCloseText}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingTop: 70, paddingBottom: 100 },
  shareButton: { marginBottom: SPACING.xl },
  shareGradient: { paddingVertical: 14, borderRadius: RADIUS.full, alignItems: 'center' },
  shareButtonText: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.white },
  kicker: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary,
    letterSpacing: 3, marginBottom: SPACING.md,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gearBtn: { padding: 4, marginBottom: SPACING.md },
  gearIcon: { fontSize: 22 },
  settingsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingsClose: { fontFamily: FONTS.medium, fontSize: 20, color: COLORS.textMuted, width: 40 },
  settingsTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  settingsScroll: { padding: SPACING.lg, paddingBottom: 60 },
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
  langChipActive: { backgroundColor: 'rgba(167,139,250,0.25)', borderColor: COLORS.primary },
  langChipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textMuted },
  langChipTextActive: { color: COLORS.primaryLight },
  langSettingWrap: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  langChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  langChip2: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  langChipFlag: { fontSize: 15 },
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
  pickerDoneBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16, marginTop: 4 },
  pickerDoneText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primaryLight },
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
  usageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  usageValue: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.text },
  usageLimit: { fontFamily: FONTS.medium, fontSize: 18, color: COLORS.textMuted },
  planPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  planFree: { backgroundColor: 'rgba(255,255,255,0.08)' },
  planPremium: { backgroundColor: 'rgba(252,211,77,0.18)' },
  planText: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  usageTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: SPACING.sm },
  usageFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.accent },
  usageSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
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
  achOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  achCard: {
    width: '100%', backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(252,211,77,0.3)',
  },
  achEmojiRing: {
    width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(252,211,77,0.12)', borderWidth: 2, borderColor: 'rgba(252,211,77,0.4)',
    marginBottom: SPACING.md,
  },
  achEmojiRingLocked: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' },
  achEmoji: { fontSize: 48 },
  achStatus: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full, marginBottom: SPACING.md },
  achStatusOn: { backgroundColor: 'rgba(252,211,77,0.18)' },
  achStatusOff: { backgroundColor: 'rgba(255,255,255,0.08)' },
  achStatusText: { fontFamily: FONTS.semiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  achStatusTextOn: { color: '#fcd34d' },
  achStatusTextOff: { color: COLORS.textMuted },
  achName: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm },
  achDesc: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  achHint: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textDim, textAlign: 'center', marginTop: SPACING.md, fontStyle: 'italic' },
  achClose: { marginTop: SPACING.lg, paddingVertical: 12, paddingHorizontal: 40, borderRadius: RADIUS.full, backgroundColor: 'rgba(167,139,250,0.2)' },
  achCloseText: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.primaryLight },
});
