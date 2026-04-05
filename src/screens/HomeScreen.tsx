import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { ZODIAC_SIGNS } from '../constants/zodiac';
import { UserProfile, DailyContent } from '../types';
import { getDailyContent, saveDailyContent, getStreak, updateStreak } from '../services/storage';
import { generateDailyContent } from '../services/claude';
import GradientCard from '../components/GradientCard';
import StreakBadge from '../components/StreakBadge';

interface Props {
  profile: UserProfile;
}

export default function HomeScreen({ profile }: Props) {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
        const fresh = await generateDailyContent(profile.name, profile.zodiacSign);
        await saveDailyContent(fresh);
        setContent(fresh);
      }
    } catch (e) {
      setError('Could not load your daily content. Check your connection and API key.');
    }
  }, [profile, today]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [s] = await Promise.all([updateStreak(), loadContent()]);
      setStreak(s);
      setLoading(false);
    };
    init();
  }, [loadContent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent(true);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Preparing your day, {profile.name}...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
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
          <StreakBadge streak={streak} />
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
  refreshHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
