import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import { MeditationSession } from '../types';

interface Props {
  sessions: MeditationSession[];
  days?: number;
}

const cellLevel = (minutes: number): number => {
  if (minutes <= 0) return 0;
  if (minutes < 5) return 1;
  if (minutes < 15) return 2;
  if (minutes < 30) return 3;
  return 4;
};

const LEVEL_COLORS = [
  'rgba(255,255,255,0.06)',
  'rgba(167,139,250,0.25)',
  'rgba(167,139,250,0.45)',
  'rgba(167,139,250,0.7)',
  'rgba(167,139,250,1)',
];

export default function ActivityHeatmap({ sessions, days = 30 }: Props) {
  const { weeks, total, activeDays } = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => {
      map[s.date] = (map[s.date] ?? 0) + s.durationMinutes;
    });

    const today = new Date();
    const cells: { date: string; minutes: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      cells.push({ date: key, minutes: map[key] ?? 0 });
    }

    const weeksArr: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeksArr.push(cells.slice(i, i + 7));
    }

    const totalMin = Object.values(map).reduce((a, b) => a + b, 0);
    const active = Object.keys(map).length;
    return { weeks: weeksArr, total: totalMin, activeDays: active };
  }, [sessions, days]);

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerStat}>{activeDays} <Text style={styles.headerLabel}>active days</Text></Text>
        <Text style={styles.headerStat}>{total} <Text style={styles.headerLabel}>min total</Text></Text>
      </View>

      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((cell) => (
              <View
                key={cell.date}
                style={[styles.cell, { backgroundColor: LEVEL_COLORS[cellLevel(cell.minutes)] }]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {LEVEL_COLORS.map((c, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerStat: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  headerLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textDim },
  grid: { flexDirection: 'row', gap: 4 },
  week: { gap: 4 },
  cell: { width: 14, height: 14, borderRadius: 3 },
  legend: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 12, justifyContent: 'flex-end',
  },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textDim, marginHorizontal: 4 },
});
