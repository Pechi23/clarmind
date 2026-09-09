// Voice/text mood check-in modal. Speak (or type) how you feel; Gemini reflects it
// back warmly, infers a 1–5 mood (logged so it feeds the trend), and suggests a
// breathing pattern. Mic reuses the speechRecognition wrapper (Web Speech on web).
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { capture } from '../services/analytics';
import { patternName } from '../constants/localize';
import { saveMoodEntry } from '../services/storage';
import { analyzeMood, MoodScan } from '../services/moodScan';
import { TTS_LOCALE } from '../services/guidedMeditation';
import {
  ExpoSpeechRecognitionModule, useSpeechRecognitionEvent, speechRecognitionAvailable,
} from '../services/speechRecognition';

interface Props { visible: boolean; onClose: () => void; }

const MOOD_EMOJI = ['😣', '😕', '😐', '🙂', '😌'];

export default function VoiceMoodScan({ visible, onClose }: Props) {
  const { t, language } = useI18n();
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MoodScan | null>(null);

  useSpeechRecognitionEvent('result', (e: any) => {
    const tr = e.results?.[0]?.transcript;
    if (tr) setText(tr);
  });
  useSpeechRecognitionEvent('end', () => setRecording(false));
  useSpeechRecognitionEvent('error', () => setRecording(false));

  const toggleMic = async () => {
    if (recording) { try { ExpoSpeechRecognitionModule.stop(); } catch {} setRecording(false); return; }
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return;
      setRecording(true);
      ExpoSpeechRecognitionModule.start({ lang: TTS_LOCALE[language] ?? 'en-US', interimResults: true, continuous: false });
    } catch { setRecording(false); }
  };

  const reflect = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const r = await analyzeMood(text, language);
    await saveMoodEntry({ date: new Date().toISOString(), mood: r.mood, context: 'general' }).catch(() => {});
    capture('mood_checkin', { mood: r.mood });
    setResult(r);
    setBusy(false);
  };

  const close = () => {
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
    setText(''); setResult(null); setRecording(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={close} hitSlop={12}><Text style={styles.close}>✕</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>{t('moodScan.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          {result ? (
            <View style={styles.resultWrap}>
              <Text style={styles.resultEmoji}>{MOOD_EMOJI[result.mood - 1]}</Text>
              <Text style={styles.resultReply}>{result.reply || t('moodScan.fallback')}</Text>
              {result.pattern ? (
                <Text style={styles.suggestion}>{t('moodScan.suggested', { pattern: patternName(result.pattern, t) })}</Text>
              ) : null}
              <TouchableOpacity onPress={close} style={styles.doneBtn}>
                <LinearGradient colors={GRADIENTS.button} style={styles.doneGrad}>
                  <Text style={styles.doneText}>{t('common.done')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.prompt}>{t('moodScan.prompt')}</Text>
              {speechRecognitionAvailable && (
                <TouchableOpacity onPress={toggleMic} activeOpacity={0.85} style={[styles.mic, recording && styles.micOn]}>
                  <Text style={styles.micIcon}>{recording ? '⏺' : '🎤'}</Text>
                </TouchableOpacity>
              )}
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={recording ? t('moodScan.listening') : t('moodScan.placeholder')}
                placeholderTextColor={COLORS.textDim}
                multiline
              />
              <TouchableOpacity
                onPress={reflect}
                disabled={!text.trim() || busy}
                activeOpacity={0.85}
                style={[styles.reflectBtn, (!text.trim() || busy) && { opacity: 0.4 }]}
              >
                <LinearGradient colors={GRADIENTS.button} style={styles.reflectGrad}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.reflectText}>{t('moodScan.analyze')}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
  close: { fontFamily: FONTS.medium, fontSize: 20, color: COLORS.textMuted, width: 40 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  body: { flex: 1, paddingHorizontal: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  prompt: { fontFamily: FONTS.regular, fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  mic: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.14)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
    marginBottom: SPACING.lg,
  },
  micOn: { backgroundColor: 'rgba(248,113,113,0.22)', borderColor: '#f87171' },
  micIcon: { fontSize: 34 },
  input: {
    alignSelf: 'stretch', minHeight: 80, maxHeight: 140,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: SPACING.md,
    fontFamily: FONTS.regular, fontSize: 16, color: COLORS.text,
  },
  reflectBtn: { alignSelf: 'stretch', borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.lg },
  reflectGrad: { paddingVertical: 15, alignItems: 'center' },
  reflectText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  resultWrap: { alignItems: 'center' },
  resultEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  resultReply: { fontFamily: FONTS.medium, fontSize: 19, color: COLORS.text, textAlign: 'center', lineHeight: 28 },
  suggestion: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primaryLight, marginTop: SPACING.lg },
  doneBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.xl },
  doneGrad: { paddingVertical: 14, paddingHorizontal: SPACING.xl * 1.5 },
  doneText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
});
