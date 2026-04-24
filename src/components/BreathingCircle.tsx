import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  scale: number;
  duration: number; // ms for current phase
  color: string;
  size?: number;
}

export default function BreathingCircle({ scale, duration, color, size = 260 }: Props) {
  const animScale = useSharedValue(1);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    animScale.value = withTiming(scale, {
      duration,
      easing: Easing.inOut(Easing.ease),
    });
    glow.value = withTiming(scale > 1.2 ? 0.9 : 0.4, {
      duration,
      easing: Easing.inOut(Easing.ease),
    });
  }, [scale, duration]);

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animScale.value * 1.15 }],
    opacity: glow.value,
  }));

  return (
    <View style={[styles.wrapper, { width: size * 1.8, height: size * 1.8 }]}>
      <Animated.View style={[styles.absolute, glowStyle]}>
        <LinearGradient
          colors={[color, 'transparent']}
          style={[styles.glow, { width: size, height: size, borderRadius: size / 2 }]}
        />
      </Animated.View>
      <Animated.View style={[styles.absolute, innerStyle]}>
        <LinearGradient
          colors={[color + 'cc', color + '44']}
          style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  absolute: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  circle: { borderWidth: 2 },
  glow: { opacity: 0.6 },
});
