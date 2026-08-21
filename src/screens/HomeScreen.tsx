import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { ZODIAC_SIGNS } from '../constants/zodiac';
import { UserProfile, DailyContent } from '../types';
import {
  getDailyContent, saveDailyContent, getStreak, updateStreak,
  getMeditationSessions, getMoodEntries, getLastRecapWeek, setLastRecapWeek,
} from '../services/storage';
import { generateDailyContent, generateWeeklyReflection } from '../services/claude';
import GradientCard from '../components/GradientCard';
import StreakBadge from '../components/StreakBadge';
import WeeklyRecapModal from '../components/WeeklyRecapModal';
import { HomeContentSkeleton } from '../components/Skeleton';
import {
  claimDailyOpenXp, claimGuideReadXp, getTodayChallenges, getXp,
  completeChallenge, checkAchievements, DailyChallenge,
} from '../services/gamification';
import { getLevelForXp } from '../constants/achievements';
import {
  computeWeeklyRecap, getMondayKey, buildFallbackReflection, WeeklyRecap,
} from '../services/weeklyRecapLogic';

interface Props {
  profile: UserProfile;
}

export default function HomeScreen({ profile }: Props) {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [shields, setShields] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [recapReflection, setRecapReflection] = useState('');
  const [recapVisible, setRecapVisible] = useState(false);
  const guideAwarded = React.useRef(false);

  // Show the weekly recap once per ISO week, when there's recent activity.
  const maybeShowWeeklyRecap = useCallback(async () => {
    const weekKey = getMondayKey();
    const lastShown = await getLastRecapWeek();
    if (lastShown === weekKey) return;

    const [sessions, moods] = await Promise.all([getMeditationSessions(), getMoodEntries()]);
    const computed = computeWeeklyRecap(sessions, moods);
    // Skip empty weeks — only surface the recap when there's something to reflect on.
    if (computed.thisWeek.sessions === 0 && computed.lastWeek.sessions === 0) return;

    await setLastRecapWeek(weekKey);
    setRecap(computed);
    setRecapReflection(buildFallbackReflection(computed));
    setRecapVisible(true);

    // Upgrade the reflection with a Gemini-written line if available.
    generateWeeklyReflection(profile.name, computed)
      .then(setRecapReflection)
      .catch(() => {});
  }, [profile.name]);

  const showXpToast = (msg: string) => {
    setXpToast(msg);
    setTimeout(() => setXpToast(null), 2500);
  };

  const refreshGamification = useCallback(async () => {
    const [ch, total] = await Promise.all([getTodayChallenges(), getXp()]);
    setChallenges(ch);
    setXp(total);
  }, []);

  const zodiacInfo = ZODIAC_SIGNS.find((z) => z.name === profile.zodiacSign)!;
  const today = new Date().toISOString().split('T')[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadContent = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      const cached = await getDailyContent();
      if (!forceRefresh && cached && cached.generatedAt === today) {
        setContent(cached);
      } else {
        const fresh = await generateDailyContent(profile.name, profile.zodiacSign, profile.goal);
        await saveDailyContent(fresh);
        setContent(fresh);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error');
    }
  }, [profile, today]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [streakResult] = await Promise.all([updateStreak(), loadContent()]);
      setStreak(streakResult.streak);
      setShields(streakResult.shields);
      const dailyXp = await claimDailyOpenXp();
      if (streakResult.shieldUsed) {
        showXpToast('🛡️ Stardust Shield saved your streak!');
      } else if (streakResult.shieldEarned) {
        showXpToast('🛡️ Shield earned — 7-day streak!');
      } else if (dailyXp > 0) {
        showXpToast(`+${dailyXp} XP · Welcome back`);
      }
      await checkAchievements();
      await refreshGamification();
      setLoading(false);
      // After the screen is ready, consider surfacing the weekly recap.
      maybeShowWeeklyRecap();
    };
    init();
  }, [loadContent, refreshGamification, maybeShowWeeklyRecap]);

  // Refresh challenges/XP whenever the tab regains focus (e.g. after a session)
  useFocusEffect(
    useCallback(() => {
      refreshGamification();
    }, [refreshGamification])
  );

  // Guide-read XP when the user scrolls near the bottom (once per day)
  const handleScrollEnd = async (e: any) => {
    if (guideAwarded.current) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
      guideAwarded.current = true;
      const awarded = await claimGuideReadXp();
      let total = awarded;
      const readChallenge = challenges.find((c) => c.id === 'read-guide' && !c.done);
      if (readChallenge) total += await completeChallenge('read-guide');
      if (total > 0) {
        showXpToast(`+${total} XP · Daily guide read`);
        await checkAchievements();
        await refreshGamification();
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent(true);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        <View style={styles.scroll}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingLabel}>{greeting()},</Text>
              <Text style={styles.greetingName}>{profile.name} {zodiacInfo.emoji}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <HomeContentSkeleton />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      {recap && (
        <WeeklyRecapModal
          visible={recapVisible}
          recap={recap}
          reflection={recapReflection}
          onClose={() => setRecapVisible(false)}
        />
      )}
      {xpToast && (
        <View style={styles.xpToast}>
          <Text style={styles.xpToastText}>{xpToast}</Text>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingLabel}>{greeting()},</Text>
            <Text style={styles.greetingName}>{profile.name} {zodiacInfo.emoji}</Text>
          </View>
          <View style={styles.headerBadges}>
            {shields > 0 && (
              <View style={styles.shieldChip}>
                <Text style={styles.shieldChipText}>🛡️{shields > 1 ? ` ×${shields}` : ''}</Text>
              </View>
            )}
            <View style={styles.levelChip}>
              <Text style={styles.levelChipText}>Lv {getLevelForXp(xp).level}</Text>
            </View>
            <StreakBadge streak={streak} />
          </View>
        </View>

        {/* Date */}
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadContent(true)} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : content ? (
          <>
            {/* Quote */}
            <GradientCard colors={['rgba(167,139,250,0.2)', 'rgba(124,58,237,0.08)']} style={styles.cardSpacing}>
              <Text style={styles.quoteIcon}>"</Text>
              <Text style={styles.quoteText}>{content.quote}</Text>
              <Text style={styles.quoteAuthor}>— {content.quoteAuthor}</Text>
            </GradientCard>

            {/* Affirmation */}
            <LinearGradient
              colors={[`${zodiacInfo.color}33`, `${zodiacInfo.color}11`]}
              style={[styles.affirmationCard, styles.cardSpacing]}
            >
              <Text style={styles.affirmationLabel}>Today's Affirmation</Text>
              <Text style={styles.affirmationText}>{content.affirmation}</Text>
            </LinearGradient>

            {/* Daily challenges */}
            <GradientCard colors={['rgba(252,211,77,0.14)', 'rgba(252,211,77,0.04)']} style={styles.cardSpacing}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>🎯</Text>
                <Text style={styles.sectionLabel}>Today's Challenges</Text>
                <Text style={styles.challengeCount}>
                  {challenges.filter((c) => c.done).length}/{challenges.length}
                </Text>
              </View>
              {challenges.map((c) => (
                <View key={c.id} style={styles.challengeRow}>
                  <Text style={[styles.challengeCheck, c.done && styles.challengeCheckDone]}>
                    {c.done ? '✓' : '○'}
                  </Text>
                  <Text style={styles.challengeEmoji}>{c.emoji}</Text>
                  <Text style={[styles.challengeText, c.done && styles.challengeTextDone]}>
                    {c.text}
                  </Text>
                  <Text style={styles.challengeXp}>+25</Text>
                </View>
              ))}
              <Text style={styles.challengeBonus}>Complete all 3 for a +50 XP bonus ✨</Text>
            </GradientCard>

            {/* Zodiac */}
            <GradientCard style={styles.cardSpacing}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionEmoji]}>{zodiacInfo.emoji}</Text>
                <View>
                  <Text style={styles.sectionLabel}>Your Zodiac Today</Text>
                  <Text style={[styles.sectionSubLabel, { color: zodiacInfo.color }]}>
                    {zodiacInfo.romanian} · {zodiacInfo.element}
                  </Text>
                </View>
              </View>
              <Text style={styles.bodyText}>{content.zodiacMessage}</Text>
            </GradientCard>

            {/* Stress Tip */}
            <GradientCard colors={['rgba(125,211,252,0.15)', 'rgba(59,130,246,0.05)']} style={styles.cardSpacing}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>🧘</Text>
                <Text style={styles.sectionLabel}>Stress Relief Tip</Text>
              </View>
              <Text style={styles.bodyText}>{content.stressTip}</Text>
            </GradientCard>

            {/* Mindfulness Task */}
            <GradientCard colors={['rgba(107,203,119,0.15)', 'rgba(107,203,119,0.05)']} style={styles.cardSpacing}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>✅</Text>
                <Text style={styles.sectionLabel}>Today's Mindful Task</Text>
              </View>
              <Text style={styles.bodyText}>{content.mindfulnessTask}</Text>
            </GradientCard>

            <Text style={styles.refreshHint}>Pull down to refresh your daily content</Text>
          </>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  greetingLabel: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  greetingName: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.text,
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textDim,
    marginBottom: SPACING.lg,
  },
  cardSpacing: { marginBottom: SPACING.md },
  quoteIcon: {
    fontFamily: FONTS.bold,
    fontSize: 48,
    color: COLORS.primary,
    lineHeight: 40,
    marginBottom: SPACING.sm,
  },
  quoteText: {
    fontFamily: FONTS.medium,
    fontSize: 17,
    color: COLORS.text,
    lineHeight: 26,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  quoteAuthor: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  affirmationCard: {
    borderRadius: RADIUS.lg,
    padding: 20,
  },
  affirmationLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  affirmationText: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: COLORS.text,
    lineHeight: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionEmoji: { fontSize: 22 },
  sectionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.text,
  },
  sectionSubLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  bodyText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 24,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  errorBox: {
    backgroundColor: 'rgba(255,100,100,0.1)',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.accentWarm,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  retryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  headerBadges: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  shieldChip: {
    backgroundColor: 'rgba(125,211,252,0.12)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(125,211,252,0.3)',
  },
  shieldChipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.accent },
  levelChip: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  levelChipText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primaryLight },
  xpToast: {
    position: 'absolute', top: 64, alignSelf: 'center', zIndex: 10,
    backgroundColor: 'rgba(167,139,250,0.95)',
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: RADIUS.full,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  xpToastText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
  challengeCount: {
    fontFamily: FONTS.bold, fontSize: 13, color: '#fcd34d', marginLeft: 'auto',
  },
  challengeRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 7,
  },
  challengeCheck: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textDim, width: 20 },
  challengeCheckDone: { color: COLORS.success },
  challengeEmoji: { fontSize: 15 },
  challengeText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text, flex: 1 },
  challengeTextDone: { color: COLORS.textDim, textDecorationLine: 'line-through' },
  challengeXp: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#fcd34d' },
  challengeBonus: {
    fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted,
    marginTop: SPACING.sm, textAlign: 'center',
  },
  refreshHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
