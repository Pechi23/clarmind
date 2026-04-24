import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { ZODIAC_SIGNS } from '../constants/zodiac';
import { UserProfile } from '../types';
import { buildLeaderboard, LeaderboardUser } from '../services/leaderboard';
import { getStreak, getTotalMeditationMinutes } from '../services/storage';

interface Props {
  profile: UserProfile;
}

type Tab = 'streak' | 'totalMinutes';

export default function LeaderboardScreen({ profile }: Props) {
  const [tab, setTab] = useState<Tab>('streak');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [streak, totalMinutes] = await Promise.all([
      getStreak(),
      getTotalMeditationMinutes(),
    ]);
    const me: LeaderboardUser = {
      id: 'me',
      name: profile.name,
      zodiac: profile.zodiacSign,
      streak,
      totalMinutes,
      isCurrentUser: true,
    };
    setUsers(buildLeaderboard(me, tab));
  }, [profile, tab]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const top3Icons = ['👑', '🥈', '🥉'];

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Text style={styles.kicker}>LEADERBOARD</Text>
        <Text style={styles.title}>Top minds.</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setTab('streak')}
            style={[styles.tab, tab === 'streak' && styles.tabActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === 'streak' && styles.tabTextActive]}>🔥 Streak</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('totalMinutes')}
            style={[styles.tab, tab === 'totalMinutes' && styles.tabActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === 'totalMinutes' && styles.tabTextActive]}>
              ⏱️ Total Time
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {users.map((u, idx) => {
            const zodiacInfo = ZODIAC_SIGNS.find((z) => z.name === u.zodiac)!;
            const value = tab === 'streak' ? `${u.streak}` : `${u.totalMinutes}`;
            const unit = tab === 'streak' ? `day${u.streak !== 1 ? 's' : ''}` : 'min';
            const rankIcon = idx < 3 ? top3Icons[idx] : null;

            return (
              <View
                key={u.id}
                style={[
                  styles.row,
                  u.isCurrentUser && styles.rowMine,
                ]}
              >
                <View style={styles.rankWrap}>
                  {rankIcon ? (
                    <Text style={styles.rankIcon}>{rankIcon}</Text>
                  ) : (
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  )}
                </View>

                <View style={[styles.avatar, { backgroundColor: zodiacInfo.color + '33', borderColor: zodiacInfo.color }]}>
                  <Text style={styles.avatarEmoji}>{zodiacInfo.emoji}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, u.isCurrentUser && { color: '#fcd34d' }]}>
                    {u.name} {u.isCurrentUser ? '· You' : ''}
                  </Text>
                  <Text style={styles.zodiacText}>{zodiacInfo.romanian}</Text>
                </View>

                <View style={styles.valueWrap}>
                  <Text style={styles.value}>{value}</Text>
                  <Text style={styles.unit}>{unit}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.footnote}>Updates daily · Pull to refresh</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingTop: 70, paddingBottom: 100 },
  kicker: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary,
    letterSpacing: 3, marginBottom: SPACING.sm,
  },
  title: { fontFamily: FONTS.bold, fontSize: 38, color: COLORS.text, marginBottom: SPACING.lg },
  tabs: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.full, padding: 4, marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: RADIUS.full,
  },
  tabActive: { backgroundColor: 'rgba(167,139,250,0.25)' },
  tabText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primaryLight, fontFamily: FONTS.semiBold },
  list: { gap: SPACING.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  rowMine: {
    borderColor: '#fcd34d',
    backgroundColor: 'rgba(252,211,77,0.08)',
  },
  rankWrap: { width: 32, alignItems: 'center' },
  rankIcon: { fontSize: 22 },
  rankText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textMuted },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarEmoji: { fontSize: 20 },
  name: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  zodiacText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textDim },
  valueWrap: { alignItems: 'flex-end' },
  value: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  unit: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim },
  footnote: {
    fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textDim,
    textAlign: 'center', marginTop: SPACING.lg,
  },
});
