import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { UserProfile } from '../types';
import { ZODIAC_SIGNS } from '../constants/zodiac';
import { signName, rankName } from '../constants/localize';

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile;
  level: number;
  streak: number;
  minutes: number;
  stars: number;
}

/** A branded, shareable summary card the user can export as an image. */
export default function ShareCardModal({ visible, onClose, profile, level, streak, minutes, stars }: Props) {
  const { t, language } = useI18n();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const zodiacInfo = ZODIAC_SIGNS.find((z) => z.name === profile.zodiacSign)!;

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      // Web: react-native-view-shot / expo-sharing aren't available. Share the
      // progress as text via the Web Share API, falling back to the clipboard.
      if (Platform.OS === 'web') {
        const shareText =
          `${profile.name} · ${rankName(level, t)} · ${signName(zodiacInfo, language)}\n` +
          `🔥 ${streak} · ⏱️ ${minutes} · ⭐ ${stars}\n${t('share.tagline')}`;
        const nav: any = (globalThis as any).navigator;
        if (nav?.share) {
          await nav.share({ title: 'ClarMind', text: shareText });
        } else if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(shareText);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
        return;
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(t('share.unavailable'));
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('share.cardTitle') });
    } catch {
      // A user cancelling the Web Share sheet throws — don't nag on web.
      if (Platform.OS !== 'web') Alert.alert(t('share.unavailable'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* The captured card */}
        <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
          <LinearGradient colors={['#1a1a3e', '#0f0c29', '#24243e']} style={styles.card}>
            <Text style={styles.logo}>✦ ClarMind</Text>
            <Text style={styles.cardTitle}>{t('share.cardTitle')}</Text>

            <View style={[styles.avatar, { borderColor: zodiacInfo.color }]}>
              <Text style={styles.avatarEmoji}>{zodiacInfo.emoji}</Text>
            </View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={[styles.rank, { color: zodiacInfo.color }]}>
              {rankName(level, t)} · {signName(zodiacInfo, language)}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>🔥 {streak}</Text>
                <Text style={styles.statLabel}>{t('share.streak')}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>⏱️ {minutes}</Text>
                <Text style={styles.statLabel}>{t('share.minutes')}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>⭐ {stars}</Text>
                <Text style={styles.statLabel}>{t('share.stars')}</Text>
              </View>
            </View>

            <Text style={styles.tagline}>{t('share.tagline')}</Text>
          </LinearGradient>
        </View>

        {/* Actions */}
        <TouchableOpacity onPress={onShare} disabled={sharing} activeOpacity={0.85} style={styles.shareBtn}>
          <LinearGradient colors={GRADIENTS.button} style={styles.shareGradient}>
            <Text style={styles.shareText}>{sharing ? '…' : copied ? '✓' : t('share.action')}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>{t('share.close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  cardWrap: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  card: {
    width: 320, padding: SPACING.xl, alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  logo: {
    fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primary,
    letterSpacing: 2, marginBottom: SPACING.xs,
  },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: SPACING.lg },
  avatar: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  avatarEmoji: { fontSize: 36 },
  name: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text },
  rank: { fontFamily: FONTS.semiBold, fontSize: 14, marginBottom: SPACING.lg },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  stat: { alignItems: 'center', minWidth: 80 },
  statValue: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  tagline: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  shareBtn: { marginTop: SPACING.xl, width: 220 },
  shareGradient: { paddingVertical: 16, borderRadius: RADIUS.full, alignItems: 'center' },
  shareText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.white },
  closeBtn: { marginTop: SPACING.md, padding: SPACING.sm },
  closeText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted },
});
