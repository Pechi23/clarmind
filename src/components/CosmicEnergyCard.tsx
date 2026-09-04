// A compact daily "Cosmic Energy" gauge for the user's zodiac sign.
// Fully offline — the reading is date-seeded (see services/cosmicEnergy.ts).
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GradientCard from './GradientCard';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { getCosmicEnergy, FacetKey } from '../services/cosmicEnergy';

interface Props {
  sign: string;      // zodiac sign name (e.g. "Leo")
  signLabel: string; // localized sign name for the subtitle
}

const FACET_META: Record<FacetKey, { emoji: string; color: string }> = {
  vitality: { emoji: '⚡', color: '#f59e0b' },
  clarity: { emoji: '🧠', color: '#7dd3fc' },
  harmony: { emoji: '💗', color: '#f472b6' },
};

const tierKey = (tier: string) =>
  ({ low: 'cosmic.tierLow', moderate: 'cosmic.tierModerate', high: 'cosmic.tierHigh', peak: 'cosmic.tierPeak' } as const)[
    tier as 'low' | 'moderate' | 'high' | 'peak'
  ];

export default function CosmicEnergyCard({ sign, signLabel }: Props) {
  const { t } = useI18n();
  // Recompute only when the sign or the calendar day changes.
  const energy = useMemo(() => getCosmicEnergy(sign), [sign, new Date().toDateString()]);

  return (
    <GradientCard colors={['rgba(129,140,248,0.18)', 'rgba(99,102,241,0.05)']} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>✨ {t('cosmic.title')}</Text>
          <Text style={styles.subtitle}>{t('cosmic.subtitle', { sign: signLabel })}</Text>
        </View>
        <View style={styles.overallWrap}>
          <Text style={styles.overallValue}>{energy.overall}</Text>
          <Text style={styles.overallMax}>/10</Text>
        </View>
      </View>

      <Text style={styles.tier}>{t(tierKey(energy.tier))}</Text>

      <View style={styles.facets}>
        {energy.facets.map((f) => {
          const meta = FACET_META[f.key];
          return (
            <View key={f.key} style={styles.facetRow}>
              <Text style={styles.facetLabel}>{meta.emoji} {t(`cosmic.${f.key}`)}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${f.score * 10}%`, backgroundColor: meta.color }]} />
              </View>
              <Text style={styles.facetScore}>{f.score}</Text>
            </View>
          );
        })}
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  title: { fontFamily: FONTS.semiBold, fontSize: 12, letterSpacing: 1.2, color: COLORS.text, textTransform: 'uppercase' },
  subtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  overallWrap: { flexDirection: 'row', alignItems: 'baseline' },
  overallValue: { fontFamily: FONTS.bold, fontSize: 30, color: '#c4b5fd' },
  overallMax: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textDim, marginLeft: 1 },
  tier: { fontFamily: FONTS.medium, fontSize: 13, color: '#c4b5fd', marginTop: 2, marginBottom: SPACING.md },
  facets: { gap: SPACING.sm },
  facetRow: { flexDirection: 'row', alignItems: 'center' },
  facetLabel: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, width: 110 },
  track: {
    flex: 1, height: 8, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginHorizontal: SPACING.sm,
  },
  fill: { height: '100%', borderRadius: RADIUS.full },
  facetScore: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textMuted, width: 18, textAlign: 'right' },
});
