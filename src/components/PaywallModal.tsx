// Premium paywall. Fetches the current RevenueCat offering and lets the user pick
// a plan (annual highlighted as best value, monthly as the flexible option). Shows
// a free-trial badge when the product carries an intro trial, a "save %" badge on
// annual, and the required auto-renewal + Terms/Privacy disclosure. On web / before
// store products exist it shows a graceful notice and points at the testing unlock.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { PRIVACY_URL, TERMS_URL } from '../constants/legal';
import { useI18n } from '../i18n';
import { capture } from '../services/analytics';
import {
  getPremiumPackages, purchase, restore, PurchasesPackage,
} from '../services/purchases';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPremium: () => void; // called after a successful purchase/restore
}

// Best-effort free-trial length (days) from a product's intro offer. Defensive:
// the shape differs slightly across platforms/SDK versions, so read loosely.
const trialDays = (p?: PurchasesPackage): number => {
  const ip: any = (p as any)?.product?.introPrice;
  if (ip && Number(ip.price) === 0 && ip.periodNumberOfUnits) {
    const n = Number(ip.periodNumberOfUnits) || 0;
    const u = String(ip.periodUnit || '').toUpperCase();
    return u === 'WEEK' ? n * 7 : u === 'MONTH' ? n * 30 : u === 'YEAR' ? n * 365 : n;
  }
  return 0;
};

export default function PaywallModal({ visible, onClose, onPremium }: Props) {
  const { t } = useI18n();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    capture('paywall_view');
    setLoading(true);
    getPremiumPackages().then((p) => {
      setPackages(p);
      // Default to annual (best value) when present.
      const annual = p.find((x) => x.packageType === 'ANNUAL');
      setSelectedId((annual ?? p[0])?.identifier ?? null);
      setLoading(false);
    });
  }, [visible]);

  const annualPkg = useMemo(() => packages.find((p) => p.packageType === 'ANNUAL'), [packages]);
  const monthlyPkg = useMemo(() => packages.find((p) => p.packageType === 'MONTHLY'), [packages]);
  // Ordered options: annual first, then monthly, then anything else.
  const options = useMemo(() => {
    const preferred = [annualPkg, monthlyPkg].filter(Boolean) as PurchasesPackage[];
    const rest = packages.filter((p) => !preferred.includes(p));
    return [...preferred, ...rest];
  }, [packages, annualPkg, monthlyPkg]);

  const savePct = useMemo(() => {
    if (!annualPkg || !monthlyPkg) return 0;
    const a = Number(annualPkg.product.price);
    const m = Number(monthlyPkg.product.price);
    if (!a || !m) return 0;
    return Math.max(0, Math.round((1 - a / (m * 12)) * 100));
  }, [annualPkg, monthlyPkg]);

  const selected = options.find((p) => p.identifier === selectedId) ?? options[0];
  const selectedTrial = trialDays(selected);

  const onSubscribe = async () => {
    if (!selected || busy) return;
    setBusy(true);
    capture('purchase_start', { plan: selected.packageType });
    const ok = await purchase(selected);
    setBusy(false);
    if (ok) { onPremium(); onClose(); } else { capture('purchase_fail', { plan: selected.packageType }); }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    if (ok) { onPremium(); onClose(); }
  };

  const benefits = [t('paywall.benefit1'), t('paywall.benefit2'), t('paywall.benefit3'), t('paywall.benefit4')];

  const priceLabel = (p: PurchasesPackage): string => {
    const isAnnual = p.packageType === 'ANNUAL';
    return `${p.product.priceString}${isAnnual ? t('paywall.perYear') : t('paywall.perMonth')}`;
  };
  const planLabel = (p: PurchasesPackage): string =>
    p.packageType === 'ANNUAL' ? t('paywall.annual')
      : p.packageType === 'MONTHLY' ? t('paywall.monthly')
        : p.product.title || t('paywall.upgrade');

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
          ) : options.length > 0 ? (
            <>
              <View style={styles.plans}>
                {options.map((p) => {
                  const active = p.identifier === selected?.identifier;
                  const isAnnual = p.packageType === 'ANNUAL';
                  const days = trialDays(p);
                  return (
                    <TouchableOpacity
                      key={p.identifier}
                      onPress={() => setSelectedId(p.identifier)}
                      activeOpacity={0.85}
                      style={[styles.plan, active && styles.planActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      {isAnnual && savePct > 0 && (
                        <View style={styles.badge}><Text style={styles.badgeText}>{t('paywall.save', { pct: savePct })}</Text></View>
                      )}
                      <Text style={[styles.planName, active && styles.planNameActive]}>{planLabel(p)}</Text>
                      <Text style={[styles.planPrice, active && styles.planNameActive]}>{priceLabel(p)}</Text>
                      {days > 0 && <Text style={styles.planTrial}>{t('paywall.freeTrial', { days })}</Text>}
                      {isAnnual && savePct > 0 && <Text style={styles.planBest}>{t('paywall.bestValue')}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity onPress={onSubscribe} disabled={busy} activeOpacity={0.85} style={styles.ctaWrap}>
                <LinearGradient colors={GRADIENTS.button} style={styles.cta}>
                  <Text style={styles.ctaText}>
                    {busy ? '…' : selectedTrial > 0 ? t('paywall.startTrial') : `${t('paywall.cta')} · ${selected ? priceLabel(selected) : ''}`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.legal}>{t('paywall.legalNote')}</Text>
              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
                  <Text style={styles.legalLink}>{t('legal.terms')}</Text>
                </TouchableOpacity>
                <Text style={styles.legalDot}>·</Text>
                <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
                  <Text style={styles.legalLink}>{t('legal.privacy')}</Text>
                </TouchableOpacity>
              </View>

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

  plans: { alignSelf: 'stretch', flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  plan: {
    flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    alignItems: 'center', position: 'relative',
  },
  planActive: { borderColor: COLORS.primaryLight, backgroundColor: 'rgba(167,139,250,0.16)' },
  planName: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.textMuted },
  planNameActive: { color: COLORS.text },
  planPrice: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, marginTop: 2 },
  planTrial: { fontFamily: FONTS.medium, fontSize: 11, color: '#6BCB77', marginTop: 4, textAlign: 'center' },
  planBest: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.primaryLight, marginTop: 2 },
  badge: {
    position: 'absolute', top: -10, alignSelf: 'center',
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#1a1a3e' },

  ctaWrap: { alignSelf: 'stretch', borderRadius: RADIUS.full, overflow: 'hidden' },
  cta: { paddingVertical: 15, alignItems: 'center' },
  ctaText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  legal: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 15 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  legalLink: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.primaryLight, textDecorationLine: 'underline' },
  legalDot: { color: COLORS.textDim, fontSize: 11 },
  restore: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primaryLight, textAlign: 'center', paddingVertical: SPACING.md },
  unavailable: {
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.accent, textAlign: 'center',
    lineHeight: 20, marginVertical: SPACING.lg,
  },
  later: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted, paddingTop: SPACING.sm },
});
