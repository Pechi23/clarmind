import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { UserProfile, ChatMessage } from '../types';
import {
  getChatHistory, saveChatHistory, clearChatHistory,
  getClaraCount, incrementClaraCount,
} from '../services/storage';
import { askClara, CLARA_DAILY_LIMIT } from '../services/clara';
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
  const [count, setCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const [history, c] = await Promise.all([getChatHistory(), getClaraCount()]);
      setCount(c);
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
    if (count >= CLARA_DAILY_LIMIT) return;

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
    await saveChatHistory(withReply);
    const newCount = await incrementClaraCount();
    setCount(newCount);
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

  const atLimit = count >= CLARA_DAILY_LIMIT;

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <TouchableOpacity onPress={resetChat} hitSlop={12}>
            <Text style={styles.reset} numberOfLines={1}>{t('clara.clear')}</Text>
          </TouchableOpacity>
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
            <Text style={styles.limitText}>{t('clara.limit')}</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder={t('clara.inputPlaceholder')}
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
  reset: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primary, width: 64, textAlign: 'right' },
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
  disclaimer: {
    fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim,
    textAlign: 'center', paddingVertical: 10, paddingHorizontal: SPACING.lg,
  },
});
