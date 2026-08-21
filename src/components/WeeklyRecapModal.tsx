import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { WeeklyRecap } from '../services/weeklyRecapLogic';
import { useI18n, TFunc } from '../i18n';

interface Props {
  visible: boolean;
  recap: WeeklyRecap;
  reflection: string;
  onClose: () => void;
}

const Delta = ({ value, unit, t }: { value: number; unit: string; t: TFunc }) => {
  if (value === 0) return <Text style={styles.deltaFlat}>{t('recap.same')}</Text>;
  const up = value > 0;
  return (
    <Text style={[styles.delta, { color: up ? COLORS.success : COLORS.accentWarm }]}>
      {t('recap.vsLast', { arrow: up ? '▲' : '▼', value: Math.abs(value), unit })}
    </Text>
  );
};

export default function WeeklyRecapModal({ visible, recap, reflection, onClose }: Props) {
  const { t } = useI18n();
  const { thisWeek, minutesDelta, sessionsDelta, moodDelta } = recap;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#1a1a3e', '#0f0c29']}
          style={styles.card}
        >
          <Text style={styles.kicker}>{t('recap.kicker')}</Text>
          <Text style={styles.title}>{t('recap.title')}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{thisWeek.minutes}</Text>
              <Text style={styles.statLabel}>{t('recap.minutesLabel')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{thisWeek.sessions}</Text>
              <Text style={styles.statLabel}>{t('recap.sessionsLabel')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{thisWeek.activeDays}</Text>
              <Text style={styles.statLabel}>{t('recap.activeDaysLabel')}</Text>
            </View>
          </View>

          <View style={styles.deltas}>
            <Delta value={minutesDelta} unit={t('common.min')} t={t} />
            <Delta value={sessionsDelta} unit={t('recap.sessionsLabel')} t={t} />
            {moodDelta !== null && (
              <Text
                style={[
                  styles.delta,
                  { color: moodDelta >= 0 ? COLORS.success : COLORS.accentWarm },
                ]}
              >
                {t('recap.moodDelta', { arrow: moodDelta >= 0 ? '▲' : '▼', value: `${moodDelta >= 0 ? '+' : ''}${moodDelta}` })}
              </Text>
            )}
          </View>

          <View style={styles.reflectionBox}>
            <Text style={styles.reflectionText}>{reflection}</Text>
          </View>

          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={styles.button}>
            <LinearGradient colors={GRADIENTS.button} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>{t('recap.button')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  card: {
    width: '100%', borderRadius: RADIUS.lg, padding: SPACING.xl,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
  },
  kicker: {
    fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.primary,
    letterSpacing: 3, marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text,
    lineHeight: 34, marginBottom: SPACING.lg,
  },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  stat: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  deltas: { gap: 6, marginBottom: SPACING.lg },
  delta: { fontFamily: FONTS.medium, fontSize: 13 },
  deltaFlat: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textDim },
  reflectionBox: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
  },
  reflectionText: {
    fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text,
    lineHeight: 22, fontStyle: 'italic',
  },
  button: { width: '100%' },
  buttonGradient: {
    paddingVertical: 16, borderRadius: RADIUS.full, alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.white, letterSpacing: 0.5,
  },
});
