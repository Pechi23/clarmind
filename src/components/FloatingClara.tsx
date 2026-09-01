import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, PanResponder, StyleSheet, Dimensions, Modal, Text, View, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { GRADIENTS } from '../constants/theme';
import { UserProfile } from '../types';
import { getClaraFabPos, setClaraFabPos } from '../services/storage';
import ClaraScreen from '../screens/ClaraScreen';

const SIZE = 62;
const MARGIN = 12;
const TAB_BAR_ZONE = 96; // keep clear of the floating tab bar at the bottom

interface Props {
  profile: UserProfile;
}

/** A Clara launcher the user can drag anywhere; floats over every main screen. */
export default function FloatingClara({ profile }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');

  const minX = MARGIN;
  const maxX = width - SIZE - MARGIN;
  const minY = insets.top + MARGIN;
  const maxY = height - SIZE - MARGIN - TAB_BAR_ZONE - insets.bottom;

  const clamp = (x: number, y: number) => ({
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  });

  const defaultPos = { x: maxX, y: maxY };
  const pan = useRef(new Animated.ValueXY(defaultPos)).current;
  const posRef = useRef(defaultPos);
  const [open, setOpen] = useState(false);

  // Track the live value so we can clamp/persist on release.
  useEffect(() => {
    const id = pan.addListener((v) => { posRef.current = v; });
    return () => pan.removeListener(id);
  }, [pan]);

  // Restore saved position on mount.
  useEffect(() => {
    (async () => {
      const saved = await getClaraFabPos();
      if (saved) {
        const c = clamp(saved.x, saved.y);
        pan.setValue(c);
        posRef.current = c;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({ x: posRef.current.x, y: posRef.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_e, g) => {
        pan.flattenOffset();
        const tap = Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5;
        if (tap) {
          if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
          setOpen(true);
          return;
        }
        // Keep the vertical drop position, but snap horizontally to the nearest edge.
        const c = clamp(posRef.current.x, posRef.current.y);
        const snapX = c.x + SIZE / 2 < width / 2 ? minX : maxX;
        const snapped = { x: snapX, y: c.y };
        Animated.spring(pan, { toValue: snapped, useNativeDriver: false, friction: 6 }).start();
        posRef.current = snapped;
        setClaraFabPos(snapped).catch(() => {});
      },
    })
  ).current;

  return (
    <>
      <Animated.View
        style={[styles.fab, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <LinearGradient colors={GRADIENTS.button} style={styles.gradient}>
          <Text style={styles.icon}>🌙</Text>
        </LinearGradient>
        <View style={styles.badge}><Text style={styles.badgeText}>Clara</Text></View>
      </Animated.View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <ClaraScreen profile={profile} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    zIndex: 999,
    elevation: 20,
  },
  gradient: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  icon: { fontSize: 28 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#0f0c29',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.6)',
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#c4b5fd', letterSpacing: 0.5 },
});
