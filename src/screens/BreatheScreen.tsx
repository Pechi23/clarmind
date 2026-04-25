import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { BREATHING_PATTERNS, PRESET_DURATIONS, BreathingPattern } from '../constants/breathing';
import BreathingCircle from '../components/BreathingCircle';
import { saveMeditationSession, getTotalMeditationMinutes } from '../services/storage';
import { MoodEntry } from '../types';
import { saveMoodEntry } from '../services/storage';
import { SOUNDSCAPES, Soundscape, playSoundscape, stopSoundscape } from '../services/soundscape';

const isAfter9PM = () => new Date().getHours() >= 21 || new Date().getHours() < 5;

type Mode = 'select' | 'session' | 'complete';

export default function BreatheScreen() {
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
  const [soundscape, setSoundscape] = useState<Soundscape>(SOUNDSCAPES[0]);

  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (sessionTimer.current) clearInterval(sessionTimer.current);
    if (phaseTimer.current) clearInterval(phaseTimer.current);
    sessionTimer.current = null;
    phaseTimer.current = null;
  };

  useEffect(() => () => { cleanup(); stopSoundscape(); }, []);
  useEffect(() => { getTotalMeditationMinutes().then(setTotalMinutes); }, [mode]);

  const startSession = () => {
    setMode('session');
    setPhaseIndex(0);
    setSecondsLeft(durationMin * 60);
    setPhaseSecondsLeft(pattern.phases[0].duration);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    playSoundscape(soundscape).catch(() => {});

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

  // when phase index changes, refresh phase counter
  useEffect(() => {
    if (mode === 'session') {
      setPhaseSecondsLeft(pattern.phases[phaseIndex].duration);
    }
  }, [phaseIndex, mode, pattern]);

  const finishSession = async () => {
    cleanup();
    await stopSoundscape();
    const today = new Date().toISOString().split('T')[0];
    await saveMeditationSession({
      date: today,
      durationMinutes: durationMin,
      pattern: pattern.id,
      completedAt: new Date().toISOString(),
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setMode('complete');
    setMoodModalOpen(true);
  };

  const cancelSession = () => {
    cleanup();
    stopSoundscape();
    setMode('select');
  };

  const recordMood = async (mood: number) => {
    const entry: MoodEntry = {
      date: new Date().toISOString(),
      mood,
      context: 'post-session',
    };
    await saveMoodEntry(entry);
    setMoodModalOpen(false);
  };

  // ============== SELECT MODE ==============
  if (mode === 'select') {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>MEDITATION</Text>
          <Text style={styles.title}>Find your{'\n'}calm.</Text>
          {isAfter9PM() && (
            <View style={styles.windDownBanner}>
              <Text style={styles.windDownText}>🌙 Wind-down mode · 4-7-8 recommended</Text>
            </View>
          )}

          <Text style={styles.label}>Choose a pattern</Text>
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
                    <Text style={[styles.patternName, selected && { color: p.color }]}>{p.name}</Text>
                    <Text style={styles.patternDesc}>{p.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Session length</Text>
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
                  <Text style={styles.durationUnit}>min</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Ambient sound</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.soundRow}
          >
            {SOUNDSCAPES.map((s) => {
              const selected = soundscape.id === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSoundscape(s)}
                  activeOpacity={0.85}
                  style={[
                    styles.soundChip,
                    selected && { borderColor: pattern.color, backgroundColor: pattern.color + '22' },
                  ]}
                >
                  <Text style={styles.soundEmoji}>{s.emoji}</Text>
                  <Text style={[styles.soundName, selected && { color: pattern.color }]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.totalText}>You've meditated {totalMinutes} minutes total ✨</Text>

          <TouchableOpacity onPress={startSession} activeOpacity={0.85} style={styles.startButton}>
            <LinearGradient colors={GRADIENTS.button} style={styles.startGradient}>
              <Text style={styles.startText}>Begin Session</Text>
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
      <LinearGradient
        colors={isAfter9PM()
          ? ['#000814', '#0a0e27', '#16213e']
          : ['#0f0c29', '#1a1a3e', '#24243e']}
        style={styles.container}
      >
        <View style={styles.sessionTop}>
          <Text style={styles.timerText}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
          <Text style={styles.patternBadge}>{pattern.name}</Text>
        </View>

        <View style={styles.sessionMid}>
          <BreathingCircle
            scale={phase.scale}
            duration={phase.duration * 1000}
            color={pattern.color}
          />
          <Text style={[styles.phaseLabel, { color: pattern.color }]}>{phase.label}</Text>
          <Text style={styles.phaseSeconds}>{phaseSecondsLeft}</Text>
        </View>

        <TouchableOpacity onPress={cancelSession} style={styles.endButton}>
          <Text style={styles.endText}>End session</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // ============== COMPLETE MODE ==============
  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <View style={styles.completeWrap}>
        <Text style={styles.completeEmoji}>✨</Text>
        <Text style={styles.completeTitle}>Beautiful.</Text>
        <Text style={styles.completeSubtitle}>
          {durationMin} mindful minutes added{'\n'}to your journey.
        </Text>
        <View style={styles.xpBox}>
          <Text style={styles.xpLabel}>XP earned</Text>
          <Text style={styles.xpValue}>+{durationMin * 10}</Text>
        </View>
        <TouchableOpacity onPress={() => setMode('select')} activeOpacity={0.85} style={styles.startButton}>
          <LinearGradient colors={GRADIENTS.button} style={styles.startGradient}>
            <Text style={styles.startText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Mood modal */}
      <Modal visible={moodModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>How do you feel now?</Text>
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
              <Text style={styles.moodLabelText}>Anxious</Text>
              <Text style={styles.moodLabelText}>Calm</Text>
            </View>
            <TouchableOpacity onPress={() => setMoodModalOpen(false)}>
              <Text style={styles.skipText}>Skip</Text>
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
    fontFamily: FONTS.bold, fontSize: 38, color: COLORS.text,
    lineHeight: 44, marginBottom: SPACING.lg,
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
  endButton: { alignSelf: 'center', marginBottom: 50, padding: 12 },
  endText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted },
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
