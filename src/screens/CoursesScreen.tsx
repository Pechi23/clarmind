import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { COURSES, CourseDayContent } from '../constants/courses';
import {
  COURSE_LENGTH, unlockedDay, isDayUnlocked, isCourseComplete,
} from '../services/courseLogic';
import {
  getCourseProgress, startCourse, markCourseDayComplete, leaveCourse,
} from '../services/storage';
import { getCourseDay } from '../services/courses';
import { CourseProgress } from '../types';

interface Props {
  onClose: () => void;
}

export default function CoursesScreen({ onClose }: Props) {
  const { t, language } = useI18n();
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [dayContent, setDayContent] = useState<CourseDayContent | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const refresh = useCallback(async () => {
    setProgress(await getCourseProgress());
    setLoaded(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onStart = async (courseId: string) => {
    setProgress(await startCourse(courseId));
    setOpenDay(1);
    openDayContent(courseId, 1);
  };

  const openDayContent = async (courseId: string, day: number) => {
    setOpenDay(day);
    setDayContent(null);
    setDayLoading(true);
    const content = await getCourseDay(courseId, day, language);
    setDayContent(content);
    setDayLoading(false);
  };

  const onComplete = async (day: number) => {
    setProgress(await markCourseDayComplete(day));
  };

  const onLeave = async () => {
    await leaveCourse();
    setProgress(null);
    setOpenDay(null);
  };

  if (!loaded) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </LinearGradient>
    );
  }

  const activeCourse = progress ? COURSES.find((c) => c.id === progress.courseId) : null;

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('courses.label')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!activeCourse || !progress ? (
          // ---- Choose a program ----
          <>
            <Text style={styles.chooseLabel}>{t('courses.choose')}</Text>
            {COURSES.map((c) => (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.85}
                onPress={() => onStart(c.id)}
                style={styles.courseCard}
              >
                <Text style={styles.courseEmoji}>{c.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseTitle}>{t(`courses.items.${c.id}.title`)}</Text>
                  <Text style={styles.courseDesc}>{t(`courses.items.${c.id}.description`)}</Text>
                </View>
                <Text style={[styles.courseArrow, { color: c.color }]}>→</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          // ---- Active course ----
          <>
            <View style={styles.activeHeader}>
              <Text style={styles.activeEmoji}>{activeCourse.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeTitle}>{t(`courses.items.${activeCourse.id}.title`)}</Text>
                <Text style={styles.activeProgress}>
                  {isCourseComplete(progress.completedDays)
                    ? t('courses.finished')
                    : `${progress.completedDays.length}/${COURSE_LENGTH}`}
                </Text>
              </View>
            </View>

            {Array.from({ length: COURSE_LENGTH }, (_, i) => i + 1).map((day) => {
              const unlocked = isDayUnlocked(day, progress.startDate, today);
              const done = progress.completedDays.includes(day);
              const isOpen = openDay === day;
              return (
                <View key={day} style={styles.dayCard}>
                  <TouchableOpacity
                    style={styles.dayHeader}
                    disabled={!unlocked}
                    activeOpacity={0.8}
                    onPress={() => (isOpen ? setOpenDay(null) : openDayContent(activeCourse.id, day))}
                  >
                    <Text style={[styles.dayCheck, done && { color: COLORS.success }]}>
                      {done ? '✓' : unlocked ? '○' : '🔒'}
                    </Text>
                    <Text style={[styles.dayLabel, !unlocked && styles.dayLabelLocked]}>
                      {t('courses.day', { n: day })}
                    </Text>
                    {!unlocked && (
                      <Text style={styles.dayLocked}>
                        {t('courses.locked', { n: day - unlockedDay(progress.startDate, today) })}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {isOpen && unlocked && (
                    <View style={styles.dayBody}>
                      {dayLoading || !dayContent ? (
                        <ActivityIndicator color={activeCourse.color} style={{ marginVertical: SPACING.md }} />
                      ) : (
                        <>
                          <Text style={styles.dayTitle}>{dayContent.title}</Text>
                          <Text style={styles.dayText}>{dayContent.intro}</Text>
                          <Text style={styles.daySection}>{t('courses.todaysPractice')}</Text>
                          <Text style={styles.dayText}>{dayContent.practice}</Text>
                          <Text style={styles.daySection}>{t('courses.reflectPrompt')}</Text>
                          <Text style={styles.dayReflection}>{dayContent.reflection}</Text>
                          {!done && (
                            <TouchableOpacity onPress={() => onComplete(day)} activeOpacity={0.85}>
                              <LinearGradient colors={GRADIENTS.button} style={styles.completeBtn}>
                                <Text style={styles.completeText}>{t('courses.markComplete')}</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          )}
                          {done && <Text style={styles.doneTag}>{t('courses.completed')}</Text>}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity onPress={onLeave} style={styles.leaveBtn}>
              <Text style={styles.leaveText}>{t('courses.leave')}</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  close: { fontFamily: FONTS.medium, fontSize: 20, color: COLORS.textMuted, width: 40 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  scroll: { padding: SPACING.lg },
  chooseLabel: {
    fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.md,
  },
  courseCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  courseEmoji: { fontSize: 30 },
  courseTitle: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  courseDesc: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  courseArrow: { fontFamily: FONTS.bold, fontSize: 20 },
  activeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg,
  },
  activeEmoji: { fontSize: 36 },
  activeTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
  activeProgress: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.primaryLight, marginTop: 2 },
  dayCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  dayCheck: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textMuted, width: 22 },
  dayLabel: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text, flex: 1 },
  dayLabelLocked: { color: COLORS.textDim },
  dayLocked: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textDim },
  dayBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  dayTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text, marginBottom: SPACING.sm },
  daySection: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary,
    letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: 4,
  },
  dayText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted, lineHeight: 22 },
  dayReflection: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text, lineHeight: 22, fontStyle: 'italic' },
  completeBtn: { paddingVertical: 12, borderRadius: RADIUS.full, alignItems: 'center', marginTop: SPACING.md },
  completeText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.white },
  doneTag: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.success, marginTop: SPACING.md },
  leaveBtn: { alignItems: 'center', padding: SPACING.md, marginTop: SPACING.md },
  leaveText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.accentWarm },
});
