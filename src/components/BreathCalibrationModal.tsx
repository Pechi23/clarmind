import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { BreathingPattern } from '../constants/breathing';
import { breathFromTaps, calibrationScale } from '../services/breathCalibration';
import { useI18n } from '../i18n';

const TARGET_BREATHS = 4;

interface Props {
  visible: boolean;
  /** The BASE (uncalibrated) pattern to measure the user's pace against. */
  pattern: BreathingPattern;
  onClose: () => void;
  onSave: (scale: number) => void;
}

export default function BreathCalibrationModal({ visible, pattern, onClose, onSave }: Props) {
  const { t } = useI18n();
  const [taps, setTaps] = useState<number[]>([]);

  const breaths = Math.floor(taps.length / 2);
  const nextIsInhale = taps.length % 2 === 0;
  const enough = breaths >= 3;

  const reset = () => setTaps([]);

  const handleTap = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        nextIsInhale ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      ).catch(() => {});
    }
    setTaps((prev) => [...prev, Date.now()]);
  };

  const save = () => {
    const nb = breathFromTaps(taps);
    onSave(nb ? calibrationScale(pattern, nb) : 1);
    reset();
  };

  const resetToDefault = () => {
    onSave(1);
    reset();
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('breathe.calibrateTitle')}</Text>
          <Text style={styles.intro}>{t('breathe.calibrateIntro')}</Text>

          <TouchableOpacity
            style={[styles.tapZone, { borderColor: pattern.color }]}
            onPress={handleTap}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={nextIsInhale ? t('breathe.calibrateTapIn') : t('breathe.calibrateTapOut')}
          >
            <Text style={[styles.tapLabel, { color: pattern.color }]}>
              {nextIsInhale ? t('breathe.calibrateTapIn') : t('breathe.calibrateTapOut')}
            </Text>
            <Text style={styles.progress}>
              {enough
                ? t('breathe.calibrateProgress', { n: breaths, total: TARGET_BREATHS })
                : taps.length === 0
                ? ''
                : t('breathe.calibrateNeedMore')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: enough ? pattern.color : COLORS.card }]}
            onPress={save}
            disabled={!enough}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveText, { color: enough ? COLORS.background : COLORS.textDim }]}>
              {t('breathe.calibrateSave')}
            </Text>
          </TouchableOpacity>

          <View style={styles.footRow}>
            <TouchableOpacity onPress={resetToDefault} hitSlop={8}>
              <Text style={styles.footLink}>{t('breathe.calibrateReset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={close} hitSlop={8}>
              <Text style={styles.footLink}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: COLORS.text,
    textAlign: 'center',
  },
  intro: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tapZone: {
    borderWidth: 2,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  tapLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 22,
    textAlign: 'center',
  },
  progress: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    minHeight: 18,
  },
  saveBtn: {
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  saveText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
  },
  footRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  footLink: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textDim,
  },
});
