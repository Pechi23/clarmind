import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { setGuideSeen } from '../services/storage';

interface Props {
  onDone: () => void;
}

// Each step maps to guide.<key>.title / guide.<key>.desc in i18n.
const STEPS: { key: string; emoji: string }[] = [
  { key: 'welcome', emoji: '✦' },
  { key: 'home', emoji: '🌙' },
  { key: 'breathe', emoji: '🌬️' },
  { key: 'sky', emoji: '🌌' },
  { key: 'top', emoji: '🏆' },
  { key: 'profile', emoji: '⚙️' },
  { key: 'clara', emoji: '🤖' },
];

export default function GuideOverlay({ onDone }: Props) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  const finish = async () => {
    await setGuideSeen(true);
    onDone();
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={finish}>
      <View style={styles.backdrop}>
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

          <TouchableOpacity onPress={() => (last ? finish() : setI(i + 1))} activeOpacity={0.85} style={styles.button}>
            <LinearGradient colors={GRADIENTS.button} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>{last ? t('guide.done') : t('guide.next')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  skip: { position: 'absolute', top: SPACING.md, right: SPACING.md, padding: 4 },
  skipText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  emoji: { fontSize: 56, marginTop: SPACING.md, marginBottom: SPACING.md },
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
  button: { width: '100%' },
  buttonGradient: { paddingVertical: 15, borderRadius: RADIUS.full, alignItems: 'center' },
  buttonText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.white, letterSpacing: 0.5 },
});
