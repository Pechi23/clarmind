import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, ActivityIndicator, Platform, PermissionsAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { UserProfile, ChatMessage } from '../types';
import {
  getChatHistory, saveChatHistory, clearChatHistory,
} from '../services/storage';
import { askClara } from '../services/clara';
import { getUsageInfo, recordAiUse, UsageInfo } from '../services/entitlements';
import { useI18n } from '../i18n';

interface Props {
  profile: UserProfile;
  onClose: () => void;
}

export default function ClaraScreen({ profile, onClose }: Props) {
  const { t, language } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const TTS_LOCALE: Record<string, string> = { en: 'en-US', ro: 'ro-RO', it: 'it-IT', fr: 'fr-FR', es: 'es-ES' };
  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: TTS_LOCALE[language] ?? 'en-US', rate: 0.95, pitch: 1.05 });
  };

  // Voice input (speech-to-text). Needs a device with a speech engine (real phone).
  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => { if (e.value?.[0]) setInput(e.value[0]); };
    Voice.onSpeechEnd = () => setRecording(false);
    Voice.onSpeechError = () => setRecording(false);
    return () => { Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => {}); };
  }, []);

  const ensureMic = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return g === PermissionsAndroid.RESULTS.GRANTED;
    } catch { return false; }
  };

  const toggleMic = async () => {
    if (recording) { try { await Voice.stop(); } catch {} setRecording(false); return; }
    if (!(await ensureMic())) return;
    try { Speech.stop(); setRecording(true); await Voice.start(TTS_LOCALE[language] ?? 'en-US'); }
    catch { setRecording(false); }
  };

  // Stop any speech/recording when the screen closes.
  useEffect(() => () => { Speech.stop(); Voice.stop().catch(() => {}); }, []);

  useEffect(() => {
    (async () => {
      const [history, u] = await Promise.all([getChatHistory(), getUsageInfo()]);
      setUsage(u);
      if (history.length === 0) {
        const opener: ChatMessage = {
          role: 'assistant',
          text: t('clara.opener', { name: profile.name }),
          at: new Date().toISOString(),
        };
        setMessages([opener]);
        saveChatHistory([opener]);
      } else {
        setMessages(history);
      }
    })();
  }, [profile.name]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (usage && usage.remaining <= 0) return;

    const userMsg: ChatMessage = { role: 'user', text, at: new Date().toISOString() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setSending(true);
    scrollToEnd();

    const reply = await askClara(messages, text, profile, language);
    const claraMsg: ChatMessage = { role: 'assistant', text: reply, at: new Date().toISOString() };
    const withReply = [...next, claraMsg];
    setMessages(withReply);
    if (autoSpeak) speak(reply);
    await saveChatHistory(withReply);
    await recordAiUse();
    setUsage(await getUsageInfo());
    setSending(false);
    scrollToEnd();
  };

  const resetChat = async () => {
    await clearChatHistory();
    const opener: ChatMessage = {
      role: 'assistant',
      text: t('clara.opener', { name: profile.name }),
      at: new Date().toISOString(),
    };
    setMessages([opener]);
    await saveChatHistory([opener]);
  };

  const atLimit = !!usage && usage.remaining <= 0;

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Clara 🌙</Text>
            <Text style={styles.headerSub}>{t('clara.subtitle')}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => { if (autoSpeak) Speech.stop(); setAutoSpeak((v) => !v); }}
              hitSlop={10}
            >
              <Text style={[styles.voiceToggle, autoSpeak && styles.voiceToggleOn]}>{autoSpeak ? '🔊' : '🔈'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetChat} hitSlop={12}>
              <Text style={styles.reset} numberOfLines={1}>{t('clara.clear')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        >
          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubbleRow, m.role === 'user' ? styles.rowUser : styles.rowClara]}
            >
              <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleClara]}>
                <Text style={m.role === 'user' ? styles.textUser : styles.textClara}>{m.text}</Text>
                {m.role === 'assistant' && (
                  <TouchableOpacity onPress={() => speak(m.text)} hitSlop={8} style={styles.bubbleSpeak}>
                    <Text style={styles.bubbleSpeakIcon}>🔊</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {sending && (
            <View style={[styles.bubbleRow, styles.rowClara]}>
              <View style={[styles.bubble, styles.bubbleClara, styles.typing]}>
                <ActivityIndicator size="small" color={COLORS.primaryLight} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        {atLimit ? (
          <View style={styles.limitBox}>
            <Text style={styles.limitText}>{usage && !usage.premium ? t('clara.limitUpgrade') : t('clara.limit')}</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={toggleMic} activeOpacity={0.8} style={[styles.micButton, recording && styles.micButtonOn]}>
              <Text style={styles.micIcon}>{recording ? '⏺' : '🎤'}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder={recording ? t('clara.listening') : t('clara.inputPlaceholder')}
              placeholderTextColor={COLORS.textDim}
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={send}
              returnKeyType="send"
              blurOnSubmit
            />
            <TouchableOpacity
              onPress={send}
              disabled={!input.trim() || sending}
              activeOpacity={0.85}
              style={[styles.sendButton, (!input.trim() || sending) && styles.sendDisabled]}
            >
              <LinearGradient colors={GRADIENTS.button} style={styles.sendGradient}>
                <Text style={styles.sendIcon}>↑</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        {usage && !atLimit && (
          <Text style={styles.remaining}>{t('clara.remaining', { n: usage.remaining })}</Text>
        )}
        <Text style={styles.disclaimer}>{t('clara.disclaimer')}</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  close: { fontFamily: FONTS.medium, fontSize: 20, color: COLORS.textMuted, width: 64 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  headerSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, justifyContent: 'flex-end' },
  voiceToggle: { fontSize: 18, opacity: 0.5 },
  voiceToggleOn: { opacity: 1 },
  reset: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primary, textAlign: 'right' },
  bubbleSpeak: { alignSelf: 'flex-start', marginTop: 8 },
  bubbleSpeakIcon: { fontSize: 14, opacity: 0.55 },
  messages: { padding: SPACING.lg, gap: SPACING.sm },
  bubbleRow: { flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowClara: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: RADIUS.lg, paddingVertical: 11, paddingHorizontal: 15 },
  bubbleUser: {
    backgroundColor: 'rgba(167,139,250,0.9)',
    borderBottomRightRadius: 6,
  },
  bubbleClara: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 6,
  },
  typing: { paddingVertical: 14, paddingHorizontal: 20 },
  textUser: { fontFamily: FONTS.regular, fontSize: 15, color: '#fff', lineHeight: 21 },
  textClara: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text, lineHeight: 22 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
  },
  input: {
    flex: 1, maxHeight: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text,
  },
  micButton: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  micButtonOn: { backgroundColor: 'rgba(248,113,113,0.25)', borderColor: '#f87171' },
  micIcon: { fontSize: 20 },
  sendButton: { borderRadius: RADIUS.full, overflow: 'hidden' },
  sendDisabled: { opacity: 0.4 },
  sendGradient: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontFamily: FONTS.bold, fontSize: 22, color: '#fff' },
  limitBox: {
    marginHorizontal: SPACING.lg, padding: SPACING.md,
    backgroundColor: 'rgba(125,211,252,0.1)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(125,211,252,0.25)',
  },
  limitText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.accent, textAlign: 'center', lineHeight: 20 },
  remaining: {
    fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textMuted,
    textAlign: 'center', paddingTop: 6,
  },
  disclaimer: {
    fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim,
    textAlign: 'center', paddingVertical: 10, paddingHorizontal: SPACING.lg,
  },
});
