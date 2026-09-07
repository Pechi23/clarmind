// Premium paywall. Fetches the current RevenueCat offering and lets the user
// subscribe. On web / before store products exist, it shows a graceful notice and
// points at the testing unlock instead. Native only for real purchases.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import {
  getPremiumPackages, purchase, restore, PurchasesPackage,
} from '../services/purchases';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPremium: () => void; // called after a successful purchase/restore
}

export default function PaywallModal({ visible, onClose, onPremium }: Props) {
  const { t } = useI18n();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getPremiumPackages().then((p) => { setPackages(p); setLoading(false); });
  }, [visible]);

  const pkg = packages[0];

  const onSubscribe = async () => {
    if (!pkg || busy) return;
    setBusy(true);
    const ok = await purchase(pkg);
    setBusy(false);
    if (ok) { onPremium(); onClose(); }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    if (ok) { onPremium(); onClose(); }
  };

  const benefits = [t('paywall.benefit1'), t('paywall.benefit2'), t('paywall.benefit3'), t('paywall.benefit4')];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient colors={['#1a1a3e', '#0f0c29', '#24243e']} style={styles.card}>
          <Text style={styles.emoji}>✦</Text>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

          <View style={styles.benefits}>
            {benefits.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <Text style={styles.check}>✓</Text>
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primaryLight} style={{ marginVertical: SPACING.lg }} />
          ) : pkg ? (
            <>
              <TouchableOpacity onPress={onSubscribe} disabled={busy} activeOpacity={0.85} style={styles.ctaWrap}>
                <LinearGradient colors={GRADIENTS.button} style={styles.cta}>
                  <Text style={styles.ctaText}>
                    {busy ? '…' : `${t('paywall.cta')} · ${pkg.product.priceString}${t('paywall.perMonth')}`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={onRestore} disabled={busy} hitSlop={8}>
                <Text style={styles.restore}>{t('paywall.restore')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.unavailable}>{t('paywall.unavailable')}</Text>
          )}

          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.later}>{t('paywall.maybeLater')}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: SPACING.lg },
  card: { borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center' },
  emoji: { fontSize: 34, color: COLORS.primaryLight, marginBottom: SPACING.xs },
  title: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  benefits: { alignSelf: 'stretch', gap: SPACING.sm, marginBottom: SPACING.lg },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  check: { fontFamily: FONTS.bold, fontSize: 15, color: '#6BCB77', width: 20, textAlign: 'center' },
  benefitText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text, flex: 1 },
  ctaWrap: { alignSelf: 'stretch', borderRadius: RADIUS.full, overflow: 'hidden' },
  cta: { paddingVertical: 15, alignItems: 'center' },
  ctaText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  restore: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primaryLight, textAlign: 'center', paddingVertical: SPACING.md },
  unavailable: {
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.accent, textAlign: 'center',
    lineHeight: 20, marginVertical: SPACING.lg,
  },
  later: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted, paddingTop: SPACING.sm },
});
