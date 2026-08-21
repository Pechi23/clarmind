import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { RADIUS } from '../constants/theme';

interface Props {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** A single shimmering placeholder block. */
export function SkeletonBlock({ width = '100%', height = 16, radius = RADIUS.sm, style }: Props) {
  const shimmer = useSharedValue(0.35);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(0.75, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as any, height, borderRadius: radius },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Skeleton mimicking the Home daily-content cards while AI content loads. */
export function HomeContentSkeleton() {
  return (
    <View style={styles.wrap}>
      {/* Quote card */}
      <View style={styles.card}>
        <SkeletonBlock width={40} height={40} radius={20} style={{ marginBottom: 12 }} />
        <SkeletonBlock height={14} style={{ marginBottom: 8 }} />
        <SkeletonBlock height={14} width="85%" style={{ marginBottom: 8 }} />
        <SkeletonBlock height={14} width="60%" />
      </View>
      {/* Affirmation card */}
      <View style={styles.card}>
        <SkeletonBlock width={120} height={10} style={{ marginBottom: 12 }} />
        <SkeletonBlock height={20} width="80%" />
      </View>
      {/* Challenges card */}
      <View style={styles.card}>
        <SkeletonBlock width={160} height={14} style={{ marginBottom: 16 }} />
        <SkeletonBlock height={12} width="90%" style={{ marginBottom: 12 }} />
        <SkeletonBlock height={12} width="75%" style={{ marginBottom: 12 }} />
        <SkeletonBlock height={12} width="85%" />
      </View>
      {/* Two more cards */}
      {[0, 1].map((i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock width={140} height={14} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={12} style={{ marginBottom: 8 }} />
          <SkeletonBlock height={12} width="70%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  block: { backgroundColor: 'rgba(255,255,255,0.09)' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 20,
  },
});
