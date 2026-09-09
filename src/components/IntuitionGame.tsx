// "Sense the card" intuition mini-game (modal). Pick the face-down star that
// feels right; reveal and track a playful hit streak. For fun, not a skill test.
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { INTUITION_SYMBOLS, pickTarget, accuracyPct, feedbackKey } from '../services/intuition';

interface Props { visible: boolean; onClose: () => void; }

export default function IntuitionGame({ visible, onClose }: Props) {
  const { t } = useI18n();
  const [target, setTarget] = useState(() => pickTarget(INTUITION_SYMBOLS.length));
  const [picked, setPicked] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  const nextRound = useCallback(() => {
    setPicked(null);
    setTarget(pickTarget(INTUITION_SYMBOLS.length));
  }, []);

  const onPick = (i: number) => {
    if (picked != null) return;
    const hit = i === target;
    setPicked(i);
    setTotal((n) => n + 1);
    if (hit) { setHits((n) => n + 1); setStreak((s) => s + 1); }
    else setStreak(0);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        hit ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
    }
  };

  const revealed = picked != null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={['#05030f', '#0f0c29', '#1a1a3e']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}><Text style={styles.close}>✕</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>🔮 {t('intuition.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.stage}>
          <Text style={styles.prompt}>{t('intuition.prompt')}</Text>

          <View style={styles.cards}>
            {INTUITION_SYMBOLS.map((sym, i) => {
              const isTarget = i === target;
              const isPicked = i === picked;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  disabled={revealed}
                  onPress={() => onPick(i)}
                  style={[
                    styles.card,
                    revealed && isTarget && styles.cardTarget,
                    revealed && isPicked && !isTarget && styles.cardWrong,
                  ]}
                >
                  <Text style={styles.cardFace}>{revealed ? sym : '✦'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {revealed && (
            <>
              <Text style={styles.feedback}>{t(feedbackKey(picked === target))}</Text>
              <TouchableOpacity onPress={nextRound} activeOpacity={0.85} style={styles.againWrap}>
                <LinearGradient colors={GRADIENTS.button} style={styles.again}>
                  <Text style={styles.againText}>{t('intuition.again')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.score}>{t('intuition.score', { hits, total })} · {accuracyPct(hits, total)}%</Text>
          {streak > 0 && <Text style={styles.streak}>{t('intuition.streak', { n: streak })}</Text>}
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
  close: { fontFamily: FONTS.medium, fontSize: 20, color: COLORS.textMuted, width: 40 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg },
  prompt: { fontFamily: FONTS.medium, fontSize: 18, color: COLORS.text, marginBottom: SPACING.xl, textAlign: 'center' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.md },
  card: {
    width: 120, height: 150, borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTarget: { borderColor: '#6BCB77', backgroundColor: 'rgba(107,203,119,0.18)' },
  cardWrong: { borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.15)' },
  cardFace: { fontSize: 52 },
  feedback: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.primaryLight, marginTop: SPACING.xl },
  againWrap: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.lg },
  again: { paddingVertical: 13, paddingHorizontal: SPACING.xl * 1.5 },
  againText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
  footer: { alignItems: 'center', paddingBottom: 40, gap: 4 },
  score: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  streak: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#fcd34d' },
});
