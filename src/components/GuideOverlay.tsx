import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { setGuideSeen } from '../services/storage';

interface Props {
  onDone: () => void;
}

// Each step maps to guide.<key>.title / guide.<key>.desc in i18n.
// `tab` is the index of the tab-bar item to spotlight (undefined = centered card).
const STEPS: { key: string; emoji: string; tab?: number }[] = [
  { key: 'welcome', emoji: '✨' },
  { key: 'home', emoji: '🌙', tab: 0 },
  { key: 'breathe', emoji: '🌬️', tab: 1 },
  { key: 'sky', emoji: '🌌', tab: 2 },
  { key: 'top', emoji: '🏆', tab: 3 },
  { key: 'profile', emoji: '⚙️', tab: 4 },
  { key: 'clara', emoji: '🤖' },
];

const BAR_MARGIN = 16; // matches the tab bar's left/right
const BAR_HEIGHT = 62;
const RING = 68;

export default function GuideOverlay({ onDone }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  const finish = async () => {
    await setGuideSeen(true);
    onDone();
  };

  // Geometry of the spotlighted tab item (mirrors CustomTabBar layout, which is
  // anchored by bottom: insets.bottom + 12). Anchor the ring the same way so it
  // lands on the real tab, not above it.
  const hasTab = step.tab !== undefined;
  const innerW = width - BAR_MARGIN * 2;
  const itemW = innerW / 5;
  const cx = BAR_MARGIN + itemW * ((step.tab ?? 0) + 0.5);
  const centerFromBottom = insets.bottom + 12 + BAR_HEIGHT / 2;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={finish}>
      <View style={styles.backdrop}>
        {/* Spotlight ring over the real tab-bar item */}
        {hasTab && (
          <>
            <View
              pointerEvents="none"
              style={[styles.ring, { left: cx - RING / 2, bottom: centerFromBottom - RING / 2, width: RING, height: RING }]}
            />
            <Text style={[styles.pointer, { left: cx - 14, bottom: centerFromBottom + RING / 2 + 2 }]}>▼</Text>
          </>
        )}

        <View style={[styles.cardWrap, hasTab ? styles.cardWrapTop : styles.cardWrapCenter]}>
          <LinearGradient colors={['rgba(30,27,75,0.98)', 'rgba(15,12,41,0.98)']} style={styles.card}>
            <TouchableOpacity onPress={finish} style={styles.skip} hitSlop={10}>
              <Text style={styles.skipText}>{t('guide.skip')}</Text>
            </TouchableOpacity>

            <Text style={styles.emoji}>{step.emoji}</Text>
            <Text style={styles.title}>{t(`guide.${step.key}.title`)}</Text>
            <Text style={styles.desc}>{t(`guide.${step.key}.desc`)}</Text>

            <View style={styles.dots}>
              {STEPS.map((s, idx) => (
                <View key={s.key} style={[styles.dot, idx === i && styles.dotActive]} />
              ))}
            </View>

            <View style={styles.navRow}>
              {i > 0 && (
                <TouchableOpacity onPress={() => setI(i - 1)} activeOpacity={0.8} style={styles.backBtn}>
                  <Text style={styles.backText}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => (last ? finish() : setI(i + 1))} activeOpacity={0.85} style={styles.button}>
                <LinearGradient colors={GRADIENTS.button} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>{last ? t('guide.done') : t('guide.next')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  cardWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: SPACING.lg },
  cardWrapCenter: { top: 0, bottom: 0, justifyContent: 'center' },
  cardWrapTop: { top: 90 },
  card: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  ring: {
    position: 'absolute',
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(167,139,250,0.15)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 16,
  },
  pointer: { position: 'absolute', fontSize: 26, color: COLORS.primaryLight },
  skip: { position: 'absolute', top: SPACING.md, right: SPACING.md, padding: 4 },
  skipText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  emoji: { fontSize: 52, marginTop: SPACING.sm, marginBottom: SPACING.md },
  title: {
    fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text,
    textAlign: 'center', marginBottom: SPACING.sm,
  },
  desc: {
    fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 23, marginBottom: SPACING.lg,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: SPACING.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '100%' },
  backBtn: { paddingVertical: 15, paddingHorizontal: SPACING.lg },
  backText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textMuted },
  button: { flex: 1 },
  buttonGradient: { paddingVertical: 15, borderRadius: RADIUS.full, alignItems: 'center' },
  buttonText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.white, letterSpacing: 0.5 },
});
