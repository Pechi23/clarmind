// A small mood-trend line chart for the Profile screen. Plots the daily-average
// mood (1 anxious → 5 calm) over the last N days from logged MoodEntry[].
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import GradientCard from './GradientCard';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { MoodEntry } from '../types';
import { buildMoodTrend } from '../services/moodTrend';

interface Props { entries: MoodEntry[]; days?: number; }

const W = 300;
const H = 84;
const PAD_Y = 10;

export default function MoodTrendCard({ entries, days = 14 }: Props) {
  const { t } = useI18n();
  const trend = useMemo(() => buildMoodTrend(entries, days), [entries, days]);

  const x = (i: number) => (i / (days - 1)) * W;
  const y = (m: number) => PAD_Y + (1 - (m - 1) / 4) * (H - 2 * PAD_Y); // 5 top, 1 bottom

  const dots = trend.points
    .map((p, i) => (p.avg != null ? { cx: x(i), cy: y(p.avg) } : null))
    .filter(Boolean) as { cx: number; cy: number }[];
  const line = dots.length >= 2
    ? dots.map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.cx.toFixed(1)} ${d.cy.toFixed(1)}`).join(' ')
    : '';

  const trendLabel = trend.delta == null
    ? null
    : trend.delta > 0.3 ? t('moodTrend.trendUp')
    : trend.delta < -0.3 ? t('moodTrend.trendDown')
    : t('moodTrend.trendFlat');

  const hasData = dots.length > 0;

  return (
    <GradientCard colors={['rgba(125,211,252,0.14)', 'rgba(59,130,246,0.04)']} style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>💗 {t('moodTrend.title')}</Text>
          <Text style={styles.sub}>{t('moodTrend.window', { n: days })}</Text>
        </View>
        {hasData && trend.overallAvg != null && (
          <View style={styles.avgWrap}>
            <Text style={styles.avgValue}>{trend.overallAvg.toFixed(1)}</Text>
            <Text style={styles.avgMax}>/5</Text>
          </View>
        )}
      </View>

      {hasData ? (
        <>
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
            {/* neutral gridline at mood = 3 */}
            <Line x1={0} y1={y(3)} x2={W} y2={y(3)} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 5" />
            {line ? <Path d={line} stroke="#7dd3fc" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
            {dots.map((d, i) => (
              <Circle key={i} cx={d.cx} cy={d.cy} r={3.2} fill="#7dd3fc" />
            ))}
          </Svg>
          {trendLabel && <Text style={styles.trend}>{trendLabel}</Text>}
        </>
      ) : (
        <Text style={styles.empty}>{t('moodTrend.empty')}</Text>
      )}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  title: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  sub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  avgWrap: { flexDirection: 'row', alignItems: 'baseline' },
  avgValue: { fontFamily: FONTS.bold, fontSize: 22, color: '#7dd3fc' },
  avgMax: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textDim, marginLeft: 1 },
  trend: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.accent, marginTop: SPACING.xs, textAlign: 'right' },
  empty: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 19, paddingVertical: SPACING.sm },
});
