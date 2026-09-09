// Shows the week's AI pattern insight on Profile. Loads once (cached weekly in
// the service), falls back to a gentle generic line when AI is unavailable.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import GradientCard from './GradientCard';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { getWeeklyInsight } from '../services/insights';

export default function InsightsCard() {
  const { t, language } = useI18n();
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await getWeeklyInsight(language);
      if (!alive) return;
      setText('text' in res ? res.text : t(res.key));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [language]);

  return (
    <GradientCard colors={['rgba(167,139,250,0.16)', 'rgba(124,58,237,0.05)']} style={styles.card}>
      <Text style={styles.title}>🧠 {t('insights.title')}</Text>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.primaryLight} />
          <Text style={styles.loadingText}>{t('insights.loading')}</Text>
        </View>
      ) : (
        <Text style={styles.body}>{text}</Text>
      )}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.lg },
  title: {
    fontFamily: FONTS.semiBold, fontSize: 12, letterSpacing: 1, color: COLORS.textMuted,
    textTransform: 'uppercase', marginBottom: SPACING.sm,
  },
  body: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text, lineHeight: 22 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  loadingText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted },
});
