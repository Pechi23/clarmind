// AI-guided voice meditation (premium). The AI writes a script; expo-speech reads
// it aloud slowly in the chosen voice, with breathing pauses between lines and a
// gentle pulsing visual. Free users see a paywall. Audio is verified on-device.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { UserGoal } from '../types';
import { useI18n } from '../i18n';
import { isPremium, recordAiUse } from '../services/entitlements';
import { getUserProfile } from '../services/storage';
import {
  MEDITATION_VOICES, MeditationVoice, MeditationSegment, MeditationLength,
  TTS_LOCALE, generateGuidedMeditation,
} from '../services/guidedMeditation';
import PaywallModal from '../components/PaywallModal';

interface Props { onClose: () => void; }

const GOALS: UserGoal[] = ['sleep', 'stress', 'focus', 'curiosity'];
const LENGTHS: MeditationLength[] = [3, 5, 10];
type Phase = 'setup' | 'loading' | 'playing' | 'done';

export default function GuidedMeditationScreen({ onClose }: Props) {
  const { t, language } = useI18n();
  const [premium, setPremium] = useState<boolean | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [voice, setVoice] = useState<MeditationVoice>(MEDITATION_VOICES[0]);
  const [goal, setGoal] = useState<UserGoal>('stress');
  const [minutes, setMinutes] = useState<MeditationLength>(5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Playback controller state kept in refs to avoid stale closures.
  const segmentsRef = useRef<MeditationSegment[]>([]);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => { isPremium().then(setPremium); }, []);
  useEffect(() => { getUserProfile().then((p) => { if (p?.goal) setGoal(p.goal); }); }, []);

  // Gentle breathing pulse while playing.
  useEffect(() => {
    if (phase !== 'playing' || paused) { pulse.stopAnimation(); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, paused, pulse]);

  const clearPending = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const speakFrom = useCallback((i: number) => {
    const segs = segmentsRef.current;
    indexRef.current = i;
    setCurrentIndex(i);
    if (i >= segs.length) { setPhase('done'); return; }
    if (pausedRef.current) return;
    Speech.speak(segs[i].text, {
      language: TTS_LOCALE[language] ?? 'en-US',
      rate: voiceRef.current.rate,
      pitch: voiceRef.current.pitch,
      onDone: () => {
        if (pausedRef.current) return;
        clearPending();
        timeoutRef.current = setTimeout(() => {
          if (!pausedRef.current) speakFrom(i + 1);
        }, segs[i].pauseMs);
      },
    });
  }, [language]);

  const begin = async () => {
    setPhase('loading');
    const segs = await generateGuidedMeditation(goal, minutes, language);
    segmentsRef.current = segs;
    recordAiUse().catch(() => {});
    pausedRef.current = false;
    setPaused(false);
    setPhase('playing');
    speakFrom(0);
  };

  const pausePlayback = () => { pausedRef.current = true; setPaused(true); Speech.stop(); clearPending(); };
  const resumePlayback = () => { pausedRef.current = false; setPaused(false); speakFrom(indexRef.current); };

  const stopAll = useCallback(() => {
    pausedRef.current = true;
    Speech.stop();
    clearPending();
  }, []);

  const end = () => { stopAll(); onClose(); };

  useEffect(() => () => stopAll(), [stopAll]); // stop audio if unmounted

  // ---- Premium gate ----
  if (premium === false) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        <Header t={t} onClose={onClose} />
        <View style={styles.center}>
          <Text style={styles.lockEmoji}>🎙️✨</Text>
          <Text style={styles.lockTitle}>{t('guided.lockedTitle')}</Text>
          <Text style={styles.lockBody}>{t('guided.lockedBody')}</Text>
          <TouchableOpacity onPress={() => setPaywall(true)} activeOpacity={0.85} style={styles.upgradeBtn}>
            <LinearGradient colors={GRADIENTS.button} style={styles.upgradeGrad}>
              <Text style={styles.upgradeText}>✦ {t('paywall.upgrade')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <PaywallModal visible={paywall} onClose={() => setPaywall(false)} onPremium={() => setPremium(true)} />
      </LinearGradient>
    );
  }

  // ---- Playing / done ----
  if (phase === 'playing' || phase === 'done' || phase === 'loading') {
    const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] });
    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });
    const line = segmentsRef.current[currentIndex]?.text ?? '';
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        <Header t={t} onClose={end} />
        <View style={styles.stage}>
          <View style={styles.orbWrap}>
            <Animated.View style={[styles.orb, { transform: [{ scale }], opacity }]}>
              <LinearGradient colors={['#a78bfa', '#7c3aed']} style={styles.orbFill} />
            </Animated.View>
            <Text style={styles.voiceEmoji}>{voice.emoji}</Text>
          </View>

          {phase === 'loading' ? (
            <Text style={styles.lineText}>{t('guided.generating')}</Text>
          ) : phase === 'done' ? (
            <Text style={styles.lineText}>{t('guided.done')}</Text>
          ) : (
            <Text style={styles.lineText}>{line}</Text>
          )}
        </View>

        <View style={styles.controls}>
          {phase === 'playing' && (
            <TouchableOpacity onPress={paused ? resumePlayback : pausePlayback} activeOpacity={0.85} style={styles.ctaWrap}>
              <LinearGradient colors={GRADIENTS.button} style={styles.cta}>
                <Text style={styles.ctaText}>{paused ? `▶  ${t('guided.resume')}` : `❚❚  ${t('guided.pause')}`}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={end} style={styles.endBtn}>
            <Text style={styles.endText}>{phase === 'done' ? t('guided.doneClose') : t('guided.stop')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ---- Setup ----
  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <Header t={t} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('guided.title')}</Text>
        <Text style={styles.subtitle}>{t('guided.subtitle')}</Text>

        <Text style={styles.label}>{t('guided.chooseVoice')}</Text>
        <View style={styles.voiceRow}>
          {MEDITATION_VOICES.map((v) => (
            <TouchableOpacity
              key={v.id}
              onPress={() => setVoice(v)}
              activeOpacity={0.85}
              style={[styles.voiceCard, voice.id === v.id && styles.voiceCardOn]}
            >
              <Text style={styles.voiceCardEmoji}>{v.emoji}</Text>
              <Text style={[styles.voiceCardName, voice.id === v.id && { color: COLORS.primaryLight }]}>{v.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('guided.focus')}</Text>
        <View style={styles.chipsWrap}>
          {GOALS.map((g) => (
            <TouchableOpacity key={g} onPress={() => setGoal(g)} style={[styles.chip, goal === g && styles.chipOn]}>
              <Text style={[styles.chipText, goal === g && styles.chipTextOn]}>{t(`goals.${g}.title`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('guided.length')}</Text>
        <View style={styles.chipsWrap}>
          {LENGTHS.map((m) => (
            <TouchableOpacity key={m} onPress={() => setMinutes(m)} style={[styles.chip, minutes === m && styles.chipOn]}>
              <Text style={[styles.chipText, minutes === m && styles.chipTextOn]}>{t('guided.minutes', { n: m })}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={begin} activeOpacity={0.85} style={[styles.ctaWrap, { marginTop: SPACING.xl }]}>
          <LinearGradient colors={GRADIENTS.button} style={styles.cta}>
            <Text style={styles.ctaText}>🎙️  {t('guided.begin')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const Header = ({ t, onClose }: { t: (k: string) => string; onClose: () => void }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onClose} hitSlop={12}><Text style={styles.close}>✕</Text></TouchableOpacity>
    <Text style={styles.headerTitle}>{t('guided.title')}</Text>
    <View style={{ width: 40 }} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
  close: { fontFamily: FONTS.medium, fontSize: 20, color: COLORS.textMuted, width: 40 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  title: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.text },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  label: {
    fontFamily: FONTS.semiBold, fontSize: 12, letterSpacing: 1, color: COLORS.textMuted,
    textTransform: 'uppercase', marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  voiceRow: { flexDirection: 'row', gap: SPACING.sm },
  voiceCard: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  voiceCardOn: { borderColor: COLORS.primaryLight, backgroundColor: 'rgba(167,139,250,0.14)' },
  voiceCardEmoji: { fontSize: 26 },
  voiceCardName: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, marginTop: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingVertical: 10, paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipOn: { borderColor: COLORS.primaryLight, backgroundColor: 'rgba(167,139,250,0.14)' },
  chipText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  chipTextOn: { color: COLORS.primaryLight },
  ctaWrap: { borderRadius: RADIUS.full, overflow: 'hidden', alignSelf: 'stretch' },
  cta: { paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  orbWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl },
  orb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, overflow: 'hidden' },
  orbFill: { flex: 1, borderRadius: 100 },
  voiceEmoji: { fontSize: 52 },
  lineText: {
    fontFamily: FONTS.medium, fontSize: 20, color: COLORS.text, textAlign: 'center',
    lineHeight: 30, minHeight: 90,
  },
  controls: { paddingHorizontal: SPACING.lg, paddingBottom: 40, gap: SPACING.sm },
  endBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  endText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  lockEmoji: { fontSize: 40 },
  lockTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text, textAlign: 'center' },
  lockBody: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  upgradeBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.md },
  upgradeGrad: { paddingVertical: 14, paddingHorizontal: SPACING.xl },
  upgradeText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
});
