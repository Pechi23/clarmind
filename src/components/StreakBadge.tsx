import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

interface Props {
  streak: number;
}

export default function StreakBadge({ streak }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.fire}>🔥</Text>
      <Text style={styles.number}>{streak}</Text>
      <Text style={styles.label}>day{streak !== 1 ? 's' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253,164,175,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(253,164,175,0.3)',
    gap: 4,
  },
  fire: { fontSize: 14 },
  number: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.accentWarm,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
