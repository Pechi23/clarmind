import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../constants/theme';

type GradientColors = readonly [string, string, ...string[]];

interface Props {
  children: React.ReactNode;
  colors?: GradientColors;
  style?: ViewStyle;
}

const DEFAULT_COLORS: GradientColors = [COLORS.card, 'rgba(255,255,255,0.03)'];

export default function GradientCard({ children, colors, style }: Props) {
  return (
    <LinearGradient
      colors={colors ?? DEFAULT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      <View style={styles.border}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: 1,
  },
  border: {
    borderRadius: RADIUS.lg - 1,
    backgroundColor: COLORS.backgroundLight,
    padding: 20,
  },
});
