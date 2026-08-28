import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { pickReflectionKey } from '../services/reflectionLogic';
import { getReflectionForDate, saveReflection } from '../services/storage';

/** Evening journaling prompt — shows a seeded question and stores the answer locally. */
export default function ReflectionCard() {
  const { t } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  const questionKey = pickReflectionKey(today);

  const [answer, setAnswer] = useState('');
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    getReflectionForDate(today).then((entry) => {
      if (entry) {
        setAnswer(entry.answer);
        setSaved(true);
        setEditing(false);
      }
    });
  }, [today]);

  const onSave = async () => {
    const text = answer.trim();
    if (!text) return;
    await saveReflection({ date: today, questionKey, answer: text });
    setSaved(true);
    setEditing(false);
    Keyboard.dismiss();
  };

  return (
    <LinearGradient
      colors={['rgba(125,211,252,0.14)', 'rgba(59,130,246,0.05)']}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>🌙</Text>
        <Text style={styles.label}>{t('reflection.label')}</Text>
      </View>
      <Text style={styles.question}>{t(questionKey)}</Text>

      {editing ? (
        <>
          <TextInput
            style={styles.input}
            placeholder={t('reflection.placeholder')}
            placeholderTextColor={COLORS.textDim}
            value={answer}
            onChangeText={setAnswer}
            multiline
          />
          <TouchableOpacity onPress={onSave} disabled={!answer.trim()} activeOpacity={0.85}>
            <LinearGradient
              colors={GRADIENTS.button}
              style={[styles.saveButton, !answer.trim() && styles.saveDisabled]}
            >
              <Text style={styles.saveText}>{t('reflection.save')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.7}>
          <Text style={styles.answerText}>{answer}</Text>
          <Text style={styles.savedTag}>{t('reflection.saved')}</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg, padding: 20, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(125,211,252,0.2)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  emoji: { fontSize: 20 },
  label: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.accent,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  question: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text, lineHeight: 23, marginBottom: SPACING.md },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, padding: SPACING.md, minHeight: 70,
    fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text, textAlignVertical: 'top',
    marginBottom: SPACING.sm,
  },
  saveButton: { paddingVertical: 12, borderRadius: RADIUS.full, alignItems: 'center' },
  saveDisabled: { opacity: 0.4 },
  saveText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.white },
  answerText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted, lineHeight: 22, fontStyle: 'italic' },
  savedTag: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.success, marginTop: SPACING.sm },
});
