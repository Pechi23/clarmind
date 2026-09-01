import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { BREATHING_PATTERNS, PRESET_DURATIONS, BreathingPattern } from '../constants/breathing';
import BreathingCircle from '../components/BreathingCircle';
import { saveMeditationSession, getTotalMeditationMinutes } from '../services/storage';
import { MoodEntry } from '../types';
import { saveMoodEntry } from '../services/storage';
import {
  SOUNDSCAPES, syncMix, stopMix, fadeOutMix, playChime,
} from '../services/soundscape';
import {
  MixState, toggleLayer, setLayerVolume, isLayerActive, mixSummary,
} from '../services/soundscapeMixer';
import Slider from '@react-native-community/slider';
import {
  addXp, applySessionToChallenges, checkAchievements,
  completeChallenge, getTodayChallenges,
} from '../services/gamification';
import { XP } from '../constants/achievements';
import { AchievementDef } from '../constants/achievements';
import { useI18n } from '../i18n';
import { patternName, patternDesc, soundscapeName } from '../constants/localize';
import { useContentBottomPadding } from '../constants/layout';
import { suggestSession } from '../services/sessionSuggestion';
import { getMoodEntries } from '../services/storage';

const isAfter9PM = () => new Date().getHours() >= 21 || new Date().getHours() < 5;

type Mode = 'select' | 'session' | 'complete';

export default function BreatheScreen() {
  const { t } = useI18n();
  const bottomPad = useContentBottomPadding();
  const insets = useSafeAreaInsets();
  const [paused, setPaused] = useState(false);
  const phaseLabel = (label: string) =>
    label === 'Hold' ? t('breathe.hold')
      : label === 'Breathe in' ? t('breathe.breatheIn')
      : label === 'Breathe out' ? t('breathe.breatheOut')
      : label;
  const [mode, setMode] = useState<Mode>('select');
  const [pattern, setPattern] = useState<BreathingPattern>(
    isAfter9PM() ? BREATHING_PATTERNS[1] : BREATHING_PATTERNS[0]
  );
  const [durationMin, setDurationMin] = useState<number>(5);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [moodModalOpen, setMoodModalOpen] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [mix, setMix] = useState<MixState>({});
  const [earnedXp, setEarnedXp] = useState(0);
  const [newBadges, setNewBadges] = useState<AchievementDef[]>([]);
  const [suggestion, setSuggestion] = useState<ReturnType<typeof suggestSession>>(null);

  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (sessionTimer.current) clearInterval(sessionTimer.current);
    if (phaseTimer.current) clearInterval(phaseTimer.current);
    sessionTimer.current = null;
    phaseTimer.current = null;
  };

  useEffect(() => () => { cleanup(); stopMix(); }, []);
  useEffect(() => { getTotalMeditationMinutes().then(setTotalMinutes); }, [mode]);

  // Compute a mood-aware suggestion whenever we return to the select screen.
  useEffect(() => {
    if (mode !== 'select') return;
    getMoodEntries().then((entries) => {
      const recent = entries.length ? entries[entries.length - 1].mood : null;
      setSuggestion(suggestSession(recent, new Date().getHours()));
    });
  }, [mode]);

  const applySuggestion = () => {
    if (!suggestion) return;
    const p = BREATHING_PATTERNS.find((bp) => bp.id === suggestion.patternId);
    if (p) setPattern(p);
    setDurationMin(suggestion.minutes);
  };

  // Start (or restart, on resume) the countdown + phase intervals.
  const startTimers = () => {
    sessionTimer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finishSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    phaseTimer.current = setInterval(() => {
      setPhaseSecondsLeft((p) => {
        if (p <= 1) {
          // advance phase
          setPhaseIndex((i) => {
            const next = (i + 1) % pattern.phases.length;
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            return next;
          });
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  const startSession = () => {
    setMode('session');
    setPaused(false);
    setPhaseIndex(0);
    setSecondsLeft(durationMin * 60);
    setPhaseSecondsLeft(pattern.phases[0].duration);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    playChime('start').catch(() => {});
    syncMix(mix).catch(() => {});
    startTimers();
  };

  const pauseSession = () => {
    cleanup();
    stopMix();
    setPaused(true);
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  };

  const resumeSession = () => {
    setPaused(false);
    syncMix(mix).catch(() => {});
    startTimers();
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  };

  // when phase index changes, refresh phase counter
  useEffect(() => {
    if (mode === 'session') {
      setPhaseSecondsLeft(pattern.phases[phaseIndex].duration);
    }
  }, [phaseIndex, mode, pattern]);

  const finishSession = async () => {
    cleanup();
    playChime('end').catch(() => {});
    fadeOutMix(mix, 4000).catch(() => {}); // gentle wind-down, esp. for sleep
    const today = new Date().toISOString().split('T')[0];
    await saveMeditationSession({
      date: today,
      durationMinutes: durationMin,
      pattern: pattern.id,
      completedAt: new Date().toISOString(),
      soundscape: mixSummary(mix),
    });

    // Real XP: per-minute + auto-completed challenges, then badge check
    const usedSoundscape = Object.keys(mix).length > 0;
    const sessionXp = durationMin * XP.PER_MINUTE;
    await addXp(sessionXp);
    const challengeXp = await applySessionToChallenges(
      durationMin, pattern.id, usedSoundscape
    );
    const unlocked = await checkAchievements();

    setEarnedXp(sessionXp + challengeXp);
    setNewBadges(unlocked);

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setMode('complete');
    setMoodModalOpen(true);
  };

  const cancelSession = () => {
    cleanup();
    stopMix();
    setPaused(false);
    setMode('select');
  };

  const recordMood = async (mood: number) => {
    const entry: MoodEntry = {
      date: new Date().toISOString(),
      mood,
      context: 'post-session',
    };
    await saveMoodEntry(entry);
    await addXp(XP.MOOD_CHECKIN);
    const moodChallengeXp = await applySessionToChallengesForMood();
    const unlocked = await checkAchievements();
    setEarnedXp((xp) => xp + XP.MOOD_CHECKIN + moodChallengeXp);
    if (unlocked.length) setNewBadges((b) => [...b, ...unlocked]);
    setMoodModalOpen(false);
  };

  // mood-checkin is a challenge too
  const applySessionToChallengesForMood = async (): Promise<number> => {
    const challenges = await getTodayChallenges();
    const moodChallenge = challenges.find((c) => c.id === 'mood-checkin' && !c.done);
    return moodChallenge ? completeChallenge('mood-checkin') : 0;
  };

  // ============== SELECT MODE ==============
  if (mode === 'select') {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>{t('breathe.kicker')}</Text>
          <Text style={styles.title}>{patternName(pattern.id, t)}</Text>
          <Text style={styles.titleSub}>{patternDesc(pattern.id, t)}</Text>
          {suggestion && (
            <TouchableOpacity style={styles.windDownBanner} onPress={applySuggestion} activeOpacity={0.85}>
              <Text style={styles.windDownText}>{t(suggestion.reasonKey)}</Text>
              <Text style={styles.suggestionApply}>{t('breathe.applySuggestion')} →</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>{t('breathe.choosePattern')}</Text>
          <View style={styles.patternList}>
            {BREATHING_PATTERNS.map((p) => {
              const selected = pattern.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPattern(p)}
                  activeOpacity={0.85}
                  style={[
                    styles.patternCard,
                    selected && { borderColor: p.color, backgroundColor: `${p.color}1f` },
                  ]}
                >
                  <View style={[styles.patternDot, { backgroundColor: p.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.patternName, selected && { color: p.color }]}>{patternName(p.id, t)}</Text>
                    <Text style={styles.patternDesc}>{patternDesc(p.id, t)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>{t('breathe.sessionLength')}</Text>
          <View style={styles.durationRow}>
            {PRESET_DURATIONS.map((d) => {
              const selected = durationMin === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDurationMin(d)}
                  activeOpacity={0.85}
                  style={[
                    styles.durationChip,
                    selected && { backgroundColor: pattern.color + '33', borderColor: pattern.color },
                  ]}
                >
                  <Text style={[styles.durationText, selected && { color: pattern.color }]}>
                    {d}
                  </Text>
                  <Text style={styles.durationUnit}>{t('common.min')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>{t('breathe.ambientSound')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.soundRow}
          >
            {SOUNDSCAPES.map((s) => {
              const active = isLayerActive(mix, s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setMix((m) => toggleLayer(m, s.id))}
                  activeOpacity={0.85}
                  style={[
                    styles.soundChip,
                    active && { borderColor: pattern.color, backgroundColor: pattern.color + '22' },
                  ]}
                >
                  <Text style={styles.soundEmoji}>{s.emoji}</Text>
                  <Text style={[styles.soundName, active && { color: pattern.color }]}>
                    {soundscapeName(s.id, t)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Per-layer volume sliders (mixer) */}
          {Object.keys(mix).length > 0 && (
            <View style={styles.mixer}>
              {SOUNDSCAPES.filter((s) => s.id in mix).map((s) => (
                <View key={s.id} style={styles.mixerRow}>
                  <Text style={styles.mixerLabel}>{s.emoji} {soundscapeName(s.id, t)}</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={1}
                    value={mix[s.id]}
                    onValueChange={(v) => setMix((m) => setLayerVolume(m, s.id, v))}
                    minimumTrackTintColor={pattern.color}
                    maximumTrackTintColor="rgba(255,255,255,0.15)"
                    thumbTintColor={pattern.color}
                  />
                </View>
              ))}
            </View>
          )}

          <Text style={styles.totalText}>{t('breathe.totalMeditated', { min: totalMinutes })}</Text>

          <TouchableOpacity onPress={startSession} activeOpacity={0.85} style={styles.startButton}>
            <LinearGradient colors={GRADIENTS.button} style={styles.startGradient}>
              <Text style={styles.startText}>{t('breathe.begin')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ============== SESSION MODE ==============
  if (mode === 'session') {
    const phase = pattern.phases[phaseIndex];
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={cancelSession}>
        <LinearGradient
          colors={isAfter9PM()
            ? ['#000814', '#0a0e27', '#16213e']
            : ['#0f0c29', '#1a1a3e', '#24243e']}
          style={styles.container}
        >
          <TouchableOpacity onPress={cancelSession} style={styles.sessionClose} hitSlop={12} activeOpacity={0.7}>
            <Text style={styles.sessionCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.sessionTop}>
            <Text style={styles.timerText}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </Text>
            <Text style={styles.patternBadge}>{patternName(pattern.id, t)}</Text>
          </View>

          <View style={styles.sessionMid}>
            <BreathingCircle
              scale={phase.scale}
              duration={phase.duration * 1000}
              color={pattern.color}
            />
            <Text style={[styles.phaseLabel, { color: pattern.color }]}>{phaseLabel(phase.label)}</Text>
            <Text style={styles.phaseSeconds}>{phaseSecondsLeft}</Text>
          </View>

          <View style={[styles.sessionControls, { marginBottom: 24 + insets.bottom }]}>
            <TouchableOpacity onPress={paused ? resumeSession : pauseSession} style={styles.pauseButton} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENTS.button} style={styles.pauseGradient}>
                <Text style={styles.pauseText}>{paused ? `▶  ${t('breathe.resume')}` : `❚❚  ${t('breathe.pause')}`}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelSession} style={styles.endButton} activeOpacity={0.8}>
              <Text style={styles.endText}>{t('breathe.end')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Modal>
    );
  }

  // ============== COMPLETE MODE ==============
  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <View style={styles.completeWrap}>
        <Text style={styles.completeEmoji}>✨</Text>
        <Text style={styles.completeTitle}>{t('breathe.beautiful')}</Text>
        <Text style={styles.completeSubtitle}>{t('breathe.completeSubtitle', { min: durationMin })}</Text>
        <View style={styles.xpBox}>
          <Text style={styles.xpLabel}>{t('breathe.xpEarned')}</Text>
          <Text style={styles.xpValue}>+{earnedXp}</Text>
        </View>
        {newBadges.length > 0 && (
          <View style={styles.badgeUnlockBox}>
            {newBadges.map((b) => (
              <View key={b.id} style={styles.badgeUnlockRow}>
                <Text style={styles.badgeUnlockEmoji}>{b.emoji}</Text>
                <View>
                  <Text style={styles.badgeUnlockTitle}>{t('breathe.achievementUnlocked')}</Text>
                  <Text style={styles.badgeUnlockName}>{t(`achievements.${b.id}.name`)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity onPress={() => { setNewBadges([]); setMode('select'); }} activeOpacity={0.85} style={styles.startButton}>
          <LinearGradient colors={GRADIENTS.button} style={styles.startGradient}>
            <Text style={styles.startText}>{t('common.done')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Mood modal */}
      <Modal visible={moodModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('breathe.moodQuestion')}</Text>
            <View style={styles.moodRow}>
              {[1, 2, 3, 4, 5].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => recordMood(m)}
                  style={styles.moodButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{['😣', '😟', '😐', '🙂', '😌'][m - 1]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.moodLabels}>
              <Text style={styles.moodLabelText}>{t('breathe.moodAnxious')}</Text>
              <Text style={styles.moodLabelText}>{t('breathe.moodCalm')}</Text>
            </View>
            <TouchableOpacity onPress={() => setMoodModalOpen(false)}>
              <Text style={styles.skipText}>{t('common.skip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingTop: 70, paddingBottom: 100 },
  kicker: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary,
    letterSpacing: 3, marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.bold, fontSize: 34, color: COLORS.text,
    lineHeight: 40, marginBottom: SPACING.xs,
  },
  titleSub: {
    fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  windDownBanner: {
    backgroundColor: 'rgba(125,211,252,0.12)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.25)',
  },
  windDownText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.accent },
  suggestionApply: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primaryLight, marginTop: 6 },
  label: {
    fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  patternList: { gap: SPACING.sm },
  patternCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  patternDot: { width: 12, height: 12, borderRadius: 6 },
  patternName: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  patternDesc: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  durationRow: { flexDirection: 'row', gap: SPACING.sm },
  durationChip: {
    flex: 1, paddingVertical: SPACING.md, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  durationText: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text },
  durationUnit: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim },
  soundRow: { gap: SPACING.sm, paddingRight: SPACING.lg },
  soundChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.full, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  soundEmoji: { fontSize: 16 },
  soundName: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  mixer: {
    marginTop: SPACING.md, gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  mixerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  mixerLabel: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted, width: 110 },
  slider: { flex: 1, height: 36 },
  totalText: {
    fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted,
    textAlign: 'center', marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
  startButton: { marginTop: SPACING.md },
  startGradient: {
    paddingVertical: 18, borderRadius: RADIUS.full, alignItems: 'center',
  },
  startText: {
    fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.white, letterSpacing: 0.5,
  },
  sessionTop: {
    paddingTop: 70, alignItems: 'center', gap: SPACING.xs,
  },
  timerText: { fontFamily: FONTS.bold, fontSize: 36, color: COLORS.text },
  patternBadge: {
    fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  sessionMid: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  phaseLabel: { fontFamily: FONTS.semiBold, fontSize: 26, letterSpacing: 1 },
  phaseSeconds: { fontFamily: FONTS.regular, fontSize: 16, color: COLORS.textMuted },
  sessionClose: {
    position: 'absolute', top: 60, left: SPACING.lg, zIndex: 10,
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  sessionCloseText: { fontFamily: FONTS.medium, fontSize: 18, color: COLORS.text },
  sessionControls: { alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg },
  pauseButton: { width: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
  pauseGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: RADIUS.full },
  pauseText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.white, letterSpacing: 0.5 },
  endButton: {
    alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  endText: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  completeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  completeEmoji: { fontSize: 56, marginBottom: SPACING.md },
  completeTitle: { fontFamily: FONTS.bold, fontSize: 36, color: COLORS.text, marginBottom: SPACING.sm },
  completeSubtitle: {
    fontFamily: FONTS.regular, fontSize: 16, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl,
  },
  xpBox: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius: RADIUS.md, paddingVertical: SPACING.md, paddingHorizontal: 32,
    alignItems: 'center', marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  xpLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted, letterSpacing: 1 },
  xpValue: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.primary },
  badgeUnlockBox: { gap: SPACING.sm, marginBottom: SPACING.xl, width: '100%' },
  badgeUnlockRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: 'rgba(252,211,77,0.1)',
    borderWidth: 1, borderColor: 'rgba(252,211,77,0.35)',
    borderRadius: RADIUS.md, padding: SPACING.md,
  },
  badgeUnlockEmoji: { fontSize: 30 },
  badgeUnlockTitle: {
    fontFamily: FONTS.medium, fontSize: 11, color: '#fcd34d',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  badgeUnlockName: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.cardBorder, width: '100%',
  },
  modalTitle: {
    fontFamily: FONTS.semiBold, fontSize: 18, color: COLORS.text,
    textAlign: 'center', marginBottom: SPACING.lg,
  },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  moodButton: { padding: 8 },
  moodEmoji: { fontSize: 32 },
  moodLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: SPACING.lg },
  moodLabelText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim },
  skipText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
