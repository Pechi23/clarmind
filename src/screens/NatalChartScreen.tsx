import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { UserProfile } from '../types';
import { ZODIAC_SIGNS } from '../constants/zodiac';
import { signName } from '../constants/localize';
import { isFeatureLocked } from '../services/entitlements';
import { geocodePlace } from '../services/geocode';
import { computeNatalChart, NatalChart, aspectGlyph } from '../services/birthChart';
import { interpretPlacement, interpretAspect } from '../constants/astroText';
import GradientCard from '../components/GradientCard';
import NatalWheel from '../components/NatalWheel';

interface Props { profile: UserProfile; onClose: () => void; }

const SIGN_GLYPH: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};
export default function NatalChartScreen({ profile, onClose }: Props) {
  const { t, language } = useI18n();
  const birth = profile.birth;
  const [locked, setLocked] = useState<boolean | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{ title: string; text: string } | null>(null);

  useEffect(() => { isFeatureLocked('birthchart').then(setLocked); }, []);

  useEffect(() => {
    if (!birth) { setLoading(false); return; }
    (async () => {
      const coords = await geocodePlace(birth.place);
      setChart(computeNatalChart(birth.dob, birth.hour, birth.minute, coords?.lat, coords?.lon));
      setLoading(false);
    })();
  }, [birth]);

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} hitSlop={12}><Text style={styles.close}>✕</Text></TouchableOpacity>
      <Text style={styles.headerTitle}>{t('numerology.natalTitle')}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const signLabelOf = (s: string) => {
    const z = ZODIAC_SIGNS.find((zz) => zz.name === s)!;
    return signName(z, language);
  };

  if (locked) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        {Header}
        <View style={styles.center}>
          <Text style={styles.paywallEmoji}>🔭✨</Text>
          <Text style={styles.paywallTitle}>{t('numerology.lockedTitle')}</Text>
          <Text style={styles.paywallBody}>{t('numerology.lockedBody')}</Text>
          <Text style={styles.paywallHint}>{t('numerology.lockedHint')}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      {Header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!birth ? (
          <View style={styles.center}><Text style={styles.info}>{t('numerology.natalNoBirth')}</Text></View>
        ) : loading || !chart ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            <GradientCard style={styles.cardSpacing}>
              <NatalWheel chart={chart} />
              {!chart.hasHouses && <Text style={styles.wheelNote}>{t('numerology.natalNoHouses')}</Text>}
            </GradientCard>

            {/* Interpretation detail */}
            {detail && (
              <GradientCard colors={['rgba(252,211,77,0.14)', 'rgba(252,211,77,0.04)']} style={styles.cardSpacing}>
                <View style={styles.detailHead}>
                  <Text style={styles.detailTitle}>{detail.title}</Text>
                  <TouchableOpacity onPress={() => setDetail(null)} hitSlop={10}><Text style={styles.detailClose}>✕</Text></TouchableOpacity>
                </View>
                <Text style={styles.detailText}>{detail.text}</Text>
              </GradientCard>
            )}

            {/* Placements */}
            <Text style={styles.sectionLabel}>{t('numerology.natalPlacements')}</Text>
            <Text style={styles.tapHint}>{t('numerology.natalTapHint')}</Text>
            <GradientCard style={styles.cardSpacing}>
              {chart.placements.map((p) => (
                <TouchableOpacity
                  key={p.name}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => setDetail({
                    title: `${p.symbol} ${p.name} ${t('numerology.natalIn')} ${signLabelOf(p.sign)}`,
                    text: interpretPlacement(p.name, p.sign, p.house, language),
                  })}
                >
                  <Text style={styles.pSym}>{p.symbol}</Text>
                  <Text style={styles.pName}>{p.name}{p.retro ? ' ℞' : ''}</Text>
                  <Text style={styles.pSign}>{SIGN_GLYPH[p.sign]} {signLabelOf(p.sign)}</Text>
                  <Text style={styles.pDeg}>{Math.floor(p.deg)}°</Text>
                  {chart.hasHouses && <Text style={styles.pHouse}>{t('numerology.natalHouse', { n: p.house })}</Text>}
                </TouchableOpacity>
              ))}
            </GradientCard>

            {/* Aspects */}
            {chart.aspects.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('numerology.natalAspects')}</Text>
                <GradientCard style={styles.cardSpacing}>
                  <View style={styles.aspWrap}>
                    {chart.aspects.map((a, i) => {
                      const sa = chart.placements.find((x) => x.name === a.a)!.symbol;
                      const sb = chart.placements.find((x) => x.name === a.b)!.symbol;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={styles.aspChip}
                          activeOpacity={0.7}
                          onPress={() => setDetail({
                            title: `${sa} ${aspectGlyph(a.type)} ${sb} · ${t('numerology.aspect_' + a.type)}`,
                            text: interpretAspect(a.a, a.b, a.type, language),
                          })}
                        >
                          <Text style={styles.aspText}>{sa} {aspectGlyph(a.type)} {sb}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </GradientCard>
              </>
            )}

            <Text style={styles.disclaimer}>{t('numerology.disclaimer')}</Text>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  close: { fontFamily: FONTS.medium, fontSize: 20, color: COLORS.textMuted, width: 40 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  cardSpacing: { marginBottom: SPACING.md },
  wheelNote: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textDim, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 16 },
  sectionLabel: {
    fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  pSym: { fontSize: 18, color: COLORS.primaryLight, width: 26 },
  pName: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text, width: 92 },
  pSign: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, flex: 1 },
  pDeg: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted, width: 40, textAlign: 'right' },
  pHouse: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.primaryLight, width: 44, textAlign: 'right' },
  aspWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  aspChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  aspText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  tapHint: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textDim, marginBottom: SPACING.sm },
  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  detailTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, flex: 1 },
  detailClose: { fontFamily: FONTS.medium, fontSize: 18, color: COLORS.textMuted },
  detailText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted, lineHeight: 22 },
  info: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  disclaimer: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim, marginTop: SPACING.lg, lineHeight: 16, textAlign: 'center' },
  paywallEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  paywallTitle: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text, textAlign: 'center', marginBottom: SPACING.md },
  paywallBody: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 23, marginBottom: SPACING.lg },
  paywallHint: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textDim, textAlign: 'center', fontStyle: 'italic' },
});
