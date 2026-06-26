import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { ZODIAC_SIGNS } from '../constants/zodiac';
import { UserProfile, MeditationSession } from '../types';
import { getMeditationSessions } from '../services/storage';
import ConstellationSky, { getRuns, countConstellations } from '../components/ConstellationSky';

interface Props {
  profile: UserProfile;
}

export default function SkyScreen({ profile }: Props) {
  const [sessions, setSessions] = useState<MeditationSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      getMeditationSessions().then(setSessions);
    }, [])
  );

  const zodiacInfo = ZODIAC_SIGNS.find((z) => z.name === profile.zodiacSign)!;
  const constellationsFormed = countConstellations(sessions);

  // Days toward the next constellation, from the current active run
  const runs = getRuns(sessions);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const lastRun = runs[runs.length - 1];
  const activeRunLen =
    lastRun && (lastRun.includes(today) || lastRun.includes(yesterday)) ? lastRun.length : 0;
  const daysToNext = 7 - (activeRunLen % 7 || 0);

  return (
    <LinearGradient colors={['#05030f', '#0f0c29', '#1a1a3e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOUR SKY</Text>
        <Text style={styles.title}>Every breath{'\n'}lights a star.</Text>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>⭐ {sessions.length}</Text>
            <Text style={styles.statLabel}>stars lit</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{zodiacInfo.emoji} {constellationsFormed}</Text>
            <Text style={styles.statLabel}>constellations</Text>
          </View>
        </View>

        <View style={styles.skyFrame}>
          <ConstellationSky sessions={sessions} zodiac={profile.zodiacSign} />
          {sessions.length === 0 && (
            <View style={styles.emptyOverlay}>
              <Text style={styles.emptyEmoji}>🌌</Text>
              <Text style={styles.emptyText}>
                Your sky is waiting.{'\n'}Complete a session to light your first star.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.nextHint}>
          {sessions.length === 0
            ? `Meditate 7 days in a row to form the ${zodiacInfo.romanian} constellation.`
            : activeRunLen > 0
              ? `${daysToNext} more consecutive day${daysToNext !== 1 ? 's' : ''} until your next ${zodiacInfo.romanian} constellation ✨`
              : 'Meditate today to start a new constellation run.'}
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingTop: 70, paddingBottom: 110 },
  kicker: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary,
    letterSpacing: 3, marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.bold, fontSize: 34, color: COLORS.text,
    lineHeight: 42, marginBottom: SPACING.lg,
  },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statPill: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
  statLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  skyFrame: {
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    backgroundColor: 'rgba(5,3,15,0.55)',
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: SPACING.md,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: {
    fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 23,
  },
  nextHint: {
    fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted,
    textAlign: 'center', marginTop: SPACING.md, lineHeight: 20,
  },
});
